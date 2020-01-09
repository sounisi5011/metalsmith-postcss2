import test from 'ava';
import postcss from 'postcss';

import pkgVersions from './_packages-versions';

const metalsmithVersion = pkgVersions.metalsmith.version;
const postcssVersion = pkgVersions.postcss.version;

test('should match metalsmith version', t => {
    t.is(require('metalsmith/package.json').version, metalsmithVersion);
});

test('should match postcss version', t => {
    t.is(require('postcss/package.json').version, postcssVersion);
});

test('should match postcss Processor#version property', t => {
    const postcssProcessor = postcss();
    if (
        [
            '5.0.15',
            '5.0.16',
            '5.0.17',
            '5.0.18',
            '5.0.19',
            '5.0.20',
            '5.0.21',
        ].includes(postcssVersion)
    ) {
        /**
         * postcss after version 5.0.15 forgot to update Processor#version property until it was updated to 5.1.0.
         * @see https://github.com/postcss/postcss/blob/5.0.15/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.16/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.17/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.18/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.19/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.20/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.21/lib/processor.es6#L5
         */
        t.is(postcssProcessor.version, '5.0.14');
    } else if (postcssVersion === '5.2.1') {
        /**
         * postcss@5.2.1 forgot to update Processor#version property.
         * @see https://github.com/postcss/postcss/blob/5.2.1/lib/processor.es6#L110
         */
        t.is(postcssProcessor.version, '5.2.0');
    } else {
        t.is(postcssProcessor.version, postcssVersion);
    }
});
