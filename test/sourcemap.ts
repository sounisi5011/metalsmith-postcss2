import test from 'ava';
import Metalsmith from 'metalsmith';
import sass from 'metalsmith-sass';
import path from 'path';

import { processAsync } from './helpers/metalsmith';
import { doubler } from './helpers/postcss-plugins';
import { isValidSourceMap } from './helpers/source-map';
import postcss = require('../src/index');

const fixtures = path.join.bind(path, __dirname, 'fixtures');

test('should merge multi-level SourceMap', async t => {
    const metalsmith = Metalsmith(fixtures('sass'))
        .source('src')
        .use(
            sass({
                sourceMap: true,
                sourceMapContents: true,
            }),
        )
        .use(
            postcss({
                plugins: [doubler],
                options: {
                    map: { inline: false },
                },
            }),
        );
    const files = await processAsync(metalsmith);

    t.truthy(files['a.css.map'], 'should generate SourceMap file');

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(files['a.css.map'].contents.toString());
    }, 'should parse SourceMap file');

    if (
        isValidSourceMap(sourceMap) &&
        sourceMap.sources.includes('../src/a.sass')
    ) {
        t.pass('should include the SASS filename in sources property');
    } else {
        t.fail('should include the SASS filename in sources property');
        t.log(sourceMap);
    }
});
