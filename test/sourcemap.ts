import test from 'ava';
import Metalsmith from 'metalsmith';
import sass from 'metalsmith-sass';
import path from 'path';

import postcss from '../src/index';
import { hasProp } from '../src/utils';
import { debuggerPlugin, processAsync } from './helpers/metalsmith';
import { doubler } from './helpers/postcss-plugins';
import {
    getSourceMappingURLType,
    isValidSourceMap,
    readInlineSourceMap,
    readSourceMapURL,
} from './helpers/source-map';

const fixtures = path.join.bind(path, __dirname, 'fixtures');

test('should generate multi-level SourceMap file', async t => {
    const metalsmith = Metalsmith(fixtures('sass'))
        .source('src')
        .use(
            sass({
                sourceMap: true,
                sourceMapContents: true,
            }),
        )
        .use(
            debuggerPlugin(files => {
                t.is(
                    getSourceMappingURLType(files['a.css'].contents),
                    'file',
                    'should exists SourceMap file comment by metalsmith-sass',
                );
                t.truthy(
                    files['a.css.map'],
                    'should generate SourceMap file by metalsmith-sass',
                );
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
    t.is(
        getSourceMappingURLType(files['a.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

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

test('should not generate multi-level SourceMap file: Manually override the map.prev option', async t => {
    const metalsmith = Metalsmith(fixtures('sass'))
        .source('src')
        .use(
            sass({
                sourceMap: true,
                sourceMapContents: true,
            }),
        )
        .use(
            debuggerPlugin(files => {
                t.is(
                    getSourceMappingURLType(files['a.css'].contents),
                    'file',
                    'should exists SourceMap file comment by metalsmith-sass',
                );
                t.truthy(
                    files['a.css.map'],
                    'should generate SourceMap file by metalsmith-sass',
                );
            }),
        )
        .use(
            postcss({
                plugins: [doubler],
                options: {
                    map: { inline: false, prev: false },
                },
            }),
        );
    const files = await processAsync(metalsmith);

    t.truthy(files['a.css.map'], 'should generate SourceMap file');
    t.is(
        getSourceMappingURLType(files['a.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(files['a.css.map'].contents.toString());
    }, 'should parse SourceMap file');

    if (
        isValidSourceMap(sourceMap) &&
        !sourceMap.sources.includes('../src/a.sass')
    ) {
        t.pass('should not include the SASS filename in sources property');
    } else {
        t.fail('should not include the SASS filename in sources property');
        t.log(sourceMap);
    }
});

test('should generate multi-level SourceMap file: previous process generates inline SourceMap', async t => {
    const metalsmith = Metalsmith(fixtures('sass'))
        .source('src')
        .use(
            sass({
                sourceMap: true,
                sourceMapContents: true,
                sourceMapEmbed: true,
            }),
        )
        .use(
            debuggerPlugin(files => {
                t.is(
                    getSourceMappingURLType(files['a.css'].contents),
                    'inline',
                    'should exists inline SourceMap by metalsmith-sass',
                );
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
    t.is(
        getSourceMappingURLType(files['a.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

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

test('should generate multi-level inline SourceMap', async t => {
    const metalsmith = Metalsmith(fixtures('sass'))
        .source('src')
        .use(
            sass({
                sourceMap: true,
                sourceMapContents: true,
                sourceMapEmbed: true,
            }),
        )
        .use(
            postcss({
                plugins: [doubler],
                options: {
                    map: true,
                },
            }),
        );
    const files = await processAsync(metalsmith);

    const inlineSourceMapText = readInlineSourceMap(files['a.css'].contents);
    if (typeof inlineSourceMapText !== 'string') {
        t.fail('should exists inline SourceMap');
        t.log(files['a.css'].contents.toString());
        return;
    }

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(inlineSourceMapText);
    }, 'should parse inline SourceMap');

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

for (const options of [{ map: false }, { map: undefined }, {}]) {
    test(`should not generate SourceMap: ${
        hasProp(options, 'map') ? options.map : 'not set map property'
    }`, async t => {
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
                    options,
                }),
            );
        const files = await processAsync(metalsmith);

        t.is(
            getSourceMappingURLType(files['a.css'].contents),
            null,
            'should not exists SourceMap comment',
        );
    });
}

test('should change SourceMap file location', async t => {
    const metalsmith = Metalsmith(fixtures('change-source-map-path'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.truthy(
        files['.sourcemap.css/a.map'],
        'should generate SourceMap file in customized location',
    );
    t.truthy(
        files['.sourcemap.css/path/b.map'],
        'should generate SourceMap file in customized location',
    );
    t.truthy(
        files['.sourcemap.css/path/to/c.map'],
        'should generate SourceMap file in customized location',
    );
});

test('should fix SourceMap file location', async t => {
    const metalsmith = Metalsmith(fixtures('sourcemap-broken-location'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.log(files);

    t.is(
        readSourceMapURL(files['src.css'].contents),
        'src.css.map',
        'should remove Metalsmith source absolute path',
    );
    t.truthy(files['src.css.map'], 'should generate SourceMap file');

    t.is(
        readSourceMapURL(files['dest.css'].contents),
        'dest.css.map',
        'should remove Metalsmith destination absolute path',
    );
    t.truthy(files['dest.css.map'], 'should generate SourceMap file');

    t.is(
        readSourceMapURL(files['same.css'].contents),
        'same.css.map',
        'should add ".map" extention in SourceMap filename',
    );
    t.truthy(files['same.css.map'], 'should generate SourceMap file');
});
