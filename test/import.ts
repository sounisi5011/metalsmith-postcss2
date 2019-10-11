import test from 'ava';
import Metalsmith from 'metalsmith';
import path from 'path';

import postcss from '../src/index';
import { switchTest } from './helpers';
import { debuggerPlugin, processAsync } from './helpers/metalsmith';

const fixtures = path.join.bind(path, __dirname, 'fixtures');

test('should transform css files', async t => {
    const metalsmith = Metalsmith(fixtures('import'))
        .source('src')
        .use(
            postcss((_files, _metalsmith, defaultOptions) => ({
                pattern: ([] as string[]).concat(
                    defaultOptions.pattern,
                    '!**/_*',
                    '!**/_*/**',
                ),
            })),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        files['main.css'],
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    );

    t.regex(
        files['main.css'].contents.toString(),
        /^(?:\/\*(?:(?!\*\/)[\s\S])*\*\/|\s+)*\.bold\s*\{\s*font-weight:\s*bold\s*(?:;\s*)?\}\s*(?:\/\*(?:(?!\*\/)[\s\S])*\*\/|\s+)*body\s*\{\s*margin:\s*0\s*(?:;\s*)?\}\s*$/,
    );
});

test('should transform css files with deps', async t => {
    const dependenciesKey = 'deps';
    let beforeFiles: Metalsmith.Files = {};
    const metalsmith = Metalsmith(fixtures('import'))
        .source('src')
        .use(
            debuggerPlugin(files => {
                beforeFiles = { ...files };
            }),
        )
        .use(
            postcss((_files, _metalsmith, defaultOptions) => ({
                pattern: ([] as string[]).concat(
                    defaultOptions.pattern,
                    '!**/_*',
                    '!**/_*/**',
                ),
                dependenciesKey,
            })),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        files['main.css'],
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        files['main.css'][dependenciesKey],
        `should have "${dependenciesKey}" property in CSS file data`,
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files['main.css']);
        },
    );

    t.deepEqual(
        Object.keys(files['main.css'][dependenciesKey]).sort(),
        ['main.css', '_sub.css', '_mod.css', 'dir/_child.css'].sort(),
    );
    t.is(Object.keys(files['main.css'][dependenciesKey])[0], 'main.css');

    t.is(
        files['main.css'][dependenciesKey]['main.css'],
        beforeFiles['main.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_sub.css'],
        beforeFiles['_sub.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_mod.css'],
        beforeFiles['_mod.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['dir/_child.css'],
        beforeFiles['dir/_child.css'],
    );
});

test('should transform css files with deps and SourceMap', async t => {
    const dependenciesKey = 'deps';
    let beforeFiles: Metalsmith.Files = {};
    const metalsmith = Metalsmith(fixtures('import'))
        .source('src')
        .use(
            debuggerPlugin(files => {
                beforeFiles = { ...files };
            }),
        )
        .use(
            postcss((_files, _metalsmith, defaultOptions) => ({
                pattern: ([] as string[]).concat(
                    defaultOptions.pattern,
                    '!**/_*',
                    '!**/_*/**',
                ),
                options: {
                    map: { inline: false },
                },
                dependenciesKey,
            })),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        files['main.css'],
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        files['main.css'][dependenciesKey],
        `should have "${dependenciesKey}" property in CSS file data`,
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files['main.css']);
        },
    )(
        files['main.css.map'],
        'should generate SourceMap file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        files['main.css.map'][dependenciesKey],
        `should have "${dependenciesKey}" property in SourceMap file data`,
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files['main.css.map']);
        },
    );

    t.deepEqual(
        Object.keys(files['main.css'][dependenciesKey]).sort(),
        ['main.css', '_sub.css', '_mod.css', 'dir/_child.css'].sort(),
    );
    t.is(Object.keys(files['main.css'][dependenciesKey])[0], 'main.css');

    t.is(
        files['main.css'][dependenciesKey]['main.css'],
        beforeFiles['main.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_sub.css'],
        beforeFiles['_sub.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_mod.css'],
        beforeFiles['_mod.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['dir/_child.css'],
        beforeFiles['dir/_child.css'],
    );

    t.deepEqual(
        Object.keys(files['main.css.map'][dependenciesKey]).sort(),
        ['main.css', '_sub.css', '_mod.css', 'dir/_child.css'].sort(),
    );
    t.is(Object.keys(files['main.css.map'][dependenciesKey])[0], 'main.css');

    t.is(
        files['main.css.map'][dependenciesKey]['main.css'],
        beforeFiles['main.css'],
    );
    t.is(
        files['main.css.map'][dependenciesKey]['_sub.css'],
        beforeFiles['_sub.css'],
    );
    t.is(
        files['main.css.map'][dependenciesKey]['_mod.css'],
        beforeFiles['_mod.css'],
    );
    t.is(
        files['main.css.map'][dependenciesKey]['dir/_child.css'],
        beforeFiles['dir/_child.css'],
    );
});

test('should transform css files with deps and forget ignore pattern', async t => {
    const dependenciesKey = 'deps';
    let beforeFiles: Metalsmith.Files = {};
    const metalsmith = Metalsmith(fixtures('import'))
        .source('src')
        .use(
            debuggerPlugin(files => {
                beforeFiles = { ...files };
            }),
        )
        .use(
            postcss({
                dependenciesKey,
            }),
        );
    const files = await processAsync(metalsmith);

    switchTest(
        files['main.css'],
        'should generate CSS file',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files);
        },
    )(
        files['main.css'][dependenciesKey],
        `should have "${dependenciesKey}" property in CSS file data`,
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(files['main.css']);
        },
    );

    t.deepEqual(
        Object.keys(files['main.css'][dependenciesKey]).sort(),
        ['main.css', '_sub.css', '_mod.css', 'dir/_child.css'].sort(),
    );
    t.is(Object.keys(files['main.css'][dependenciesKey])[0], 'main.css');

    t.is(
        files['main.css'][dependenciesKey]['main.css'],
        beforeFiles['main.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_sub.css'],
        beforeFiles['_sub.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['_mod.css'],
        beforeFiles['_mod.css'],
    );
    t.is(
        files['main.css'][dependenciesKey]['dir/_child.css'],
        beforeFiles['dir/_child.css'],
    );
});
