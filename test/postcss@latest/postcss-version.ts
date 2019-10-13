import test from 'ava';
import path from 'path';
import postcss from 'postcss';

test('should match postcss version', t => {
    const version = (/^postcss@(.+)$/.exec(path.basename(__dirname)) || [])[1];

    if (
        [
            '5.0.15',
            '5.0.16',
            '5.0.17',
            '5.0.18',
            '5.0.19',
            '5.0.20',
            '5.0.21',
        ].includes(version)
    ) {
        /**
         * postcss after version 5.0.15 forgot to update the "version" property until it was updated to 5.1.0.
         * @see https://github.com/postcss/postcss/blob/5.0.15/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.16/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.17/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.18/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.19/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.20/lib/processor.es6#L5
         * @see https://github.com/postcss/postcss/blob/5.0.21/lib/processor.es6#L5
         */
        t.is(postcss().version, '5.0.14');
    } else if (version === '5.2.1') {
        /**
         * postcss@5.2.1 forgot to update the version property.
         * @see https://github.com/postcss/postcss/blob/5.2.1/lib/processor.es6#L110
         */
        t.is(postcss().version, '5.2.0');
    } else {
        t.is(postcss().version, version === 'latest' ? '7.0.18' : version);
    }
});
