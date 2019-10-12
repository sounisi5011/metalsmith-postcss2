import test from 'ava';
import Metalsmith from 'metalsmith';
import path from 'path';

import localPlugins from './helpers/localPlugins';
import { processAsync } from './helpers/metalsmith';

const fixtures = path.join.bind(path, __dirname, 'fixtures');

for (const { postcssLocalPlugin, testNameSuffix } of localPlugins) {
    test(`should throw error if set "from" option: plugin options ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('sugarss'))
            .source('src')
            .use(
                postcssLocalPlugin({
                    options: { from: 'path/to/src.css' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                }),
            );

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "from" option in plugin options/,
        });
    });

    test(`should throw error if set "from" option: config file ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('options-from'))
            .source('src')
            .use(postcssLocalPlugin());

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "from" option in config file/,
        });
    });

    test(`should throw error if set "to" option: plugin options ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('sugarss'))
            .source('src')
            .use(
                postcssLocalPlugin({
                    options: { to: 'path/to/dest.css' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                }),
            );

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "to" option in plugin options/,
        });
    });

    test(`should throw error if set "to" option: config file ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('options-to'))
            .source('src')
            .use(postcssLocalPlugin());

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "to" option in config file/,
        });
    });

    test(`should throw error if set "from" and "to" options: plugin options ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('sugarss'))
            .source('src')
            .use(
                postcssLocalPlugin({
                    options: {
                        from: 'path/to/src.css',
                        to: 'path/to/dest.css',
                    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                }),
            );

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "from" and "to" options in plugin options/,
        });
    });

    test(`should throw error if set "from" and "to" options: config file ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('options-from-and-to'))
            .source('src')
            .use(postcssLocalPlugin());

        await t.throwsAsync(processAsync(metalsmith), {
            message: /Can not set "from" and "to" options in config file/,
        });
    });
}
