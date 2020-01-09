import test from 'ava';
import Metalsmith from 'metalsmith';

import postcss from '../src';
import fixtures from './fixtures';
import { processAsync } from './helpers/metalsmith';
import {
    asyncDoubler,
    doubler,
    objectDoubler,
} from './helpers/postcss-plugins';

test('should transform css files', async t => {
    const metalsmith = Metalsmith(fixtures('basic'))
        .source('src')
        .use(postcss([doubler]));
    const files = await processAsync(metalsmith);

    t.is(
        files['a.css'].contents.toString('utf8'),
        'a { color: black; color: black }',
    );

    t.is(
        files['b.css'].contents.toString('utf8'),
        'b { color: blue; color: blue }',
    );

    t.is(
        files['c.css'].contents.toString('utf8'),
        'c { color: cyan; color: cyan }',
    );
});

test('should transform css files with multiple processors', async t => {
    const metalsmith = Metalsmith(fixtures('basic'))
        .source('src')
        .use(postcss([asyncDoubler, objectDoubler()]));
    const files = await processAsync(metalsmith);

    t.is(
        files['a.css'].contents.toString('utf8'),
        'a { color: black; color: black; color: black; color: black }',
    );

    t.is(
        files['b.css'].contents.toString('utf8'),
        'b { color: blue; color: blue; color: blue; color: blue }',
    );

    t.is(
        files['c.css'].contents.toString('utf8'),
        'c { color: cyan; color: cyan; color: cyan; color: cyan }',
    );
});

test('should transform css files with postcssrc files', async t => {
    // Note: postcss-load-config imports a plugins from the current working directory.
    //       The current working directory of the test files executed by AVA indicates the project root.
    //       To solve this problem, this test temporarily changes the current working directory.
    const origCwd = process.cwd();
    process.chdir(__dirname);

    const metalsmith = Metalsmith(fixtures('postcssrc'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    process.chdir(origCwd);

    t.is(
        files['a.css'].contents.toString('utf8'),
        'a { color: black; color: black }',
    );

    t.is(
        files['path/a.css'].contents.toString('utf8'),
        'a { color: black; color: black; color: black; color: black }',
    );

    t.is(
        files['path/to/a.css'].contents.toString('utf8'),
        'a { color: black; color: black; color: black; color: black }',
    );
});

test('should generate source map files', async t => {
    const metalsmith = Metalsmith(fixtures('basic'))
        .source('src')
        .use(
            postcss({
                plugins: [doubler],
                options: {
                    map: { inline: false },
                },
            }),
        );
    const files = await processAsync(metalsmith);

    t.truthy(files['a.css.map']);
    t.truthy(files['b.css.map']);
    t.truthy(files['c.css.map']);
});
