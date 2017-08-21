/**
 * @file fecs 相关操作
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict';

const Readable = require('stream').Readable;
const fecs = require('fecs');
const File = require('vinyl');
const vscode = require('vscode');
const {alertMsg} = require('./utils');
const config = require('./config');

const {window} = vscode;

exports.helloWorld = function () {
    alertMsg('info', 'Hello World!');
};

exports.format = function () {
    if (!window.activeTextEditor) {
        alertMsg('warn', '无可用文本用于格式化');
        return;
    }

    const editor = window.activeTextEditor;
    const fileName = editor.document.fileName;
    let fileType;

    if (fileName) {
        let matchArry = fileName.match(/.*\.(.*)$/);
        if (matchArry !== null) {
            fileType = matchArry[1].toLowerCase();
        }
    }

    if (
        fileType === 'js'
        || fileType === 'es'
        || fileType === 'html'
        || fileType === 'css'
        || fileType === 'less'
        || fileType === 'jsx'
        || fileType === 'vue'
    ) {
        runFecsFormat(editor);
    }

};

function runFecsFormat(editor) {
    if (!editor || !editor.document) {
        return;
    }

    let code = editor.document.getText();
    let stream = createCodeStream(code, editor.document.fileName);
    console.log(stream);
    let bufData = [];
    fecs.format({
        lookup: true,
        stream: stream,
        reporter: 'baidu',
        level: 0
    }).on('data', function (file) {
        console.log(file.contents);
        bufData = bufData.concat(file.contents);
    }).on('end', function () {
        console.log('end');
        let startPos = new vscode.Position(0, 0);
        let endPos = new vscode.Position(editor.document.lineCount, 0);
        let range = new vscode.Range(startPos, endPos);

        vscode.window.activeTextEditor.edit(editBuilder => {
            editBuilder.replace(range, bufData.toString('utf8'));
        });
    });
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
