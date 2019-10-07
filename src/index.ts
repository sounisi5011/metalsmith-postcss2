import Metalsmith from 'metalsmith';
import postcss from 'postcss';

import { InputOptions, normalizeOptions } from './options';
import {
    addFile,
    createPlugin,
    getMatchedFilenameList,
    getValidFiles,
} from './utils/metalsmith';
import { loadConfig, process } from './utils/postcss';

export = (opts: InputOptions = {}): Metalsmith.Plugin => {
    return createPlugin(async (files, metalsmith) => {
        const options = await normalizeOptions(files, metalsmith, opts);
        const matchedFilenameList = getMatchedFilenameList(
            files,
            options.pattern,
        );
        const targetFiles = getValidFiles(files, matchedFilenameList);

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
                const plugins = config ? config.plugins : [...options.plugins];

                const result = await process(
                    postcss(plugins),
                    filedata.contents,
                    {
                        ...(config ? config.options : options.options),
                        from,
                        to,
                    },
                );
                if (!result) return;

                delete files[filename];
                addFile(files, newFilename, result.css, filedata);

                if (result.map) {
                    const sourceMapFilename = newFilename + '.map';
                    addFile(
                        files,
                        sourceMapFilename,
                        result.map.toString(),
                        filedata,
                    );
                }
            }),
        );
    });
};
