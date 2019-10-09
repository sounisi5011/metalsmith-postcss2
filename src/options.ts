import deepFreeze from 'deep-freeze-strict';
import Metalsmith from 'metalsmith';
import path from 'path';

import { hasProp } from './utils';
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

export interface InputOptionsInterface
    extends Omit<OptionsInterface, 'renamer'> {
    readonly renamer: OptionsInterface['renamer'] | true | false | null;
}

export type InputOptions = OptionsGenerator<
    Partial<InputOptionsInterface> | InputOptionsInterface['plugins']
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
        InputOptionsInterface
    > = (Array.isArray as isReadonlyOrWritableArray)(opts)
        ? { plugins: opts }
        : opts;

    if (hasProp(partialOptions, 'options')) {
        const postcssOptions = partialOptions.options;
        const foundOptionList: string[] = [];

        for (const optionProp of ['from', 'to']) {
            if (hasProp(postcssOptions, optionProp)) {
                foundOptionList.push(`"${optionProp}"`);
            }
        }

        if (foundOptionList.length > 0) {
            throw new Error(
                'Plugin Options Error: Can not set ' +
                    foundOptionList.join(' and ') +
                    ` ${foundOptionList.length > 1 ? 'options' : 'option'}` +
                    ' in plugin options',
            );
        }
    }

    const inputRenamer = partialOptions.renamer;
    const renamer =
        typeof inputRenamer === 'function'
            ? inputRenamer
            : inputRenamer || inputRenamer === undefined
            ? defaultOptions.renamer
            : (filename: string) => filename;

    return {
        ...defaultOptions,
        ...partialOptions,
        renamer,
    };
}
