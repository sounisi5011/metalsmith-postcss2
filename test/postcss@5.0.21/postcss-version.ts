import test from 'ava';
import path from 'path';
import postcss from 'postcss';

test('should match postcss version', t => {
    const version = (/^postcss@(.+)$/.exec(path.basename(__dirname)) || [])[1];
    t.is(postcss().version, version === 'latest' ? '7.0.18' : version);
});
