import * as vscode from 'vscode';
import { registerHelloWorldCommand } from './commands/helloWorld';
import { PapersViewProvider } from './providers/PapersViewProvider';
import { VIEW_TYPE_PAPERS } from './constants';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "cortex-cite" is now active!');

	// Register commands
	registerHelloWorldCommand(context);

	// Register the webview view provider
	const provider = new PapersViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(VIEW_TYPE_PAPERS, provider)
	);
}

export function deactivate() {}