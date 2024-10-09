import * as vscode from 'vscode';

export function registerHelloWorldCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('cortex-cite.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from cortex-cite!');
    });

    context.subscriptions.push(disposable);
}
