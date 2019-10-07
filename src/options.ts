import deepFreeze from 'deep-freeze-strict';
import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';

import { isReadonlyOrWritableArray } from './utils/types';

type OptionsGenerator<T> =
    | T
    | ((
          files: Metalsmith.Files,
          metalsmith: Metalsmith,
          defaultOptions: OptionsInterface,
      ) => T | Promise<T>);

export interface OptionsInterface {
    readonly pattern: string | ReadonlyArray<string>;
    readonly plugins: ReadonlyArray<postcss.AcceptedPlugin>;
    readonly options: Omit<postcss.ProcessOptions, 'from' | 'to'>;
    readonly renamer: (filename: string) => string;
}

export type InputOptions = OptionsGenerator<
    Partial<OptionsInterface> | OptionsInterface['plugins']
>;

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
    opts: InputOptions,
): Promise<OptionsInterface> {
    if (typeof opts === 'function') {
        opts = await opts(files, metalsmith, defaultOptions);
    }
    const partialOptions: Partial<
        OptionsInterface
    > = (Array.isArray as isReadonlyOrWritableArray)(opts)
        ? { plugins: opts }
        : opts;

    return {
        ...defaultOptions,
        ...partialOptions,
    };
}
