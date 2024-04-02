import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import {
	validateCommandContainsUriSymbol,
	validateRequiredConfigProperty
} from '../../configValidator';


suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test("validateCommandContainsUriSymbol", () => {
		assert(validateRequiredConfigProperty("key"));
		assert(validateRequiredConfigProperty(""));
		assert(validateRequiredConfigProperty(0));
		assert(validateRequiredConfigProperty(1));
		assert(validateRequiredConfigProperty(true));
		assert(validateRequiredConfigProperty(false));
		assert(!validateRequiredConfigProperty(undefined));
		assert(!validateRequiredConfigProperty({}));
	});
	test("validateCommandContainsUriSymbol", () => {
		assert(validateCommandContainsUriSymbol("-i ${URI}", "${URI}"));
		assert(validateCommandContainsUriSymbol(" ", ""));
		assert(!validateCommandContainsUriSymbol("", ""));
		assert(!validateCommandContainsUriSymbol("command here test", "someSymbol"));
	});
});
