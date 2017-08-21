/**
 * @file vscode 常用工具
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict'
const {window} = require('vscode');

exports.alertMsg = function (type, msg) { 
    switch (type) {
        case 'info':
            window.showInformationMessage(msg);
            break;
        case 'error':
            window.showErrorMessage(msg);
            break
        case 'warn':
            window.showWarningMessage(msg);
            break
        default:
            break;
    }
}