import * as vscode from 'vscode'; 

export const EDITOR_NAME = 'tolk.customEditor';

export const PROPS = {
    tolkEditor: 'tolkEditor',
    executablePath: 'executablePath',
    uriSymbol: 'uriSymbol',
    executableArgs: 'executableArgs'
};

export const REASON = {
    tolkEditor: 'This property is the object that contains all the required settings for the tolk extension',
    executablePath: 'This property is the path we will search for the script or program that can convert the opened binary file',
    uriSymbol: 'This property is the symbol we will try to replace with the opened binary file\'s file-path in the provided executableArgs string',
    executableArgs: 'This property is the executableArgs following \"executablePath\". It must contain the \"uriSymbol\" if provided'
};

export function validateRequiredConfigProperty(configResult: any): boolean {
    return configResult !== undefined
        && JSON.stringify(configResult) !== '{}'
        && (!Number.isNaN(configResult) || typeof configResult === 'boolean' || typeof configResult === 'string');
}

export function validateCommandContainsUriSymbol(executableArgs: string, requiredUriSymbol: string): boolean {
    if (!executableArgs || !executableArgs.includes(requiredUriSymbol)) {
        vscode.window.showErrorMessage(`The "uriSymbol" in the tolk editor workspace configuration was not found in the "executableArgs" property.
            The "uriSymbol" is required to appear in the "executableArgs" property.
            This ensures the program provided at "executablePath" is forwarded file paths in the order expected along with any required other options or flags`);
        return false;
    }
    return true;
}

export function showErrorWindow(configKeyName: string, reasonForSetting: string) {
    vscode.window.showErrorMessage(`"${configKeyName}" property is missing or empty in your workspace configuration.
        The tolk editor extension will not be registered.
        Please populate this property in your settings. ${reasonForSetting}`);
}