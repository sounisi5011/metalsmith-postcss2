import test from 'ava';

import fixtures from './fixtures';
import exec from './helpers/exec';
import { PROJECT_ROOT } from './helpers/rootPaths';

test.before(async t => {
    try {
        require.resolve('..');
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
            throw error;
        }

        t.log('$ npm run build');
        await exec('npm', ['run', 'build'], { cwd: PROJECT_ROOT });
    }
});

test('should work with Metalsmith CLI', async t => {
    const metalsmithCLI = require.resolve('metalsmith/bin/metalsmith');
    await t.notThrowsAsync(exec(metalsmithCLI, [], { cwd: fixtures('basic') }));
});
