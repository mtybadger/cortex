import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as stream from 'stream';
import { promisify } from 'util';
import { PostHog } from 'posthog-node'

// Add this at the top of your file
let cachedTemplates: any = null;
let activePanel: vscode.WebviewPanel | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const client = new PostHog(
		'phc_K4A90auzg7PEW16FjSXR4JzXPOpqEsUdNGw8MrYUCGu',
		{ host: 'https://us.i.posthog.com' }
	)

	client.identify({
		distinctId: vscode.env.machineId,
	})

	console.log(vscode.env.machineId);
	// Download and cache templates on activation
	downloadAndCacheTemplates(context.extensionPath)
		.then(() => {
			console.log('Templates downloaded and cached successfully');
		})
		.catch(error => {
			console.error('Error downloading templates:', error);
		});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('cortex-templates.showTemplatePicker', () => {
		activePanel = vscode.window.createWebviewPanel(
		 	'cortex-templates.templatePickerView', // Identifies the type of the webview. Matches webview id in package.json.
			'Templates', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
			} // Webview options. We'll keep these empty for now.
		);

		// Set initial HTML content
		activePanel.webview.html = getWebviewContent(context.extensionPath, activePanel.webview);

		// Add event listener for messages from webview
		activePanel.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'createTemplate':
						createFromTemplate(message.templateId, context.extensionPath);
						return;
				}
			},
			undefined,
			context.subscriptions
		);

		// Update webview when it's closed
		activePanel.onDidDispose(() => {
			activePanel = null;
		});

		// If templates are already cached, send them immediately
		if (cachedTemplates) {
			sendTemplatesToWebview(activePanel, context.extensionPath);
		}
	});

	// Move the template creation logic to a separate function
	async function createFromTemplate(templateId: string, extensionPath: string) {
		if (!cachedTemplates) {
			vscode.window.showErrorMessage('Templates are not yet loaded. Please try again in a moment.');
			return;
		}
		const templateConfig = cachedTemplates.find((t: any) => t.id === templateId);

		client.capture({
			distinctId: vscode.env.machineId,
			event: 'template-created',
			properties: {
				templateId: templateId
			}
		})
		
		// Ask for project name
		const projectName = await vscode.window.showInputBox({
			prompt: 'Enter a name for your project',
			placeHolder: 'My Awesome Project'
		});

		if (!projectName) {
			vscode.window.showInformationMessage('Template creation cancelled');
			return;
		}

		// Show folder picker
		const folderUri = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: 'Select Folder'
		});

		if (folderUri && folderUri[0]) {
			const selectedFolder = folderUri[0].fsPath;
			
			vscode.window.showInformationMessage(`Creating project "${projectName}" using template "${templateConfig.name}" in ${selectedFolder}`);
			
			try {
				// Download the zip file
				const zipUrl = `https://raw.githubusercontent.com/mtybadger/cortex-templates/refs/heads/main/${templateId}.zip`;
				const zipPath = path.join(selectedFolder, `${templateId}.zip`);
				await downloadFile(zipUrl, zipPath);

				// Unzip the file directly into the selected folder
				await unzipFile(zipPath, selectedFolder);

				// Delete the zip file
				fs.unlinkSync(zipPath);

				// Rename the unzipped folder to the project name
				const unzippedFolder = path.join(selectedFolder, templateId);
				const projectFolder = path.join(selectedFolder, projectName);
				fs.renameSync(unzippedFolder, projectFolder);

				// Open the project folder in VS Code
				const uri = vscode.Uri.file(projectFolder);
				await vscode.commands.executeCommand('vscode.openFolder', uri);

				vscode.window.showInformationMessage(`Project "${projectName}" created successfully!`);
			} catch (error) {
				console.error('Error creating project:', error);
				vscode.window.showErrorMessage(`Failed to create project: ${error}`);
			}
		} else {
			vscode.window.showInformationMessage('Template creation cancelled');
		}
	}

	context.subscriptions.push(disposable);
}

async function unzipFile(zipPath: string, destPath: string): Promise<void> {
    const extract = require('extract-zip');
    try {
        await extract(zipPath, { dir: destPath });
    } catch (err) {
        throw new Error(`Extraction failed: ${err}`);
    }
}

// Add this new function to download and cache templates
async function downloadAndCacheTemplates(extensionPath: string): Promise<void> {
	const url = 'https://raw.githubusercontent.com/mtybadger/cortex-templates/refs/heads/main/latex-templates.json'; // Replace with your actual URL
	const localPath = path.join(extensionPath, 'resources', 'latex-templates.json');

	try {
		const response = await fetch(url);
		const data = await response.text();
		cachedTemplates = JSON.parse(data);
		fs.writeFileSync(localPath, data);

		// Download and cache images
		await Promise.all(cachedTemplates.map(async (template: any) => {
			const imageUrl = `https://raw.githubusercontent.com/mtybadger/cortex-templates/refs/heads/main/${template.image}`;
			const localImagePath = path.join(extensionPath, 'resources', template.image);

			if (!fs.existsSync(localImagePath)) {
				await downloadFile(imageUrl, localImagePath);
			}
		}));

		if (activePanel) {
			sendTemplatesToWebview(activePanel, extensionPath);
		}
	} catch (error) {
		console.error('Error downloading templates or images:', error);
		loadCachedTemplates(localPath);
	}
}
async function downloadFile(url: string, localPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(localPath, new Uint8Array(buffer));
}

function loadCachedTemplates(localPath: string): void {
	try {
		const data = fs.readFileSync(localPath, 'utf8');
		cachedTemplates = JSON.parse(data);
		console.log('Loaded templates from local cache');
	} catch (error) {
		console.error('Error loading cached templates:', error);
		cachedTemplates = [];
	}
}

function sendTemplatesToWebview(panel: vscode.WebviewPanel, extensionPath: string) {
	const templateItems = cachedTemplates.map((template: any) => ({
		id: template.id,
		name: template.name,
		description: template.description,
		image: panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'resources', template.image))).toString()
	}));

	panel.webview.postMessage({ type: 'updateTemplates', templates: templateItems });
}

function getWebviewContent(extensionPath: string, webview: vscode.Webview): string {
	const htmlPath = path.join(extensionPath, 'resources', 'template-picker.html');

	let htmlContent = fs.readFileSync(htmlPath, 'utf8');
	// Use cachedTemplates instead of reading from file
	const templates = cachedTemplates || [];

	// Replace placeholder in HTML with template items
	const templateItems = templates.map((template: any) => `
		<div class="template-item" data-template-id="${template.id}">
				<img src="${webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'resources', template.image)))}" alt="${template.name}">
				<h3>${template.name}</h3>
				<p>${template.description}</p>
		</div>
	`).join('');
	htmlContent = htmlContent.replace('{{TEMPLATE_ITEMS}}', templateItems);

	// Get the URI for the script file
	const scriptUri = webview.asWebviewUri(vscode.Uri.file(
		path.join(extensionPath, 'resources', 'template-picker.js')
	));

	// Insert the script URI into the HTML
	htmlContent = htmlContent.replace('{{SCRIPT_URI}}', scriptUri.toString());

	return htmlContent;
}

// This method is called when your extension is deactivated
export function deactivate() {}
