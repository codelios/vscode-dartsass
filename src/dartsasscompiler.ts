'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import sass = require("sass");
import packageImporter = require('node-sass-package-importer');
import { IPackageImporterOptions } from 'node-sass-magic-importer/src/interfaces/IImporterOptions';

export interface CompilerResult {

    onSuccess(): void;

    onFailure(): void;
}

/**
 * Compile a given sass file based on DartSass implementation.
 *
 * More details of the API at -
 * https://github.com/sass/dart-sass/blob/master/README.md#javascript-api .
 */
export class DartSassCompiler {


    constructor() {

    }

    public compileAll(projectRoot: vscode.Uri) : boolean {
        vscode.window.showErrorMessage('Not yet implemented. To Compile All the sass files inside the given workspace');
        return false;
    }

    public sayVersion() : string {
        // TODO: To print sass library version automatically imported from package
        // as opposed to hardcoding it here.
        const version = "1.15.2";
        vscode.window.showInformationMessage(`Uses sass pure Dart/JS compiler: ${version}`);
        return "Uses sass@npm: 1.15.2";
    }

    xformPath(projectRoot: vscode.Uri, entry: string): string {
        // TODO: For now - it is assumed the URI is a file system
        if (path.isAbsolute(entry)) {
            return entry;
        }
        const basedir = projectRoot.fsPath;
        return path.join(basedir, entry);
    }

    xformPaths(projectRoot: vscode.Uri, includePath: string[]): string[] {
        const output:string[] = [];
        const self = this;
        includePath.forEach(function(entry: string){
            output.push(self.xformPath(projectRoot, entry));
        });
        return output;
    }

    public compileDocument(document: vscode.TextDocument, projectRoot: vscode.Uri, configuration: vscode.WorkspaceConfiguration) {
        let includePath: string[] = [];
        if (configuration.has('includePath')) {
            includePath = configuration.get<string[]>('includePath', []);
        }
        const xformedIncludePath = this.xformPaths(projectRoot, includePath);
        // TODO: For now - it is assumed the URI is a file system
        const sassWorkingDirectory = configuration.get<string>('sassWorkingDirectory', projectRoot.fsPath);
        const xformedWorkingDirectory = this.xformPath(projectRoot, sassWorkingDirectory);
        this.compile(document.fileName, xformedWorkingDirectory, xformedIncludePath);
    }

    handleSassOutput(err: sass.SassException, result: sass.Result, output: string, compilerResult: CompilerResult): boolean {
        if (err) {
            const fileonly = path.basename(err.file);
            const formattedMessage = ` ${err.line}:${err.column} ${err.formatted}`;
            vscode.window.showErrorMessage(`Error compiling scss file ${fileonly}: ${formattedMessage}`);
            console.error(`${err.formatted}`);
            compilerResult.onFailure();
            return false;
        }
        fs.writeFile(output, result.css, (err: NodeJS.ErrnoException) => {
            if (err) {
                vscode.window.showErrorMessage('Error while writing to css file');
                console.error(err);
                compilerResult.onFailure();
                return;
            }
            compilerResult.onSuccess();
        });
        return true;
    }

    compileToFile(input: string, compressed: boolean, output: string,
        options: IPackageImporterOptions,
        includePaths: string[], compilerResult: CompilerResult) {
        const self = this;
        sass.render({
            file: input,
            importer: packageImporter(options),
            includePaths: includePaths,
            outputStyle: compressed ? 'compressed': 'expanded',
            outFile: output
        }, function (err: sass.SassException, result: sass.Result) {
            self.handleSassOutput(err, result, output, compilerResult);
        });

    }

    getOptions(cwd: string) : IPackageImporterOptions {
        const options = {
            cwd: cwd,
            packageKeys: [
              'sass',
              'scss',
              'style',
              'css',
              'main.sass',
              'main.scss',
              'main.style',
              'main.css',
              'main'
            ],
            packagePrefix: '~'
          };
        return options;
    }
    public compile(input: string, cwd: string, includePaths: string[]) {
        const filedir = path.dirname(input);
        const fileonly = path.basename(input, '.scss');
        const output = path.join(filedir, fileonly + '.css');
        const compressedOutput = path.join(filedir, fileonly + '.min.css');
        const self = this;
        const options = this.getOptions(cwd);
        const compilerResult:CompilerResult = {
            onFailure() {

            },
            onSuccess() {
                console.debug(`Compiled ${input} to ${output}`);
                const tmpResult :CompilerResult = {
                    onFailure() {

                    },
                    onSuccess() {
                        console.debug(`Compiled ${input} to ${compressedOutput}`);
                    }
                };
                self.compileToFile(input, true, compressedOutput, options, includePaths, tmpResult);
            }
        };
        this.compileToFile(input, false, output, options, includePaths, compilerResult);
    }

}
