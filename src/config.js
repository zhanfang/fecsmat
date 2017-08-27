/**
 * @file fecs 相关配置文件
 * @author zhanfang(fzhanxd@gmail.com)
 */
'use strict'

const vscode = require('vscode');
const vsConfig = vscode.workspace.getConfiguration('fecsmat');

exports = {
    en: vsConfig.get('en'),
    level: vsConfig.get('level'),
    errorColor: vsConfig.get('errorColor'),
    warnColor: vsConfig.get('warnColor'),
    typeMap: new Map(),
    fileType: vsConfig.get('fileType'),
    excludePaths: vsConfig.get('excludePaths'),
    excludeFileNameSuffixes: []
};
