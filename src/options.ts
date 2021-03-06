import deepFreeze from 'deep-freeze-strict';
import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';

import { loadPlugins } from './plugins';
import { hasProp } from './utils';
import { MetalsmithStrictWritableFiles } from './utils/metalsmith';
import {
    ArrayLikeOnly,
    ArrayValue,
    isReadonlyOrWritableArray,
    NestedReadonlyArray,
} from './utils/types';

type OptionsGenerator<T> =
    | T
    | ((
          files: MetalsmithStrictWritableFiles,
          metalsmith: Metalsmith,
          defaultOptions: DefaultOptionsInterface,
      ) => T | Promise<T>);

export interface OptionsInterface {
    readonly pattern: string | ReadonlyArray<string>;
    readonly plugins: ReadonlyArray<postcss.AcceptedPlugin>;
    readonly options: Omit<postcss.ProcessOptions, 'from' | 'to'>;
    readonly renamer: (filename: string) => string;
    readonly dependenciesKey: string | false | null;
}

export interface DefaultOptionsInterface
    extends Omit<OptionsInterface, 'pattern'> {
    readonly pattern: ArrayLikeOnly<OptionsInterface['pattern']>;
}

type PluginsRecord = Readonly<Record<string, unknown>>;

export interface InputOptionsInterface
    extends Omit<OptionsInterface, 'plugins' | 'renamer'> {
    readonly plugins:
        | OptionsInterface['plugins']
        | NestedReadonlyArray<
              ArrayValue<OptionsInterface['plugins']> | string | PluginsRecord
          >
        | PluginsRecord;
    readonly renamer: OptionsInterface['renamer'] | true | false | null;
}

export type InputOptions = OptionsGenerator<
    | Partial<InputOptionsInterface>
    | ArrayLikeOnly<InputOptionsInterface['plugins']>
>;

export const defaultOptions: DefaultOptionsInterface = deepFreeze({
    pattern: ['**/*.css'],
    plugins: [],
    options: {},
    renamer(filename) {
        const newFilename =
            path.basename(filename, path.extname(filename)) + '.css';
        return path.join(path.dirname(filename), newFilename);
    },
    dependenciesKey: false,
});

export function validatePostcssOptions(
    postcssOptions: postcss.ProcessOptions,
    { type, location }: { type: string; location: string },
): void {
    const hasFrom = hasProp(postcssOptions, 'from');
    const hasTo = hasProp(postcssOptions, 'to');

    if (hasFrom && hasTo) {
        throw new Error(
            `${type} Error: Can not set "from" and "to" options in ${location}`,
        );
    } else if (hasFrom) {
        throw new Error(
            `${type} Error: Can not set "from" option in ${location}`,
        );
    } else if (hasTo) {
        throw new Error(
            `${type} Error: Can not set "to" option in ${location}`,
        );
    }
}

function normalizeRenamer(
    inputRenamer?: InputOptionsInterface['renamer'],
): OptionsInterface['renamer'] {
    return typeof inputRenamer === 'function'
        ? inputRenamer
        : inputRenamer || inputRenamer === undefined
        ? defaultOptions.renamer
        : (filename: string) => filename;
}

export async function normalizeOptions(
    files: MetalsmithStrictWritableFiles,
    metalsmith: Metalsmith,
    opts: InputOptions,
): Promise<OptionsInterface> {
    if (typeof opts === 'function') {
        opts = await opts(files, metalsmith, defaultOptions);
    }
    const partialOptions: Partial<InputOptionsInterface> = (Array.isArray as isReadonlyOrWritableArray)(
        opts,
    )
        ? { plugins: opts }
        : opts;

    if (hasProp(partialOptions, 'options')) {
        validatePostcssOptions(partialOptions.options, {
            type: 'Plugin Options',
            location: 'plugin options',
        });
    }

    return {
        ...defaultOptions,
        ...partialOptions,
        plugins: loadPlugins(partialOptions.plugins),
        renamer: normalizeRenamer(partialOptions.renamer),
    };
}
