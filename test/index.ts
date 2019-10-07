import test from 'ava';
import Metalsmith from 'metalsmith';
import path from 'path';

import { processAsync } from './helpers/metalsmith';
import {
    asyncDoubler,
    doubler,
    objectDoubler,
} from './helpers/postcss-plugins';
import postcss = require('../src/index');

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
