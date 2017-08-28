/**
 * @file 插件所需工具方法
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict';
const {window} = require('vscode');

function alertMsg(type, msg) {
    switch (type) {
        case 'info':
            window.showInformationMessage(msg);
            break;
        case 'error':
            window.showErrorMessage(msg);
            break;
        case 'warn':
            window.showWarningMessage(msg);
            break;
        default:
            break;
    }
}

/**
 * 弹窗工具
 */
exports.alertMsg = alertMsg;

/**
 * 检测当前editor是否可以被fecs应用
 */
exports.checkEditor = function (editor, fileTypes, excludePaths) {
    if (!editor) {
        alertMsg('warn', '无可用文本用于格式化');
        return false;
    }

    const fileName = editor.document.fileName;
    const fileType = fileName.split('.').pop();

    const path = excludePaths.filter(item => {
        let reg = new RegExp(item, 'g');
        let match = fileName.match(reg);
        if (match) {
            return true;
        }
        return false;
    });

    if (path.length >= 1) {
        return false;
    }


    const result = fileTypes.filter(item => {
        return item === fileType;
    });

    if (result.length === 1) {
        return true;
    }

    return false;
};

exports.generateEditorFecsData = function (editor, editorFecsDataMap) {
    if (!editor || editorFecsDataMap.has(editor.id)) {
        return;
    }

    let fileName = editor.document ? editor.document.fileName : '';

    editorFecsDataMap.set(editor.id, {
        fileName: fileName,
        oldDecorationTypeList: [],
        delayTimer: null,
        isRunning: false,
        needCheck: true,
        errorMap: null,
        diagnostics: [],
        warningDecorationList: [],
        errorDecorationList: []
    });

    return editorFecsDataMap.get(editor.id);
};
