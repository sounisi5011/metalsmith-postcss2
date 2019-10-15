import test from 'ava';
import path from 'path';

import exec from '../helpers/exec';
import { PROJECT_ROOT } from '../helpers/rootPaths';
import pkgVersions from './_packages-versions';
import fixtures from './fixtures';

const metalsmithCLI = path.resolve(
    PROJECT_ROOT,
    'node_modules',
    '.bin',
    'metalsmith',
);

test.before(async t => {
    try {
        require.resolve('metalsmith-postcss2');
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
            throw error;
        }

        if (Object.values(pkgVersions).every(pkgData => pkgData.isLatest)) {
            t.log('$ npm run build');
            await exec('npm', ['run', 'build'], { cwd: PROJECT_ROOT });
        } else {
            const npxLogMsg =
                '$ npx --no-install run-s build build:peerdeps-test:generate';
            try {
                await exec(
                    'npx',
                    [
                        '--no-install',
                        'run-s',
                        'build',
                        'build:peerdeps-test:generate',
                    ],
                    { cwd: PROJECT_ROOT },
                );
                t.log(npxLogMsg);
            } catch (error) {
                const npxCmdNotFound = error.code === 'ENOENT';
                const runsPackageNotInstalled =
                    error.name === 'CommandFailedError' &&
                    /^not found: run-s$/m.test(error.stderr);

                if (!(npxCmdNotFound || runsPackageNotInstalled)) {
                    t.log(npxLogMsg);
                    throw error;
                }

                t.log('$ npm run build');
                await exec('npm', ['run', 'build'], { cwd: PROJECT_ROOT });
                t.log('$ npm run build:peerdeps-test:generate');
                await exec('npm', ['run', 'build:peerdeps-test:generate'], {
                    cwd: PROJECT_ROOT,
                });
            }
        }
    }
});

test('should work with Metalsmith CLI', async t => {
    await t.notThrowsAsync(exec(metalsmithCLI, [], { cwd: fixtures('basic') }));
});
