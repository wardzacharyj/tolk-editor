import * as vscode from 'vscode';

import { exec } from 'child_process';
import { promisify } from 'util';

import {
	EDITOR_NAME,
	PROPS,
	REASON,
	validateCommandContainsUriSymbol,
	validateRequiredConfigProperty,
	showErrorWindow
} from './configValidator';

const asyncExec = promisify(exec);

class TolkDocument implements vscode.CustomDocument {
	readonly uri: vscode.Uri;

	constructor(uri: vscode.Uri) {
		this.uri = uri;
	}

	async convertToHumanReadable() {
		const tolkEditorSettings = vscode.workspace.getConfiguration(PROPS.tolkEditor);
		if (!tolkEditorSettings) {
			return `Tolk editor failed to find the required workspace configuration object property ${PROPS.tolkEditor}`;
		}

		const { executablePath, uriSymbol, executableArgs } = tolkEditorSettings;
		const argsWithFileUri = executableArgs
			? executableArgs.replaceAll(uriSymbol, this.uri.fsPath)
			: this.uri.fsPath;

		const combinedCommand = `${executablePath} ${argsWithFileUri}`;
		const { stderr, stdout } = await asyncExec(combinedCommand);
		return stdout ? stdout : stderr;
	}

	getAssociatedExtension() {
		const fileAssociations = vscode.workspace.getConfiguration('files').get('associations');

		const matchWildCard = (str: string, rule: string) => {
			const escapeRegex = (str: string) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
			return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
		};

		// Try to find the syntax highlighting that the unpacked binary might prefer
		if (fileAssociations) {
			for (const [wildcardPattern, fileType] of Object.entries(fileAssociations)) {
				console.log(`${this.uri.fsPath} vs ${wildcardPattern}`);
				if (matchWildCard(this.uri.fsPath, wildcardPattern)) {
					return fileType;
				}
			}
		}
		return undefined;
	}

	dispose(){}
}

class TolkEditorProvider implements vscode.CustomReadonlyEditorProvider<TolkDocument> {

	constructor(
		private readonly context: vscode.ExtensionContext
	) {
		this.context = context;
	}

	async openCustomDocument(
		uri: vscode.Uri,
		openContext: vscode.CustomDocumentOpenContext,
		token: vscode.CancellationToken
	) {
		return new TolkDocument(uri);
	}

    async resolveCustomEditor(tolkDocument: TolkDocument, webviewPanel: vscode.WebviewPanel) {
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		const convertedFileContent = await tolkDocument.convertToHumanReadable();
        webviewPanel.webview.html = await this._getHtmlForWebview(webviewPanel.webview, convertedFileContent);

		webviewPanel.webview.onDidReceiveMessage(
			message => {
				if (message && message.command && message.command === 'DOMContentLoaded') {
					webviewPanel.webview.postMessage({
						command: 'loadContent',
						content: convertedFileContent,
						associatedLanguage: tolkDocument.getAssociatedExtension()
					});
				}
			},
			undefined,
			this.context.subscriptions
		);
    }

    async _getHtmlForWebview(webview: vscode.Webview, convertedFileContent: string) {

		// Local path to node_module scrips so the editor can be used in browser

		const requirePaths = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,
			'dist',
			'monaco-editor'
		));
		const loaderPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,
			'dist',
			'monaco-editor',
			'loader.js'
		));
		const nlsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,
			'dist',
			'monaco-editor',
			"editor",
			'editor.main.nls.js'
		));
		const mainPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,
			'dist',
			'monaco-editor',
			"editor",
			'editor.main.js'
		));

		const cssDataPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,
			'dist',
			'monaco-editor',
			"editor",
			'editor.main.css'
		));
		return `
			<!DOCTYPE html>
			<html lang="en" style="height: 100%;">
			<head>
			<link
				rel="stylesheet"
				data-name="vs/editor/editor.main"
				href="${cssDataPath}"
			/>
			</head>
			<body style="height: 100%;">
			<script>
				var require = { paths: { vs: "${requirePaths}" } };
			</script>
			<script src="${loaderPath}"></script>
			<script src="${nlsPath}"></script>
			<script src="${mainPath}"></script>
			<div id="container" style="height: 100%;">
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				
				// Tell extension the DOM content is loaded
				document.addEventListener("DOMContentLoaded", function(event) {
					vscode.postMessage({ command: 'DOMContentLoaded' });
				});
				
				// Populate the container with the parsed content
				window.addEventListener('message', event => {
					const message = event.data; // The JSON data our extension sent
					const { command, content, associatedLanguage } = message;

					switch (command) {
						case 'loadContent': {
							const container = document.getElementById("container");
							const myEditor = monaco.editor.create(container, {
								value: content,
								readOnly: true,
								language: associatedLanguage,
								automaticLayout: true,
								theme: "vs-dark",
							});
							break;
						}
					}
				});
			</script>
			</body>
			</html>`;
    }
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Activating');

	const tolkEditorSettings = vscode.workspace.getConfiguration(PROPS.tolkEditor);
	if (!validateRequiredConfigProperty(tolkEditorSettings)) {
		showErrorWindow(PROPS.tolkEditor, REASON.tolkEditor);
		return;
	}

	if (!validateRequiredConfigProperty(tolkEditorSettings.get(PROPS.executablePath))) {
		showErrorWindow(PROPS.executablePath, REASON.executablePath);
		return;
	}

	const hasUriSymbol = validateRequiredConfigProperty(tolkEditorSettings.get(PROPS.uriSymbol));
	const hasExecutableArgs = validateRequiredConfigProperty(tolkEditorSettings.get(PROPS.executableArgs));
	if (hasUriSymbol !== hasExecutableArgs) {
		showErrorWindow(PROPS.uriSymbol, REASON.uriSymbol);
		showErrorWindow(PROPS.executableArgs, REASON.executableArgs);
		return;
	}

	if (hasUriSymbol && hasExecutableArgs
		&& !validateCommandContainsUriSymbol(tolkEditorSettings.get(PROPS.executableArgs)!, tolkEditorSettings.get(PROPS.uriSymbol)!)) {
		return;
	}

	const tolkEditorProvider = new TolkEditorProvider(context);
	const webviewPanelOptions = {
		webviewOptions: {
			enableFindWidget: true,
		},
		supportsMultipleEditorsPerDocument: true		   
	};

	const registeredCustomEditorProvider = vscode.window.registerCustomEditorProvider(EDITOR_NAME, tolkEditorProvider, webviewPanelOptions);
	context.subscriptions.push(registeredCustomEditorProvider);
}


// This method is called when your extension is deactivated
export function deactivate() {}

