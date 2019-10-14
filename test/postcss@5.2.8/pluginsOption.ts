import test from 'ava';
import Metalsmith from 'metalsmith';
import { normalizeOptions } from 'metalsmith-postcss2/dist/options'; // eslint-disable-line import/no-extraneous-dependencies
import { AcceptedPlugin } from 'metalsmith-postcss2/dist/utils/postcss'; // eslint-disable-line import/no-extraneous-dependencies
import path from 'path';
import util from 'util';

import { isArray } from '../helpers';

async function execPlugins(
    plugins: ReadonlyArray<AcceptedPlugin>,
): Promise<unknown[]> {
    const list: unknown[] = [];

    for (const plugin of plugins) {
        if (typeof plugin === 'function') {
            list.push(
                plugin.length === 2
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await plugin({} as any, {} as any)
                    : plugin,
            );
        }
    }

    return list;
}

async function execPluginRecord(
    pluginRecord: Record<string, unknown>,
): Promise<unknown[]> {
    const cwd = process.cwd();

    return execPlugins(
        Object.entries(pluginRecord).map(([pluginPath, pluginOptions]) =>
            // Note: In order to avoid the side effects of esModuleInterop, require() is used.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(path.join(cwd, pluginPath))(pluginOptions),
        ),
    );
}

async function execPluginDefList(
    pluginDefList: ReadonlyArray<
        string | AcceptedPlugin | readonly [string, unknown]
    >,
): Promise<unknown[]> {
    const list: unknown[] = [];
    const cwd = process.cwd();

    for (const pluginDef of pluginDefList) {
        list.push(
            ...(await (typeof pluginDef === 'string'
                ? [require(path.join(cwd, pluginDef))]
                : isArray(pluginDef)
                ? execPluginRecord({ [pluginDef[0]]: pluginDef[1] })
                : execPlugins([pluginDef]))),
        );
    }

    return list;
}

test.before(() => {
    process.chdir(path.join(__dirname, '..', 'fixtures', 'plugins'));
});

test('should import plugin files by string array', async t => {
    const pluginPathList = ['./plugin-01', './plugin-02'];

    const cwd = process.cwd();
    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: pluginPathList,
    });

    t.deepEqual(
        options.plugins,
        pluginPathList.map(pluginPath => require(path.join(cwd, pluginPath))),
    );
});

for (const opts of [{ x: 42 }]) {
    test(`should import and execute plugin file with option ${util.inspect(
        opts,
    )}`, async t => {
        const pluginRecord = {
            './plugin-01': opts,
        };

        const options = await normalizeOptions({}, Metalsmith(__dirname), {
            plugins: pluginRecord,
        });

        t.deepEqual(
            await execPlugins(options.plugins),
            await execPluginRecord(pluginRecord),
        );
    });
}

for (const opts of [
    true,
    null,
    undefined,
    0,
    1,
    NaN,
    Infinity,
    '',
    'str',
    Symbol('sym'),
    [],
    {},
    () => {},
    async () => {},
]) {
    test(`should import plugin file with option ${util.inspect(
        opts,
    )}`, async t => {
        const pluginRecord = {
            './plugin-01': opts,
        };

        const cwd = process.cwd();
        const options = await normalizeOptions({}, Metalsmith(__dirname), {
            plugins: pluginRecord,
        });

        t.deepEqual(
            options.plugins,
            Object.keys(pluginRecord).map(pluginPath =>
                require(path.join(cwd, pluginPath)),
            ),
        );
    });
}

test('should ignore import plugin file with false option', async t => {
    const pluginRecord = {
        './plugin-01': false,
    };

    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: pluginRecord,
    });

    t.deepEqual(options.plugins, []);
});

test('should import and execute plugin files by plain object', async t => {
    const pluginRecord = {
        './plugin-01': { x: 42 },
        './plugin-02': { y: 51 },
    };

    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: pluginRecord,
    });

    t.deepEqual(
        await execPlugins(options.plugins),
        await execPluginRecord(pluginRecord),
    );
});

test('should import and execute plugin files by plain object array', async t => {
    const opt1 = { x: 42 };
    const opt2 = { y: 51 };

    const cwd = process.cwd();
    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: [
            { './plugin-01': opt1 },
            { './plugin-02': opt2, './plugin-01': opt1 },
            { './plugin-02': opt1 },
        ],
    });

    t.deepEqual(
        await execPlugins(options.plugins),
        await execPlugins(
            ([
                ['./plugin-01', opt1],
                ['./plugin-02', opt2],
                ['./plugin-01', opt1],
                ['./plugin-02', opt1],
            ] as [string, typeof opt1 | typeof opt2][]).map(
                ([pluginPath, pluginOptions]) =>
                    // Note: In order to avoid the side effects of esModuleInterop, require() is used.
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    require(path.join(cwd, pluginPath))(pluginOptions),
            ),
        ),
    );
});

test('should pass the plugin function array to the options value', async t => {
    const plugin1 = (): void => {};
    const plugin2 = async (): Promise<void> => {};
    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: [plugin1, plugin2],
    });

    t.deepEqual(options.plugins, [plugin1, plugin2]);
});

test('should import and execute plugin files by recursive array', async t => {
    const opt1 = { x: 42 };
    const opt2 = { y: 51 };
    const plugin1 = (): string => 'plugin1';

    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: [
            plugin1,
            './plugin-01',
            { './plugin-01': opt1 },
            [
                plugin1,
                './plugin-01',
                { './plugin-01': opt2 },
                [[{ './plugin-01': opt2 }]],
            ],
            [
                [[[plugin1, plugin1, [[[{ './plugin-02': opt1 }]]]]]],
                './plugin-02',
            ],
        ],
    });

    t.deepEqual(
        await execPlugins(options.plugins),
        await execPluginDefList([
            plugin1,
            './plugin-01',
            ['./plugin-01', opt1],
            plugin1,
            './plugin-01',
            ['./plugin-01', opt2],
            ['./plugin-01', opt2],
            plugin1,
            plugin1,
            ['./plugin-02', opt1],
            './plugin-02',
        ]),
    );
});

test('import of non-existent script file should fail', async t => {
    await t.throwsAsync(
        async () => {
            await normalizeOptions({}, Metalsmith(__dirname), {
                plugins: ['./not-found-plugin'],
            });
        },
        {
            instanceOf: Error,
            message: /^Loading PostCSS Plugin failed(?:\W|$)/,
        },
    );
});

test('import of script files that do not export functions should fail: with plugin options', async t => {
    await t.throwsAsync(
        async () => {
            await normalizeOptions({}, Metalsmith(__dirname), {
                plugins: { './no-func-plugin': { x: 542 } },
            });
        },
        {
            instanceOf: TypeError,
            message: /^Loading PostCSS Plugin failed: Module does not export function(?:\W|$)/,
        },
    );
});

test('import of script files that do not export functions should success: without plugin options', async t => {
    await t.notThrowsAsync(async () => {
        await normalizeOptions({}, Metalsmith(__dirname), {
            plugins: ['./no-func-plugin'],
        });
    });
});

test('import of script files that do not export PostCSS Plugin should fail', async t => {
    await t.throwsAsync(
        async () => {
            await normalizeOptions({}, Metalsmith(__dirname), {
                plugins: [
                    [
                        { any: false },
                        [
                            {
                                './invalid-return-plugin': {},
                            },
                        ],
                    ],
                ],
            });
        },
        {
            instanceOf: TypeError,
            message: /^Invalid PostCSS Plugin found at: plugins\[0\]\[1\]\[0\]\['\.\/invalid-return-plugin'\](?:(?!\[|\.\w)\W|$)/,
        },
    );
});

test('If the plugin name does not start with "." and "/", should to import it like require() function', async t => {
    await t.throwsAsync(
        async () => {
            await normalizeOptions({}, Metalsmith(__dirname), {
                plugins: ['@sounisi5011/example'],
            });
        },
        {
            instanceOf: Error,
            message: /^Loading PostCSS Plugin failed(?:\W|$)/,
        },
    );
});
