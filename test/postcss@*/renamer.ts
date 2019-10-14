import test from 'ava';
import Metalsmith from 'metalsmith';
import postcss from 'metalsmith-postcss2'; // eslint-disable-line import/no-extraneous-dependencies
import { hasProp } from 'metalsmith-postcss2/dist/utils'; // eslint-disable-line import/no-extraneous-dependencies
import util from 'util';

import fixtures from '../fixtures';
import { switchTest } from '../helpers';
import { processAsync } from '../helpers/metalsmith';

test('should rename sugarss files: not set renamer option', async t => {
    const metalsmith = Metalsmith(fixtures('sugarss'))
        .source('src')
        .use(
            postcss({
                pattern: '**/*.sss',
            }),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        hasProp(files, 'a.css'),
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        !hasProp(files, 'a.sss'),
        'should remove original SugarSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    );

    t.regex(
        files['a.css'].contents.toString('utf8'),
        /a\s*\{\s*color:\s*azure\s*\}\s*/,
        'should convert SugarSS to CSS',
    );
});

for (const renamer of [true, undefined, 42, Infinity, 'str', {}, []]) {
    test(
        'should rename sugarss files: set renamer option to ' +
            util.inspect(renamer),
        async t => {
            const metalsmith = Metalsmith(fixtures('sugarss'))
                .source('src')
                .use(
                    postcss({
                        pattern: '**/*.sss',
                        renamer:
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            renamer as any,
                    }),
                );
            const files = await processAsync(metalsmith);

            switchTest(
                hasProp(files, 'a.css'),
                'should generate CSS file',
                msg => {
                    t.pass(msg);
                },
                msg => {
                    t.fail(msg);
                    t.log(files);
                },
            )(
                !hasProp(files, 'a.sss'),
                'should remove original SugarSS file',
                msg => {
                    t.pass(msg);
                },
                msg => {
                    t.fail(msg);
                    t.log(files);
                },
            );

            t.regex(
                files['a.css'].contents.toString('utf8'),
                /a\s*\{\s*color:\s*azure\s*\}\s*/,
                'should convert SugarSS to CSS',
            );
        },
    );
}

for (const renamer of [false, null, 0, NaN, '']) {
    test(
        'should not rename sugarss files: set renamer option to ' +
            util.inspect(renamer),
        async t => {
            const metalsmith = Metalsmith(fixtures('sugarss'))
                .source('src')
                .use(
                    postcss({
                        pattern: '**/*.sss',
                        renamer:
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            renamer as any,
                    }),
                );
            const files = await processAsync(metalsmith);

            switchTest(
                !hasProp(files, 'a.css'),
                'should not generate .css file',
                msg => {
                    t.pass(msg);
                },
                msg => {
                    t.fail(msg);
                    t.log(files);
                },
            )(
                hasProp(files, 'a.sss'),
                'should not remove original SugarSS file',
                msg => {
                    t.pass(msg);
                },
                msg => {
                    t.fail(msg);
                    t.log(files);
                },
            );

            t.regex(
                files['a.sss'].contents.toString('utf8'),
                /a\s*\{\s*color:\s*azure\s*\}\s*/,
                'should convert SugarSS to CSS',
            );
        },
    );
}

test('should rename sugarss files with custom renamer', async t => {
    const metalsmith = Metalsmith(fixtures('sugarss'))
        .source('src')
        .use(
            postcss({
                pattern: '**/*.sss',
                renamer(filename) {
                    return `${filename}.css`;
                },
            }),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        hasProp(files, 'a.sss.css'),
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        !hasProp(files, 'a.sss'),
        'should remove original SugarSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    );

    t.regex(
        files['a.sss.css'].contents.toString('utf8'),
        /a\s*\{\s*color:\s*azure\s*\}\s*/,
        'should convert SugarSS to CSS',
    );
});
