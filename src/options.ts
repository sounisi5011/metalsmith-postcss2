import deepFreeze from 'deep-freeze-strict';
import Metalsmith from 'metalsmith';
import path from 'path';

import { MetalsmithStrictFiles } from './utils/metalsmith';
import { AcceptedPlugin, ProcessOptions } from './utils/postcss';
import { isReadonlyOrWritableArray } from './utils/types';

type OptionsGenerator<T> =
    | T
    | ((
          files: MetalsmithStrictFiles,
          metalsmith: Metalsmith,
          defaultOptions: OptionsInterface,
      ) => T | Promise<T>);

export interface OptionsInterface {
    readonly pattern: string | ReadonlyArray<string>;
    readonly plugins: ReadonlyArray<AcceptedPlugin>;
    readonly options: Omit<ProcessOptions, 'from' | 'to'>;
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
    files: MetalsmithStrictFiles,
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
