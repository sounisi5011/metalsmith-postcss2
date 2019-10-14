import test from 'ava';
import cloneDeep from 'lodash.clonedeep';
import Metalsmith from 'metalsmith';
import postcss from 'metalsmith-postcss2'; // eslint-disable-line import/no-extraneous-dependencies
import path from 'path';

import { ignoreTypeError } from '../helpers';
import { processAsync } from '../helpers/metalsmith';
import { doubler } from '../helpers/postcss-plugins';

const fixtures = path.join.bind(path, __dirname, '..', 'fixtures');

test('defaultOptions cannot be changed', async t => {
    const metalsmith = Metalsmith(fixtures('basic'))
        .source('src')
        .use(
            postcss(async (_files, _metalsmith, defaultOptions) => {
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
                    Object.assign(defaultOptions, { pattern: '**/.sss' });
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
            }),
        );
    await processAsync(metalsmith);
});
