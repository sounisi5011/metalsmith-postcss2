import Metalsmith from 'metalsmith';
import path from 'path';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';

import { isObject } from '.';

/**
 * When JSON or YAML postcssrc config file is specified, the contents of postcssrc are overwritten with the ctx argument.
 * To prevent the risk of overwriting postcssrc settings, this interface makes the properties expected by postcss-load-config non-overridable.
 * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/index.js#L25
 */
interface ProtectPostcssrcCtx
    extends Partial<Record<keyof postcss.ProcessOptions, never>> {
    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/index.js#L47-L56
     */
    cwd?: never;
    env?: never;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/index.js#L28-L30
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L45-L55
     */
    plugins?: never;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/options.js#L15-L45
     */
    parser?: never;
    syntax?: never;
    stringifier?: never;

    [other: string]: unknown;
}

/**
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/f396262330cd60f0483db8ebd7aa54e86cd254d6/types/postcss-load-config/index.d.ts#L35-L39
 */
export interface ConfigResult {
    file: string;
    options: postcss.ProcessOptions;
    plugins: postcss.AcceptedPlugin[];
}

export function isCssSyntaxError(
    error: Error,
): error is postcss.CssSyntaxError {
    return error.name === 'CssSyntaxError';
}

let ProcessorConstructor: Function | void;

function isProcessor(value: unknown): value is postcss.Processor {
    if (!ProcessorConstructor) {
        ProcessorConstructor = postcss().constructor;
    }
    return value instanceof ProcessorConstructor;
}

function isTransformerOrProcessor(
    value: unknown,
): value is postcss.Processor | postcss.TransformCallback {
    if (typeof value === 'function') {
        return true;
    }

    if (isProcessor(value)) {
        return true;
    }

    return false;
}

function isPluginObj(
    value: unknown,
): value is { postcss: postcss.Processor | postcss.TransformCallback } {
    if (!isObject(value)) {
        return false;
    }

    const keys = Object.keys(value);
    return (
        keys.length === 1 &&
        value[0] === 'postcss' &&
        isTransformerOrProcessor(value.postcss)
    );
}

export function isAcceptedPlugin(
    value: unknown,
): value is postcss.AcceptedPlugin {
    if (isTransformerOrProcessor(value)) {
        return true;
    }

    if (typeof value === 'object' && value) {
        if (isPluginObj(value)) {
            return true;
        }
    }

    return false;
}

export async function loadConfig({
    plugins,
    options,
    sourceFilepath,
    metalsmith,
}: {
    plugins: ReadonlyArray<postcss.AcceptedPlugin>;
    options: postcss.ProcessOptions;
    sourceFilepath: string;
    metalsmith: Metalsmith;
}): Promise<ConfigResult | null> {
    /**
     * @see https://github.com/postcss/postcss-cli/blob/6.1.3/index.js#L166-L187
     */
    const ctx: ProtectPostcssrcCtx = {
        options,
        file: {
            dirname: path.dirname(sourceFilepath),
            basename: path.basename(sourceFilepath),
            extname: path.extname(sourceFilepath),
        },
        pluginsList: [...plugins],
        metalsmith,
    };

    try {
        return await postcssrc(ctx, path.dirname(sourceFilepath));
    } catch (error) {
        if (/^No PostCSS Config found(?:\s|$)/.test(error.message)) {
            return null;
        }

        throw error;
    }
}

export async function processCSS(
    plugins: postcss.AcceptedPlugin[],
    ...[css, opts]: Parameters<postcss.Processor['process']>
): Promise<postcss.Result | void> {
    try {
        const result = await postcss(plugins).process(css, opts);

        result.warnings().forEach(warn => {
            console.error(warn.toString());
        });

        return result;
    } catch (error) {
        if (isCssSyntaxError(error)) {
            console.error(error.message + error.showSourceCode());
        } else {
            throw error;
        }
    }
}
