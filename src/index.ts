import Metalsmith from 'metalsmith';
import postcss from 'postcss';

import {
    normalizeOptions,
    OptionsGenerator,
    OptionsInterface,
} from './options';
import {
    addFile,
    createPlugin,
    getMatchedFilenameList,
    getValidFiles,
} from './utils/metalsmith';
import { process } from './utils/postcss';

export = (
    opts:
        | Partial<OptionsInterface>
        | OptionsInterface['plugins']
        | OptionsGenerator = {},
): Metalsmith.Plugin => {
    return createPlugin(async (files, metalsmith) => {
        const options = await normalizeOptions(files, metalsmith, opts);
        const matchedFilenameList = getMatchedFilenameList(
            files,
            options.pattern,
        );
        const targetFiles = getValidFiles(files, matchedFilenameList);

        const processor = postcss([...options.plugins]);
        await Promise.all(
            Object.entries(targetFiles).map(async ([filename, filedata]) => {
                const newFilename = options.renamer(filename);

                const from = metalsmith.path(metalsmith.source(), filename);
                const to = metalsmith.path(
                    metalsmith.destination(),
                    newFilename,
                );

                const result = await process(processor, filedata.contents, {
                    ...options.options,
                    from,
                    to,
                });
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
