import test from 'ava';
import Metalsmith from 'metalsmith';
import sass from 'metalsmith-sass';

import postcss from '../src';
import fixtures from './fixtures';
import { hasProp, switchTest } from './helpers';
import { debuggerPlugin, processAsync } from './helpers/metalsmith';
import { doubler } from './helpers/postcss-plugins';
import {
    getSourceMappingURLType,
    isValidSourceMap,
    readInlineSourceMap,
    readSourceMapURL,
} from './helpers/source-map';

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
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../src/a.sass'),
        'should include the SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === 'a.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should generate multi-level SourceMap file with multi source files', async t => {
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
                    getSourceMappingURLType(files['import/main.css'].contents),
                    'file',
                    'should exists SourceMap file comment by metalsmith-sass',
                );
                t.truthy(
                    files['import/main.css.map'],
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

    t.truthy(files['import/main.css.map'], 'should generate SourceMap file');
    t.is(
        getSourceMappingURLType(files['import/main.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(
            files['import/main.css.map'].contents.toString(),
        );
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../../src/import/main.sass'),
        'should include main SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.sources.includes('../../src/import/_sub.sass'),
        'should include sub SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === 'main.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
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
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        !sourceMap.sources.includes('../src/a.sass'),
        'should not include the SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === 'a.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
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
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../src/a.sass'),
        'should include the SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === 'a.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
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
                    // Note: Older versions of postcss cannot specify boolean in the map option due to the type definition problem that is included.
                    //       This problem has been resolved in postcss@7.0.2 and above.
                    map: true as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../src/a.sass'),
        'should include the SASS filename in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === 'a.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

for (const options of [
    // Note: Older versions of postcss cannot specify false in the map option due to the type definition problem that is included.
    //       This problem has been resolved in postcss@7.0.17 and above.
    { map: false as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
    { map: undefined },
    {},
]) {
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

test('should change SourceMap file location: a.css', async t => {
    const metalsmith = Metalsmith(fixtures('change-source-map-path'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.truthy(
        files['.sourcemap.css/a.map'],
        'should generate SourceMap file in customized location',
    );
    t.is(
        getSourceMappingURLType(files['a.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(
            files['.sourcemap.css/a.map'].contents.toString(),
        );
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../../src/a.css'),
        'should include source CSS filepath in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === '../a.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should change SourceMap file location: path/b.css', async t => {
    const metalsmith = Metalsmith(fixtures('change-source-map-path'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.truthy(
        files['.sourcemap.css/path/b.map'],
        'should generate SourceMap file in customized location',
    );
    t.is(
        getSourceMappingURLType(files['path/b.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(
            files['.sourcemap.css/path/b.map'].contents.toString(),
        );
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../../../src/path/b.css'),
        'should include source CSS filepath in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === '../../path/b.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should change SourceMap file location: path/to/c.css', async t => {
    const metalsmith = Metalsmith(fixtures('change-source-map-path'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.truthy(
        files['.sourcemap.css/path/to/c.map'],
        'should generate SourceMap file in customized location',
    );
    t.is(
        getSourceMappingURLType(files['path/to/c.css'].contents),
        'file',
        'should not exists inline SourceMap',
    );

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(
            files['.sourcemap.css/path/to/c.map'].contents.toString(),
        );
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.sources.includes('../../../../src/path/to/c.css'),
        'should include source CSS filepath in sources property',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    )(
        sourceMap.file === '../../../path/to/c.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should fix SourceMap file location: Metalsmith source absolute path', async t => {
    const metalsmith = Metalsmith(fixtures('sourcemap-broken-location'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.is(
        readSourceMapURL(files['src.css'].contents),
        'src.css.map',
        'should remove Metalsmith source absolute path',
    );
    t.truthy(files['src.css.map'], 'should generate SourceMap file');

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(files['src.css.map'].contents.toString());
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.file === 'src.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should fix SourceMap file location: Metalsmith destination absolute path', async t => {
    const metalsmith = Metalsmith(fixtures('sourcemap-broken-location'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.is(
        readSourceMapURL(files['dest.css'].contents),
        'dest.css.map',
        'should remove Metalsmith destination absolute path',
    );
    t.truthy(files['dest.css.map'], 'should generate SourceMap file');

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(files['dest.css.map'].contents.toString());
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.file === 'dest.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});

test('should fix SourceMap file location: Same filename', async t => {
    const metalsmith = Metalsmith(fixtures('sourcemap-broken-location'))
        .source('src')
        .use(postcss());
    const files = await processAsync(metalsmith);

    t.is(
        readSourceMapURL(files['same.css'].contents),
        'same.css.map',
        'should add ".map" extention in SourceMap filename',
    );
    t.truthy(files['same.css.map'], 'should generate SourceMap file');

    let sourceMap: unknown = null;
    t.notThrows(() => {
        sourceMap = JSON.parse(files['same.css.map'].contents.toString());
    }, 'should parse SourceMap file');
    if (!isValidSourceMap(sourceMap)) {
        t.fail('should valid SourceMap file');
        return;
    }

    switchTest(
        sourceMap.file === 'same.css',
        '"file" property should indicate the original file location',
        msg => {
            t.pass(msg);
        },
        msg => {
            t.fail(msg);
            t.log(sourceMap);
        },
    );
});
