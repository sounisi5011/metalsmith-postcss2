import createDebug from 'debug';
import isPathInside from 'is-path-inside';
import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';

import {
    InputOptions,
    normalizeOptions,
    OptionsInterface,
    validatePostcssOptions,
} from './options';
import { hasProp } from './utils';
import {
    addFile,
    createPlugin,
    FileInterface,
    findFile,
    getMatchedFilenameList,
    getValidFiles,
    MetalsmithStrictFiles,
    MetalsmithStrictWritableFiles,
} from './utils/metalsmith';
import { loadConfig, processCSS } from './utils/postcss';
import { findSourceMapFile, getSourceMappingURL } from './utils/source-map';

const debug = createDebug(require('../package.json').name);
const debugPostcssrc = debug.extend('postcssrc');

function updatePostcssOption(
    options: postcss.ProcessOptions,
    {
        from,
        to,
        files,
        filename,
        metalsmith,
    }: {
        from: string;
        to: string;
        files: MetalsmithStrictFiles;
        filename: string;
        metalsmith: Metalsmith;
    },
): postcss.ProcessOptions &
    Required<Pick<postcss.ProcessOptions, 'from' | 'to'>> {
    const postcssOptions = {
        ...options,
        from,
        to,
    };

    const postcssMapOption = postcssOptions.map;
    if (
        postcssMapOption &&
        !(
            typeof postcssMapOption === 'object' &&
            hasProp(postcssMapOption, 'prev')
        )
    ) {
        const [, sourceMapFiledata] = findSourceMapFile(
            files,
            filename,
            metalsmith,
        );
        if (sourceMapFiledata) {
            const prev = sourceMapFiledata.contents.toString();
            postcssOptions.map = {
                prev,
                ...(postcssMapOption === true ? {} : postcssMapOption),
            };
        }
    }

    return postcssOptions;
}

function fixPostcssAnnotationOption(
    options: postcss.ProcessOptions,
    {
        metalsmithSrcFullpath,
        metalsmithDestFullpath,
        destFileFullpath,
    }: {
        metalsmithSrcFullpath: string;
        metalsmithDestFullpath: string;
        destFileFullpath: string;
    },
): postcss.ProcessOptions {
    const postcssMapOption = options.map;
    if (typeof postcssMapOption !== 'object') {
        return options;
    }

    const postcssMapAnnotation = postcssMapOption.annotation;
    if (typeof postcssMapAnnotation !== 'string') {
        return options;
    }

    const sourceMapFullpath = postcssMapAnnotation
        ? path.resolve(path.dirname(destFileFullpath), postcssMapAnnotation)
        : `${destFileFullpath}.map`;
    const sourceMapFixedFullpath =
        destFileFullpath === sourceMapFullpath
            ? `${sourceMapFullpath}.map`
            : sourceMapFullpath;
    const sourceMapFilename = path.relative(
        isPathInside(sourceMapFixedFullpath, metalsmithSrcFullpath)
            ? metalsmithSrcFullpath
            : metalsmithDestFullpath,
        sourceMapFixedFullpath,
    );
    const fixedSourceMappingURL = path.relative(
        path.dirname(destFileFullpath),
        path.resolve(metalsmithDestFullpath, sourceMapFilename),
    );

    return {
        ...options,
        map: {
            ...postcssMapOption,
            annotation: fixedSourceMappingURL,
        },
    };
}

function getDependenciesRecord(
    result: postcss.Result,
    {
        metalsmithSrcFullpath,
        files,
        metalsmith,
    }: {
        metalsmithSrcFullpath: string;
        files: MetalsmithStrictFiles;
        metalsmith?: Metalsmith;
    },
): Record<string, unknown> {
    return (
        result.messages
            /**
             * @see https://github.com/postcss/postcss-loader/blob/v3.0.0/src/index.js#L149-L153
             */
            .filter(message => message.type === 'dependency')
            .reduce<Record<string, unknown>>((dependencies, message) => {
                const dependencyFilename = path.relative(
                    metalsmithSrcFullpath,
                    message.file,
                );
                const [foundFilename, foundFiledata] = findFile(
                    files,
                    dependencyFilename,
                    metalsmith,
                );
                return {
                    ...dependencies,
                    [dependencyFilename]:
                        foundFilename !== null ? foundFiledata : undefined,
                };
            }, {})
    );
}

async function processFile({
    files,
    writableFiles,
    metalsmith,
    options,
    filename,
    filedata,
}: {
    files: MetalsmithStrictFiles;
    writableFiles: MetalsmithStrictWritableFiles;
    metalsmith: Metalsmith;
    options: OptionsInterface;
    filename: string;
    filedata: FileInterface;
}): Promise<void> {
    const metalsmithSrcFullpath = metalsmith.path(metalsmith.source());
    const metalsmithDestFullpath = metalsmith.path(metalsmith.destination());

    const newFilename = options.renamer(filename);

    const srcFileFullpath = path.resolve(metalsmithSrcFullpath, filename);
    const destFileFullpath = path.resolve(metalsmithDestFullpath, newFilename);
    const postcssOptions = updatePostcssOption(options.options, {
        from: srcFileFullpath,
        to: destFileFullpath,
        files,
        filename,
        metalsmith,
    });
    const config = await loadConfig({
        plugins: options.plugins,
        options: postcssOptions,
        sourceFilepath: srcFileFullpath,
        metalsmith,
    });
    if (config) {
        const configPath = path.relative(process.cwd(), config.file);
        debugPostcssrc(
            'loaded postcss config by file %o: %o',
            filename,
            configPath,
        );

        validatePostcssOptions(config.options, {
            type: 'PostCSS Config',
            location: `config file: ${configPath}`,
        });
    }
    const plugins = config ? config.plugins : [...options.plugins];

    const result = await processCSS(
        plugins,
        filedata.contents,
        fixPostcssAnnotationOption(
            updatePostcssOption(config ? config.options : postcssOptions, {
                from: srcFileFullpath,
                to: destFileFullpath,
                files,
                filename,
                metalsmith,
            }),
            {
                metalsmithSrcFullpath,
                metalsmithDestFullpath,
                destFileFullpath,
            },
        ),
    );
    if (!result) return;

    const dependencies: Record<string, Record<string, unknown>> | undefined =
        typeof options.dependenciesKey === 'string' &&
        options.dependenciesKey !== ''
            ? {
                  [options.dependenciesKey]: {
                      [filename]: filedata,
                      ...getDependenciesRecord(result, {
                          metalsmithSrcFullpath,
                          files,
                          metalsmith,
                      }),
                  },
              }
            : undefined;

    const cssText = result.css;
    addFile(writableFiles, newFilename, cssText, {
        originalData: filedata,
        otherData: dependencies,
    });
    if (filename !== newFilename) {
        debug('done process %o, renamed to %o', filename, newFilename);
        delete writableFiles[filename];
        debug('file deleted: %o', filename);
    } else {
        debug('done process %o', filename);
    }

    if (result.map) {
        const sourceMappingURL = getSourceMappingURL(cssText);
        const sourceMapFilename = sourceMappingURL
            ? path.join(path.dirname(newFilename), sourceMappingURL)
            : newFilename + '.map';
        addFile(writableFiles, sourceMapFilename, result.map.toString(), {
            otherData: dependencies,
        });
        debug('generate SourceMap: %o', sourceMapFilename);
    }
}

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
            Object.entries(targetFiles).map(async ([filename, filedata]) =>
                processFile({
                    files: { ...files },
                    writableFiles: files,
                    metalsmith,
                    options,
                    filename,
                    filedata,
                }),
            ),
        );
    });
};
