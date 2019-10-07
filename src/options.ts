import deepFreeze from 'deep-freeze-strict';
import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';

import { isReadonlyOrWritableArray } from './utils/types';

export interface OptionsInterface {
    readonly pattern: string | ReadonlyArray<string>;
    readonly plugins: ReadonlyArray<postcss.AcceptedPlugin>;
    readonly options: Omit<postcss.ProcessOptions, 'from' | 'to'>;
    readonly renamer: (filename: string) => string;
}

export interface OptionsGenerator {
    (
        files: Metalsmith.Files,
        metalsmith: Metalsmith,
        defaultOptions: OptionsInterface,
    ): Partial<OptionsInterface> | Promise<Partial<OptionsInterface>>;
}

const defaultOptions: OptionsInterface = deepFreeze({
    pattern: ['**/*.css'],
    plugins: [],
    options: {},
    renamer(filename) {
        const newFilename =
            path.basename(filename, path.extname(filename)) + '.css';
        return path.join(path.dirname(filename), newFilename);
    },
});

export async function normalizeOptions(
    files: Metalsmith.Files,
    metalsmith: Metalsmith,
    opts:
        | Partial<OptionsInterface>
        | OptionsInterface['plugins']
        | OptionsGenerator,
): Promise<OptionsInterface> {
    const partialOptions: Partial<OptionsInterface> =
        typeof opts === 'function'
            ? await opts(files, metalsmith, defaultOptions)
            : (Array.isArray as isReadonlyOrWritableArray)(opts)
            ? { plugins: opts }
            : opts;
    return {
        ...defaultOptions,
        ...partialOptions,
    };
}
