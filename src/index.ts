import createDebug from 'debug';
import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';

import { InputOptions, normalizeOptions } from './options';
import {
    addFile,
    createPlugin,
    findFile,
    getMatchedFilenameList,
    getValidFiles,
} from './utils/metalsmith';
import { loadConfig, processCSS } from './utils/postcss';
import { getSourceMappingURL, isDataURL } from './utils/source-map';

const debug = createDebug(require('../package.json').name);
const debugPostcssrc = debug.extend('postcssrc');

export = (opts: InputOptions = {}): Metalsmith.Plugin => {
    return createPlugin(async (files, metalsmith) => {
        const options = await normalizeOptions(files, metalsmith, opts);
        const matchedFilenameList = getMatchedFilenameList(
            files,
            options.pattern,
        );
        const targetFiles = getValidFiles(files, matchedFilenameList);
        const targetFilenameList = Object.keys(targetFiles);

        debug(
            'validate %d files: %o',
            targetFilenameList.length,
            targetFilenameList,
        );

        await Promise.all(
            Object.entries(targetFiles).map(async ([filename, filedata]) => {
                const newFilename = options.renamer(filename);

                const from = metalsmith.path(metalsmith.source(), filename);
                const to = metalsmith.path(
                    metalsmith.destination(),
                    newFilename,
                );
                const config = await loadConfig({
                    options: options.options,
                    sourceFilepath: from,
                });
                if (config) {
                    debugPostcssrc(
                        'loaded postcss config by file %o: %o',
                        filename,
                        path.relative(process.cwd(), config.file),
                    );
                }
                const plugins = config ? config.plugins : [...options.plugins];
                const postcssOptions = {
                    ...(config ? config.options : options.options),
                    from,
                    to,
                };

                const beforeCssText = filedata.contents.toString();

                const postcssMapOption = postcssOptions.map;
                if (postcssMapOption) {
                    const sourceMappingURL = getSourceMappingURL(beforeCssText);
                    if (
                        typeof sourceMappingURL === 'string' &&
                        !isDataURL(sourceMappingURL)
                    ) {
                        const sourceMapPath = path.join(
                            path.dirname(from),
                            sourceMappingURL,
                        );
                        const [, sourceMapFiledata] = findFile(
                            files,
                            sourceMapPath,
                            metalsmith,
                        );
                        if (sourceMapFiledata) {
                            const prev = sourceMapFiledata.contents.toString();
                            postcssOptions.map =
                                postcssMapOption === true
                                    ? { prev }
                                    : { ...postcssMapOption, prev };
                        }
                    }
                }

                const result = await processCSS(
                    postcss(plugins),
                    beforeCssText,
                    postcssOptions,
                );
                if (!result) return;

                addFile(files, newFilename, result.css, filedata);
                if (filename !== newFilename) {
                    debug(
                        'done process %o, renamed to %o',
                        filename,
                        newFilename,
                    );
                    delete files[filename];
                    debug('file deleted: %o', filename);
                } else {
                    debug('done process %o', filename);
                }

                if (result.map) {
                    const sourceMapFilename = newFilename + '.map';
                    addFile(files, sourceMapFilename, result.map.toString());
                    debug('generate SourceMap: %o', sourceMapFilename);
                }
            }),
        );
    });
};
