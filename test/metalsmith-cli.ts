import test from 'ava';
import path from 'path';

import exec from './helpers/exec';
import fixtures from './postcss@*/fixtures';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const metalsmithCLI = path.resolve(
    PROJECT_ROOT,
    'node_modules',
    '.bin',
    'metalsmith',
);

test.before(async () => {
    await exec('npm', ['run', 'build'], { cwd: PROJECT_ROOT });
});

test('should work with Metalsmith CLI', async t => {
    await t.notThrowsAsync(exec(metalsmithCLI, [], { cwd: fixtures('basic') }));
});
