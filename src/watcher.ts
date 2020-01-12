// Copyright (c) 2018-19 MalvaHQ
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
'use strict';
import * as vscode from 'vscode';
import * as common from 'dartsass-plugin-common';
import { getProjectRoot } from './doc';
import { myStatusBarItem } from './statusbar';
import  { getActiveProjectRoot } from './project';
const watcher = new common.Watcher();


export function updateStatusBar(watcher: common.Watcher) {
    const watchList: Map<string, number> = watcher.GetWatchList();
    const numWatchers: number = watchList.size;
    if (numWatchers > 0) {
        myStatusBarItem.text = `Sass Watchers: ${numWatchers}`;
        myStatusBarItem.show();
    } else {
        myStatusBarItem.hide();
    }
}

export function watchDirectory(_srcdir: vscode.Uri, config: common.CompilerConfig, vsconf: vscode.WorkspaceConfiguration, _log: common.ILog) {
    const uri = getProjectRoot(_srcdir);
    if (!uri) {
        return "";
    }
    const projectRoot = uri.fsPath;
    const srcdir =  common.xformPath(projectRoot, _srcdir.fsPath); 
    common.watchDirectory(srcdir, config).then(
        value => {
            vscode.window.showInformationMessage(`About to watch directory ${srcdir}`);
            doPersistWatchers(vsconf, config.watchDirectories, _log);
        },
        err => {
            vscode.window.showErrorMessage(`${err}`);
        }
    );
}

export function unwatchDirectory(_srcdir: vscode.Uri, config: common.CompilerConfig, vsconf: vscode.WorkspaceConfiguration, _log: common.ILog) {
    const uri = getProjectRoot(_srcdir);
    if (!uri) {
        return "";
    }
    const projectRoot = uri.fsPath;
    const srcdir =  common.xformPath(projectRoot, _srcdir.fsPath); 
    common.unwatchDirectory(srcdir, config).then(
        value => {
            doPersistWatchers(vsconf, config.watchDirectories, _log);
            if (!watcher.ClearWatch(_srcdir.fsPath, projectRoot, _log)) {
                vscode.window.showWarningMessage(`Unable to clear watch for directory ${_srcdir.fsPath}.`);
            } else {
                vscode.window.showInformationMessage(`Directory ${_srcdir.fsPath} unwatched now.`);
            }
            updateStatusBar(watcher);
        },
        err => {
            vscode.window.showInformationMessage(`${err}`);
        }
    );
}

export function listWatchers(_log: common.ILog) {
    const watchList: Map<string, number> = watcher.GetWatchList();
    if (watchList.size > 0) {
        _log.appendLine(`******************* ${watchList.size} watchers begin *********`);
        watchList.forEach((value: number, key: string) => {
            _log.appendLine(`${key} -> ${value} ( pid )`);
        });
        _log.appendLine(`******************* ${watchList.size} watchers *********`);
        vscode.window.showInformationMessage(`Having ${watchList.size} watchers. Check "Output" -> "DartJS Sass" for more details.`);
    } else {
        vscode.window.showInformationMessage(`No watchers defined.`);
    }
}


export function stopWatching(_srcdir: string, _log: common.ILog) {
    watcher.ClearWatchDirectory(_srcdir, _log);
}

export function clearAllWatchers(_log: common.ILog) {
    if (watcher.GetWatchList().size > 0) {
        vscode.window.showInformationMessage(`Clearing ${watcher.GetWatchList().size} sass watchers`);
        watcher.ClearAll(_log);
    }

}

export function restartWatchers(extensionConfig: common.CompilerConfig, _log: common.ILog) {
    const projectRoot = getActiveProjectRoot();
    if (projectRoot !== null) {
        relaunch(projectRoot, extensionConfig, _log);
    } else {
        clearAllWatchers(_log);
    }
}

export function doPersistWatchers(conf: vscode.WorkspaceConfiguration, watchDirectories: Array<string>, _log: common.ILog) {
    conf.update("watchDirectories", watchDirectories, false).then(
        value => {
            _log.appendLine(`Updated watchDirectories to ${watchDirectories}`);
        },
        err => {
            vscode.window.showErrorMessage(`Failed to update watchDirectories ${err}`);
        }
    );
}

export function relaunch(projectRoot: string, config: common.CompilerConfig, _log: common.ILog) {
    const promises = watcher.Relaunch(projectRoot, config, _log);
    for (const promise of promises) {
        promise.then(
            value => {
                updateStatusBar(watcher);
            },
            err => {
                vscode.window.showErrorMessage(`${err}`);
            }
        );
    }
}