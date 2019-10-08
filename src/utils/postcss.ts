import path from 'path';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';

interface PostcssrcCtx
    extends Omit<postcss.ProcessOptions, 'parser' | 'syntax' | 'stringifier'> {
    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/index.js#L47-L56
     */
    cwd?: string;
    env?: string;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/index.js#L28-L30
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L45-L55
     */
    plugins?: postcss.AcceptedPlugin[] | Record<string, unknown>;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/options.js#L15-L45
     */
    parser?: string | postcss.ProcessOptions['parser'];
    syntax?: string | postcss.ProcessOptions['syntax'];
    stringifier?: string | postcss.ProcessOptions['stringifier'];

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

export async function loadConfig({
    options,
    sourceFilepath,
}: {
    options: postcss.ProcessOptions;
    sourceFilepath: string;
}): Promise<ConfigResult | null> {
    /**
     * @see https://github.com/postcss/postcss-cli/blob/6.1.3/index.js#L166-L187
     */
    const ctx: PostcssrcCtx = {
        options,
        file: {
            dirname: path.dirname(sourceFilepath),
            basename: path.basename(sourceFilepath),
            extname: path.extname(sourceFilepath),
        },
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
    processor: postcss.Processor,
    ...[css, opts]: Parameters<postcss.Processor['process']>
): Promise<postcss.Result | void> {
    try {
        const result = await processor.process(css, opts);

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
