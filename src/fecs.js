/**
 * @file fecs 相关操作
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict';

const Readable = require('stream').Readable;
const fecs = require('../fecs');
const File = require('vinyl');
const vscode = require('vscode');
const {alertMsg, checkEditor} = require('./utils');
const config = require('./config');

const {window} = vscode;


exports.format = function () {
    const editor = window.activeTextEditor;
    if (checkEditor(editor)) {
        runFecsFormat(editor);
    }
};

exports.check = function () {
    const editor = window.activeTextEditor;
    if (checkEditor(editor)) {
        runFecsCheck(editor);
    }
}

function runFecsCheck(editor) {
    let code = editor.document.getText();
    let stream = createCodeStream(code, editor.document.fileName);
    
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
    } catch (err) {
        console.error(err)
    }
}

function runFecsFormat(editor) {
    let code = editor.document.getText();
    let stream = createCodeStream(code, editor.document.fileName);
    let bufData = [];

    try {
        fecs.format({
            lookup: true,
            stream: stream,
            reporter: 'baidu',
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
    } catch (err) {
        alertMsg('error', err.message);
        console.error(err)
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


