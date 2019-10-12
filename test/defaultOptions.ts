import test from 'ava';
import cloneDeep from 'lodash.clonedeep';
import Metalsmith from 'metalsmith';
import path from 'path';

import { ignoreTypeError } from './helpers';
import localPlugins from './helpers/localPlugins';
import { processAsync } from './helpers/metalsmith';
import { doubler } from './helpers/postcss-plugins';

const fixtures = path.join.bind(path, __dirname, 'fixtures');

for (const { postcssLocalPlugin, testNameSuffix } of localPlugins) {
    test(`defaultOptions cannot be changed ${testNameSuffix}`, async t => {
        const metalsmith = Metalsmith(fixtures('basic'))
            .source('src')
            .use(
                postcssLocalPlugin(
                    async (_files, _metalsmith, defaultOptions) => {
                        const originalOptions = cloneDeep(defaultOptions);

                        ignoreTypeError(() => {
                            Object.assign(defaultOptions, { hoge: 'fuga' });
                        });
                        t.deepEqual(
                            defaultOptions,
                            originalOptions,
                            'Properties cannot be added',
                        );

                        ignoreTypeError(() => {
                            Object.assign(defaultOptions, {
                                pattern: '**/.sss',
                            });
                        });
                        t.deepEqual(
                            defaultOptions,
                            originalOptions,
                            'Properties cannot be changed',
                        );

                        ignoreTypeError(() => {
                            defaultOptions.options.map = true;
                        });
                        t.deepEqual(
                            defaultOptions,
                            originalOptions,
                            'Child properties cannot be changed',
                        );

                        // disable PostCSS warning
                        return [doubler];
                    },
                ),
            );
        await processAsync(metalsmith);
    });
}
