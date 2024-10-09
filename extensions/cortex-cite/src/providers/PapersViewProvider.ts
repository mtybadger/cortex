import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import { parseQuery, constructApiUrl } from '../utils/queryUtils';
import { generateResultsHtml, escapeHtml, generateRateLimitHtml } from '../utils/htmlUtils';
import { VIEW_TYPE_PAPERS } from '../constants';

export class PapersViewProvider implements vscode.WebviewViewProvider {
    private openai!: OpenAI

    constructor(private readonly extensionUri: vscode.Uri) {
        this.initializeOpenAI();
    }

    private initializeOpenAI() {
        const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.continue', 'config.json');
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            const openaiModel = config.models.find((model: any) => model.provider === 'openai');
            
            if (openaiModel && openaiModel.apiKey) {
                this.openai = new OpenAI({
                    apiKey: openaiModel.apiKey,
                });
            } else {
                console.error('OpenAI API key not found in the configuration file.');
            }
        } catch (error) {
            console.error('Error reading or parsing the configuration file:', error);
        }
    }

    public static readonly viewType = VIEW_TYPE_PAPERS;

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
        };

        const html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.html = html;

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'search':
                        this.handleSearch(message.query, message.sort, webviewView.webview);
                        break;
                    case 'cite':
                        console.log(message.item);
                        this.handleCitation(message.title, message.item);
                        break;
                }
            },
            undefined
        );
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const indexPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'index.html');
        let html = vscode.Uri.file(indexPath.fsPath).fsPath;

        // Read the HTML content
        const fs = require('fs');
        html = fs.readFileSync(indexPath.fsPath, 'utf8');

        // Replace the URIs for media resources
        html = html.replace(/href="style\.css"/g, `href="${webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'))}"`);
        html = html.replace(/src="htmx\.min\.js"/g, `src="${webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'htmx.min.js'))}"`);
        html = html.replace(/src="script\.js"/g, `src="${webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'script.js'))}"`);

        return html;
    }

    private handleSearch(query: string, sort: string, webview: vscode.Webview) {
        const { baseQuery, filters } = parseQuery(query);
        const { primary: apiUrl, fallback: fallbackUrl } = constructApiUrl(baseQuery, filters, sort);

        const options = {
            // headers: {
            //     'x-api-key': 'YOUR_S2AG_API_KEY_HERE' // Replace with your actual API key
            // }
        };

        const fetchData = (url: string, isFallback: boolean = false) => {
            https.get(url, options, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 429 && !isFallback) {
                        // If rate limited and not already using fallback, try fallback URL
                        fetchData(fallbackUrl, true);
                        return;
                    }

                    try {
                        const json = JSON.parse(data);
                        console.log(json.data[0]);
                        const items = json.data;
                        const html = generateResultsHtml(items, isFallback);
                        webview.postMessage({ type: 'search-results', html: html });
                    } catch (error) {
                        webview.postMessage({ type: 'error', message: 'Failed to parse the API response.' });
                    }
                });
            }).on('error', (err) => {
                webview.postMessage({ type: 'error', message: 'Failed to fetch data from Semantic Scholar API.' });
            });
        };

        fetchData(apiUrl);
    }

    private async handleCitation(title: string, item: string) {
        vscode.window.showInformationMessage(`Citing paper: ${title}`);
        // Implement further citation logic here

        // Fetch the full paper details using the DOI
        // const paperUrl = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
        
        // try {
        //     const response = await fetch(paperUrl);
        //     if (!response.ok) {
        //         throw new Error(`HTTP error! status: ${response.status}`);
        //     }
        //     const paperData = await response.json();
        //     const fullPaperDetails = paperData.message;
            

            const citation = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates BibTeX citations. Generate only valid BibTeX. You do not have to include the abstract, only information relevant for citing in a typical scientific paper.' },
                    { role: 'user', content: `Cite the following reference: ${decodeURIComponent(item)}` }
                ]
            });
            vscode.window.showInformationMessage(`Citation: ${citation.choices[0].message.content}`);

        const bibtex = citation.choices[0].message.content?.trim().replace(/^```bibtex\s*/, '').replace(/^.*?(?=@)/, '');

        if (!bibtex) {
            vscode.window.showErrorMessage('Failed to generate a citation.');
            return;
        }

            // Find the active text editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }

        // Get the file name of the active document without extension
        const activeFileName = path.parse(editor.document.fileName).name;

        // Find or create the .bib file
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        const bibFilePath = path.join(workspaceFolder.uri.fsPath, `${activeFileName}.bib`);

        // Check if the file exists, if not create it
        if (!fs.existsSync(bibFilePath)) {
            fs.writeFileSync(bibFilePath, '', 'utf8');
        }

        // Append the new citation to the .bib file
        fs.appendFileSync(bibFilePath, '\n' + bibtex + '\n', 'utf8');

        // Extract the citation key from the BibTeX
        const citationKeyMatch = bibtex.match(/@\w+\{(\w+),/);
        if (!citationKeyMatch) {
            vscode.window.showErrorMessage('Failed to extract citation key from BibTeX.');
            return;
        }
        const citationKey = citationKeyMatch[1];

        // Insert the citation key at the cursor position
        const citationCommand = `\\cite{${citationKey}}`;
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, citationCommand);
        });

        vscode.window.showInformationMessage(`Citation added to ${activeFileName}.bib and inserted at cursor.`);
            
            // You can now use fullPaperDetails to generate a more accurate citation
            // or to provide more information to the OpenAI API
        // } catch (error) {
        //     console.error('Error fetching paper details:', error);
        //     vscode.window.showErrorMessage('Failed to fetch paper details from CrossRef API.');
        //     return;
        // }
        
      
    }
}
