/**
 * @file core code
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict'

const {alertMsg} =  require('./utils');
const vscode = require('vscode');
const {format, helloWorld} = require('./fecs');

function registerSayHello (context) {
    const disposable = vscode.commands.registerCommand('extension.sayHello', helloWorld);

    context.subscriptions.push(disposable);
}

function registerFormat (context) {
    const disposable = vscode.commands.registerCommand('extension.format', format);

    context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate (context) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    registerSayHello(context);
    registerFormat(context);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;