/**
 * @file core code
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict';

const vscode = require('vscode');
const {format, check, showMsg, clearMsg} = require('./fecs');

let start = false;

function registerFormat(context) {
    const disposable = vscode.commands.registerCommand('extension.format', format);
    context.subscriptions.push(disposable);
}

function registerStart(context) {
    const disposable = vscode.commands.registerCommand('extension.start', () => {
        start = !start;
        clearMsg();
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    // 编辑文档后触发(coding...)
    vscode.workspace.onDidChangeTextDocument(function (event) {
        let editor = vscode.window.activeTextEditor;
        if (start) {
            check(editor, context);
        }
    });

    // 切换文件 tab 后触发
    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        if (start) {
            check(editor, context);
        }
    });

    // 光标移动后触发
    vscode.window.onDidChangeTextEditorSelection(function (event) {

        if (!event.textEditor || !event.textEditor.document || !start) {
            return;
        }

        if (event.textEditor === vscode.window.activeTextEditor) {
            showMsg(event.textEditor);
        }

    });

    registerStart(context);
    registerFormat(context);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
