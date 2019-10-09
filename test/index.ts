import test from 'ava';
import Metalsmith from 'metalsmith';
import path from 'path';

import postcss from '../src/index';
import { processAsync } from './helpers/metalsmith';
import {
    asyncDoubler,
    doubler,
    objectDoubler,
} from './helpers/postcss-plugins';

const fixtures = path.join.bind(path, __dirname, 'fixtures');

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
    const metalsmith = Metalsmith(fixtures('postcssrc'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

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
