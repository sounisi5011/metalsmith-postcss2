import createDebug from 'debug';
import Metalsmith from 'metalsmith';
import path from 'path';

import { InputOptions, normalizeOptions, OptionsInterface } from './options';
import { hasProp } from './utils';
import {
    addFile,
    createPlugin,
    FileInterface,
    getMatchedFilenameList,
    getValidFiles,
    MetalsmithStrictFiles,
} from './utils/metalsmith';
import { loadConfig, processCSS, ProcessOptions } from './utils/postcss';
import { findSourceMapFile, getSourceMappingURL } from './utils/source-map';

const debug = createDebug(require('../package.json').name);
const debugPostcssrc = debug.extend('postcssrc');

function updatePostcssOption(
    options: ProcessOptions,
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
): ProcessOptions & Required<Pick<ProcessOptions, 'from' | 'to'>> {
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
            postcssOptions.map =
                postcssMapOption === true
                    ? { prev }
                    : { prev, ...postcssMapOption };
        }
    }

    return postcssOptions;
}

async function processFile({
    files,
    metalsmith,
    options,
    filename,
    filedata,
}: {
    files: MetalsmithStrictFiles;
    metalsmith: Metalsmith;
    options: OptionsInterface;
    filename: string;
    filedata: FileInterface;
}): Promise<void> {
    const newFilename = options.renamer(filename);

    const from = metalsmith.path(metalsmith.source(), filename);
    const to = metalsmith.path(metalsmith.destination(), newFilename);
    const postcssOptions = updatePostcssOption(options.options, {
        from,
        to,
        files,
        filename,
        metalsmith,
    });
    const config = await loadConfig({
        options: postcssOptions,
        sourceFilepath: from,
        metalsmith,
    });
    if (config) {
        debugPostcssrc(
            'loaded postcss config by file %o: %o',
            filename,
            path.relative(process.cwd(), config.file),
        );
    }
    const plugins = config ? config.plugins : [...options.plugins];

    const result = await processCSS(
        plugins,
        filedata.contents,
        updatePostcssOption(config ? config.options : postcssOptions, {
            from,
            to,
            files,
            filename,
            metalsmith,
        }),
    );
    if (!result) return;

    const cssText = result.css;
    addFile(files, newFilename, cssText, filedata);
    if (filename !== newFilename) {
        debug('done process %o, renamed to %o', filename, newFilename);
        delete files[filename];
        debug('file deleted: %o', filename);
    } else {
        debug('done process %o', filename);
    }

    if (result.map) {
        const sourceMappingURL = getSourceMappingURL(cssText);
        const sourceMapFilename = sourceMappingURL
            ? path.join(path.dirname(newFilename), sourceMappingURL)
            : newFilename + '.map';
        addFile(files, sourceMapFilename, result.map.toString());
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
                processFile({ files, metalsmith, options, filename, filedata }),
            ),
        );
    });
};
