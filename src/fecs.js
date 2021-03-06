/**
 * @file fecs 相关操作
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict';

const Readable = require('stream').Readable;
const fecs = require('../fecs');
const File = require('vinyl');
const vscode = require('vscode');
const {window, languages} = vscode;
const {
    alertMsg,
    checkEditor,
    generateEditorFecsData
} = require('./utils');

// 插件配置属性
const vsConfig = vscode.workspace.getConfiguration('fecsmat');
const config = {
    en: vsConfig.get('en'),
    level: vsConfig.get('level'),
    errorColor: vsConfig.get('errorColor'),
    warnColor: vsConfig.get('warnColor'),
    typeMap: new Map(),
    fileTypes: vsConfig.get('fileTypes'),
    excludePaths: vsConfig.get('excludePaths'),
    excludeFileNameSuffixes: []
};

let editorFecsDataMap = new Map();
let diagnosticCollection = languages.createDiagnosticCollection('fecs');
let errorIconPath = null;
let warnIconPath = null;
let statusBarItem = null;

exports.format = function () {
    const editor = window.activeTextEditor;
    if (checkEditor(editor, config.fileTypes, config.excludePaths)) {
        runFecsFormat(editor);
    }

};

exports.check = function (editor, context) {
    if (!errorIconPath && !warnIconPath) {
        errorIconPath = context.asAbsolutePath('images/error.svg');
        warnIconPath = context.asAbsolutePath('images/warning.svg');
    }

    if (checkEditor(editor, config.fileTypes, config.excludePaths)) {
        diagnosticCollection.clear();
        runFecsCheck(editor);
    }
};

exports.showMsg = function (editor) {
    if (checkEditor(editor, config.fileTypes, config.excludePaths)) {
        diagnosticCollection.clear();
        showErrorMessageInStatusBar(editor);
    }
};

exports.clearMsg = function () {
    diagnosticCollection.clear();
    clearStatusBarMessage();
};

function clearStatusBarMessage() {
    if (!statusBarItem) {
        return;
    }

    statusBarItem.text = '';
    statusBarItem.tooltip = '';
}

function runFecsCheck(editor) {
    let code = editor.document.getText();
    let stream = createCodeStream(code, editor.document.fileName);

    let editorFecsData = generateEditorFecsData(editor, editorFecsDataMap);

    try {
        fecs.check({
            lookup: true,
            stream: stream,
            reporter: config.en ? '' : 'baidu',
            level: config.level
        }, function (success, json) {
            let errors = (json[0] || {}).errors || [];
            prepareErrors(errors, editor);
            renderErrors(editor);
        });
    }
    catch (err) {
        alertMsg('error', err.message);
        console.error(err);
    }
}

function prepareErrors(errors, editor) {
    let editorFecsData = editorFecsDataMap.get(editor.id);
    let oldDecorationTypeList = editorFecsData.oldDecorationTypeList;

    if (oldDecorationTypeList.length) {
        oldDecorationTypeList.forEach(type => type.dispose());
        oldDecorationTypeList = editorFecsData.oldDecorationTypeList = [];
    }

    if (editorFecsData.errorMap) {
        editorFecsData.errorMap.clear();
    }

    let errorMap = editorFecsData.errorMap = new Map();
    let diagnostics = editorFecsData.diagnostics = [];

    let warningDecorationList = editorFecsData.warningDecorationList = [];
    let errorDecorationList = editorFecsData.errorDecorationList = [];

    errors.forEach(err => {
        let lineIndex = err.line - 1;
        err.msg = err.message.trim() + ' (rule: ' + err.rule + ')';
        diagnostics.push(generateDiagnostic(err));
        errorMap.set(lineIndex, (errorMap.get(lineIndex) || []).concat(err));
    });
    errorMap.forEach(errs => {
        errs.sort((a, b) => b.severity - a.severity);
        let err = errs[0];
        let lineIndex = err.line - 1;
        let decortation = generateDecoration(lineIndex);
        if (err.severity === 2) {
            errorDecorationList.push(decortation);
        }
        else {
            warningDecorationList.push(decortation);
        }
    });
}

function generateDiagnostic(data) {

    let lineIndex = data.line - 1;
    let cloumnIndex = data.column - 1;
    let startPos = new vscode.Position(lineIndex, cloumnIndex);
    let endPos = new vscode.Position(lineIndex, cloumnIndex);
    let range = new vscode.Range(startPos, endPos);

    let message = data.msg;
    let severity = data.severity === 2 ? 0 : 1;

    return new vscode.Diagnostic(range, message, severity);
}

function generateDecoration(lineIndex) {
    let startPos = new vscode.Position(lineIndex, 0);
    let endPos = new vscode.Position(lineIndex, 0);
    let decoration = {
        range: new vscode.Range(startPos, endPos)
    };
    return decoration;
}

function renderErrors(editor) {
    let editorFecsData = editorFecsDataMap.get(editor.id);

    if (!editorFecsData) {
        return;
    }

    let {
        errorDecorationList,
        warningDecorationList,
        oldDecorationTypeList
    } = editorFecsData;
    decorateEditor(editor, errorDecorationList, 'error', oldDecorationTypeList);
    decorateEditor(editor, warningDecorationList, 'warning', oldDecorationTypeList);

    showErrorMessageInStatusBar(editor);
    showDiagnostics(editor);
}

// hover显示错误信息
function showDiagnostics(editor) {
    let editorFecsData = editorFecsDataMap.get(editor.id);

    if (!editorFecsData) {
        return;
    }

    let uri = editor.document.uri;
    let diagnostics = editorFecsData.diagnostics;

    if (window.activeTextEditor !== editor) {
        diagnosticCollection.delete(uri);
        return;
    }

    diagnosticCollection.set(uri, diagnostics);
}

function decorateEditor(editor, list, type, oldDecorationTypeList) {
    if (list.length) {
        let dt = generateDecorationType(type);
        oldDecorationTypeList.push(dt);
        editor.setDecorations(dt, list);
    }
}

function generateDecorationType(type = 'warning') {
    let pointPath = warnIconPath;
    let rulerColor = config.warnColor;

    if (type === 'error') {
        pointPath = errorIconPath;
        rulerColor = config.errorColor;
    }

    return vscode.window.createTextEditorDecorationType({
        gutterIconPath: pointPath,
        gutterIconSize: 'contain',
        overviewRulerColor: rulerColor
    });
}

function showErrorMessageInStatusBar(editor) {
    let selection = editor.selection;
    let line = selection.start.line; // 只显示选区第一行的错误信息
    let editorFecsData = editorFecsDataMap.get(editor.id);
    let errorMap = editorFecsData.errorMap;
    let errList = [];

    if (errorMap && errorMap.has(line)) {
        errList = errorMap.get(line);
    }

    if (!statusBarItem) {
        statusBarItem = window.createStatusBarItem(1);
        statusBarItem.show();
    }

    let showErr = errList[0] || {msg: '', severity: 0};

    statusBarItem.text = showErr.msg;
    statusBarItem.color = showErr.severity === 2 ? config.errorColor : config.warnColor;
    statusBarItem.tooltip = 'fecs:\n\n' + errList.map(err => err.msg).join('\n\n');
}

function runFecsFormat(editor) {
    let code = editor.document.getText();
    let fileName = editor.document.fileName;
    let fileType = fileName.split('.').pop();

    if (fileType === 'san' || fileType === 'vue') {
        formatSanOrVue(editor);
        return;
    }

    let stream = createCodeStream(code, fileName);
    let bufData = [];

    try {
        fecs.format({
            lookup: true,
            stream: stream,
            reporter: 'none',
            level: 0
        }).on('data', function (file) {
            bufData = bufData.concat(file.contents);
        }).on('end', function () {
            let startPos = new vscode.Position(0, 0);
            let endPos = new vscode.Position(editor.document.lineCount, 0);
            let range = new vscode.Range(startPos, endPos);

            vscode.window.activeTextEditor.edit(editBuilder => {
                editBuilder.replace(range, bufData.toString('utf8'));
            });
        });
    }
    catch (err) {
        alertMsg('error', err.message);
        console.error(err);
    }
}

function formatSanOrVue(editor) {
    let code = editor.document.getText();

    let template = code.match(/\<template(.*)\>([\s\S]+)\<\/template\>/);
    let script = code.match(/\<script(.*)\>([\s\S]+)\<\/script\>/);
    let style = code.match(/\<style(.*)\>([\s\S]+)\<\/style\>/);

    try {
        let stream = createCodeStream(script[2], 'current-file.js');
        let bufData = [];
        fecs.format({
            lookup: true,
            stream: stream,
            reporter: 'none',
            level: 0
        }).on('data', function (file) {
            bufData = bufData.concat(file.contents);
        }).on('end', function () {
            let startPos = new vscode.Position(0, 0);
            let endPos = new vscode.Position(editor.document.lineCount, 0);
            let range = new vscode.Range(startPos, endPos);
            let result = template[0]
                .concat('\n<script>')
                .concat(bufData)
                .concat('</script>\n')
                .concat(style[0])
                .concat('\n')
                .toString('utf8');

            vscode.window.activeTextEditor.edit(editBuilder => {
                editBuilder.replace(range, result);
            });
            console.log('complete san');
        });


    }
    catch (err) {
        alertMsg('error', err.message);
        console.error(err);
    }
}

function createCodeStream(code = '', filePath = '') {
    let type = filePath.split('.').pop();

    let buf = new Buffer(code);
    let file = new File({
        contents: buf,
        path: filePath || 'current-file.' + type,
        stat: {
            size: buf.length
        }
    });
    let stream = new Readable();
    stream._read = function () {
        this.emit('data', file);
        this.push(null);
    };
    return stream;
}
