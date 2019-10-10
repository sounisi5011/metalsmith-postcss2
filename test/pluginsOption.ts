import test from 'ava';
import Metalsmith from 'metalsmith';
import path from 'path';
import util from 'util';

import { normalizeOptions } from '../src/options';

test.before(() => {
    process.chdir(path.join(__dirname, 'fixtures', 'plugins'));
});

test('should to import plugin files by string array', async t => {
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
    test(`should to import plugin file with ${util.inspect(opts)}`, async t => {
        const pluginRecord = {
            './plugin-01': opts,
        };

        const cwd = process.cwd();
        const options = await normalizeOptions({}, Metalsmith(__dirname), {
            plugins: pluginRecord,
        });

        t.deepEqual(
            options.plugins,
            Object.entries(pluginRecord).map(([pluginPath, pluginOptions]) =>
                // Note: In order to avoid the side effects of esModuleInterop, require() is used.
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require(path.join(cwd, pluginPath))(pluginOptions),
            ),
        );
    });
}

for (const opts of [
    true,
    false,
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
]) {
    test(`should to import plugin file with ${util.inspect(opts)}`, async t => {
        const pluginRecord = {
            './plugin-01': opts,
        };

        const cwd = process.cwd();
        const options = await normalizeOptions({}, Metalsmith(__dirname), {
            plugins: pluginRecord,
        });

        t.deepEqual(
            options.plugins,
            opts !== false
                ? Object.keys(pluginRecord).map(pluginPath =>
                      require(path.join(cwd, pluginPath)),
                  )
                : [],
        );
    });
}

test('should to import plugin files by plain object', async t => {
    const pluginRecord = {
        './plugin-01': { x: 42 },
        './plugin-02': { y: 51 },
    };

    const cwd = process.cwd();
    const options = await normalizeOptions({}, Metalsmith(__dirname), {
        plugins: pluginRecord,
    });

    t.deepEqual(
        options.plugins,
        Object.entries(pluginRecord).map(([pluginPath, pluginOptions]) =>
            // Note: In order to avoid the side effects of esModuleInterop, require() is used.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(path.join(cwd, pluginPath))(pluginOptions),
        ),
    );
});

test('should to import plugin files by plain object array', async t => {
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
        options.plugins,
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

test('import of non-existent script file should fail', async t => {
    await t.throwsAsync(
        async () => {
            await normalizeOptions({}, Metalsmith(__dirname), {
                plugins: ['./not-found-plugin'],
            });
        },
        {
            instanceOf: TypeError,
            message: /^Loading PostCSS Plugin failed(?:\W|$)/,
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
            instanceOf: TypeError,
            message: /^Loading PostCSS Plugin failed(?:\W|$)/,
        },
    );
});
