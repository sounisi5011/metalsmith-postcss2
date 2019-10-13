const fs = require('fs');
const path = require('path');
const util = require('util');

const cpFile = require('cp-file');
const spawn = require('cross-spawn');
const importFrom = require('import-from');
const makeDir = require('make-dir');
const getPackagesVersions = require('packages-versions');
const recursive = require('recursive-readdir');
const semver = require('semver');

const cwdFullpath = process.cwd();

const cwdRelativePath = path.relative.bind(path, cwdFullpath);
const statAsync = util.promisify(fs.stat);
const renameAsync = util.promisify(fs.rename);
const readdirAsync = util.promisify(fs.readdir);
const readFileAsync = util.promisify(fs.readFile);
const readlinkAsync = util.promisify(fs.readlink);
const writeFileAsync = util.promisify(fs.writeFile);
const symlinkAsync = util.promisify(fs.symlink);

function toUnixPath(pathstr) {
  return path
    .normalize(pathstr)
    .split(path.sep)
    .join('/');
}

/**
 * @param {string[]} semverList
 * @returns {({version:string, sortFriendly:string})[]}
 */
function semverSortFriendlyName(semverList) {
  if (semverList.length < 1) {
    return [];
  }

  const maxMajorLen = String(
    semverList.map(semver.major).reduce((a, b) => Math.max(a, b)),
  ).length;
  const maxMinorLen = String(
    semverList.map(semver.minor).reduce((a, b) => Math.max(a, b)),
  ).length;
  const maxPatchLen = String(
    semverList.map(semver.patch).reduce((a, b) => Math.max(a, b)),
  ).length;

  return semverList
    .map(version => ({
      version,
      sortFriendly: version.replace(
        /^([0-9]+)\.([0-9]+)\.([0-9]+)/,
        (_, major, minor, patch) =>
          `${major.padStart(maxMajorLen, '0')}.${minor.padStart(
            maxMinorLen,
            '0',
          )}.${patch.padStart(maxPatchLen, '0')}`,
      ),
    }))
    .sort(({ sortFriendly: a }, { sortFriendly: b }) =>
      a > b ? 1 : a < b ? -1 : 0,
    );
}

/**
 * @param {string[]|string[][]|string[][][]|string[][][][]|string[][][][][]|string[][][][][][]} lines
 * @param {string|number} indent
 * @returns {string}
 */
function lines2str(lines, indent = 2, nestLevel = 0) {
  if (typeof indent === 'number') {
    indent = ' '.repeat(indent);
  }
  return lines
    .map(lineOrlines =>
      Array.isArray(lineOrlines)
        ? lines2str(lineOrlines, indent, nestLevel + 1)
        : String(lineOrlines).replace(/^/gm, indent.repeat(nestLevel)) + '\n',
    )
    .join('');
}

async function getChildDirFullpathList(parentDirPath) {
  return (await Promise.all(
    (await readdirAsync(parentDirPath))
      .map(filepath => path.resolve(parentDirPath, filepath))
      .map(async fileFullpath => ({
        fullpath: fileFullpath,
        stat: await statAsync(fileFullpath),
      })),
  ))
    .filter(({ stat }) => stat.isDirectory())
    .map(({ fullpath }) => fullpath);
}

/**
 * @param {string} filepath
 * @param {string[]|string[][]|string[][][]|string[][][][]|string[][][][][]|string[][][][][][]} lines
 * @param {string|number} indent
 */
async function writeMultilinesFileAsync(filepath, lines, indent = 2) {
  if (typeof indent === 'number') {
    indent = ' '.repeat(indent);
  }
  const data = lines2str(lines, indent);

  let isExist = false;
  try {
    const origData = await readFileAsync(filepath);
    if (origData.equals(Buffer.from(data))) {
      return;
    }
    isExist = true;
  } catch (err) {}

  await makeDir(path.dirname(filepath));

  await writeFileAsync(filepath, data);
  console.error(
    (isExist ? 'overwrite' : 'create') +
      ` text file '${cwdRelativePath(filepath)}'`,
  );
}

async function writeJSONFileAsync(filepath, value) {
  const data = JSON.stringify(value, null, 2) + '\n';

  let isExist = false;
  try {
    const origData = await readFileAsync(filepath);
    if (origData.equals(Buffer.from(data))) {
      return;
    }
    isExist = true;
  } catch (err) {}

  await makeDir(path.dirname(filepath));

  await writeFileAsync(filepath, data);
  console.error(
    (isExist ? 'overwrite' : 'create') +
      ` JSON file '${cwdRelativePath(filepath)}'`,
  );
}

async function createSymlink({ symlinkFullpath, linkTarget }) {
  const symlinkDirFullpath = path.dirname(symlinkFullpath);
  const symlinkTargetPath = path.relative(symlinkDirFullpath, linkTarget);

  await makeDir(symlinkDirFullpath);
  try {
    await symlinkAsync(symlinkTargetPath, symlinkFullpath);
    console.error(
      `ln -s '${symlinkTargetPath}' '${cwdRelativePath(symlinkFullpath)}'`,
    );
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }

    if ((await readlinkAsync(symlinkFullpath)) === symlinkTargetPath) {
      return;
    }

    /*
     * Overwrite symlink
     */
    let i = 0;
    while (true) {
      try {
        const tempName = `${symlinkFullpath}.temp${i++}`;

        await symlinkAsync(symlinkTargetPath, tempName);
        console.error(
          `ln -s '${symlinkTargetPath}' '${cwdRelativePath(tempName)}'`,
        );

        await renameAsync(tempName, symlinkFullpath);
        console.error(
          `mv '${cwdRelativePath(tempName)}' '${cwdRelativePath(
            symlinkFullpath,
          )}'`,
        );

        return;
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }
}

/**
 * @returns {{ options: Map<string, string|true>, targets: string[] }}
 */
function parseArgs(args) {
  const options = new Map();
  const targets = [];

  let optname;
  for (const arg of args) {
    if (/^--/.test(arg)) {
      optname = arg.substring(2);
      options.set(optname, true);
    } else if (/^-/.test(arg)) {
      for (const optchar of arg.substring(1)) {
        optname = optchar;
        options.set(optname, true);
      }
    } else if (optname) {
      options.set(optname, arg);
      optname = null;
    } else {
      targets.push(arg);
    }
  }

  return { options, targets };
}

function spawnAsync(...args) {
  return new Promise((resolve, reject) => {
    const process = spawn(...args);
    const stdoutList = [];
    const stderrList = [];

    if (process.stdout) {
      process.stdout.on('data', data => {
        stdoutList.push(data);
      });
    }

    if (process.stderr) {
      process.stderr.on('data', data => {
        stderrList.push(data);
      });
    }

    process.on('close', (code, signal) => {
      const data = {
        stdout: stdoutList.join(''),
        stderr: stderrList.join(''),
      };

      if (code === 0) {
        resolve(data);
      } else {
        reject(
          Object.assign(
            new Error(`command failed with exit code ${code}`),
            data,
          ),
        );
      }
    });

    process.on('error', err => {
      reject(err);
    });
  });
}

// ----- ----- ----- ----- ----- //

const pkgNamePattern = /(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/g;
const pkgNameWithVersionPattern = new RegExp(
  String.raw`(${pkgNamePattern.source})@(?:latest|\*)`,
  'g',
);
const pkgsDefDirnamePattern = new RegExp(
  String.raw`^${pkgNameWithVersionPattern.source}(?:(?:[^@a-z0-9-~]|[@a-z0-9-~](?=[^@a-z0-9-~]))+${pkgNameWithVersionPattern.source})*$`,
);

const pkgFullpath = path.resolve(process.cwd(), 'package.json');
const PKG = require(pkgFullpath);
const devDependencies = PKG.devDependencies || {};
const peerDependencies = PKG.peerDependencies || {};

/**
 * @param {string} dirpath
 */
function getDefinedPkgNames(dirpath) {
  const dirname = path.basename(dirpath);
  if (!pkgsDefDirnamePattern.test(dirname)) {
    return null;
  }

  const pkgNameList = [];
  let match;
  while ((match = pkgNameWithVersionPattern.exec(dirname))) {
    pkgNameList.push(match[1]);
  }

  const parentDirpath = path.dirname(dirpath);
  return {
    dirpath,
    pkgNameList,
    /**
     * @param {{name:string, version:string}[]} pkgsCombination
     */
    testDirPathGenerator(pkgsCombination) {
      return path.join(
        parentDirpath,
        dirname.replace(pkgNameWithVersionPattern, (matchStr, pkgName) => {
          const foundData = pkgsCombination.find(
            ({ name }) => name === pkgName,
          );
          return foundData ? `${pkgName}@${foundData.version}` : matchStr;
        }),
      );
    },
  };
}

const packFileListCache = new Map();
async function getPackFileList(cwd = cwdFullpath) {
  const cachedPackFileList = packFileListCache.get(cwd);
  if (cachedPackFileList) {
    return cachedPackFileList;
  }

  const { stdout } = await spawnAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd,
  });
  const packData = JSON.parse(stdout);
  const packFileList = packData[0].files.map(file =>
    path.resolve(cwd, file.path),
  );

  packFileListCache.set(cwd, packFileList);
  return packFileList;
}

function getInstalledPackageVersion(moduleId, fromDirectory = cwdFullpath) {
  const pkg = importFrom.silent(fromDirectory, `${moduleId}/package.json`);
  if (pkg && pkg.version) {
    return pkg.version;
  }
  return null;
}

const pkgVersionsCache = new Map();
async function getPkgVersions(pkgName) {
  const cachedVersions = pkgVersionsCache.get(pkgName);
  if (cachedVersions) {
    return cachedVersions;
  }

  const versionRange = peerDependencies[pkgName] || devDependencies[pkgName];
  if (typeof versionRange !== 'string') {
    throw new Error(
      `package \`${pkgName}\` is not included in peerDependencies and devDependencies`,
    );
  }

  const installedVersion = getInstalledPackageVersion(pkgName);
  const allVersions = await getPackagesVersions(pkgName);
  const filteredVersions = allVersions
    .filter(version => version !== installedVersion)
    .filter(version => semver.satisfies(version, versionRange));

  pkgVersionsCache.set(pkgName, filteredVersions);
  return filteredVersions;
}

/**
 * @param {string[]} pkgNameList
 */
async function getPkgsCombinationList(pkgNameList) {
  /** @type {Map<string, string[]>} */
  const targetPkgVersionsMap = new Map(
    (await Promise.all(
      pkgNameList
        .sort()
        .map(async pkgName => [pkgName, await getPkgVersions(pkgName)]),
    )),
  );

  /** @type {{name:string, version:string}[][]} */
  let pkgsCombinationList = [];
  for (const [pkgName, pkgVersions] of [...targetPkgVersionsMap].reverse()) {
    /** @type {{name:string, version:string}[][]} */
    const list = [];
    for (const pkgVersion of pkgVersions) {
      const pkgData = {
        name: pkgName,
        version: pkgVersion,
      };
      if (0 < pkgsCombinationList.length) {
        for (const pkgList of pkgsCombinationList) {
          list.push([pkgData, ...pkgList]);
        }
      } else {
        list.push([pkgData]);
      }
    }
    pkgsCombinationList = list;
  }

  return pkgsCombinationList;
}

async function main(args) {
  const { options } = parseArgs(args);
  const testDirFullpath = path.resolve(
    cwdFullpath,
    options.get('test-dir') || 'test',
  );
  const allPackagesName =
    options.get('local-package-name') || '@sounisi5011/test-packages';

  const targetDirPkgsDataList = (await getChildDirFullpathList(testDirFullpath))
    .map(getDefinedPkgNames)
    .filter(Boolean);

  /*
   * Install npm packages
   */

  const localPkgDirFullpathMap = new Map();
  {
    const packagesDirFullpath = path.resolve(testDirFullpath, '.packages');
    const allPackagesSet = new Set(
      targetDirPkgsDataList
        .reduce(
          (allPackagesList, { pkgNameList }) => [
            ...allPackagesList,
            ...pkgNameList,
          ],
          [],
        )
        .sort(),
    );
    const packagesRecord = {};
    let isAllInstalled = true;

    for (const packageName of allPackagesSet) {
      for (const { version, sortFriendly } of semverSortFriendlyName(
        await getPkgVersions(packageName),
      )) {
        const localPkgName = `${packageName}-${sortFriendly}`;
        const localPkgDirFullpath = path.resolve(
          packagesDirFullpath,
          `${packageName}@${version}`,
        );

        await writeJSONFileAsync(
          path.join(localPkgDirFullpath, 'package.json'),
          {
            private: true,
            dependencies: {
              [packageName]: version,
            },
          },
        );

        packagesRecord[localPkgName] = `file:${toUnixPath(
          path.relative(packagesDirFullpath, localPkgDirFullpath),
        )}`;

        const installedVersion = getInstalledPackageVersion(
          packageName,
          localPkgDirFullpath,
        );
        if (installedVersion !== version) {
          isAllInstalled = false;
        }

        localPkgDirFullpathMap.set(
          `${packageName}@${version}`,
          localPkgDirFullpath,
        );
      }
    }

    await writeJSONFileAsync(path.join(packagesDirFullpath, 'package.json'), {
      name: allPackagesName,
      version: '0.0.0',
      private: true,
      dependencies: packagesRecord,
    });

    if (!isAllInstalled || !devDependencies[allPackagesName]) {
      const npmArgs = ['install', '--save-dev', packagesDirFullpath];
      console.error(`$ npm ${npmArgs.join(' ')}`);
      await spawnAsync('npm', npmArgs, { stdio: 'inherit' });
    }
  }

  /*
   * Create test directories
   */

  for (const {
    dirpath: testOrigDirFullpath,
    pkgNameList,
    testDirPathGenerator,
  } of targetDirPkgsDataList) {
    const nodeModulesDirFullpath = path.resolve(
      testOrigDirFullpath,
      'node_modules',
    );
    const symlinkFullpath = path.join(nodeModulesDirFullpath, PKG.name);

    /*
     * Create npm project package symlink
     */
    await createSymlink({ symlinkFullpath, linkTarget: cwdFullpath });

    /*
     * Create .gitignore file
     */
    await writeMultilinesFileAsync(
      path.join(testOrigDirFullpath, '.gitignore'),
      [
        `!/${toUnixPath(
          path.relative(testOrigDirFullpath, nodeModulesDirFullpath),
        )}/`,
        `/${toUnixPath(
          path.relative(testOrigDirFullpath, nodeModulesDirFullpath),
        )}/*`,
        `!/${toUnixPath(path.relative(testOrigDirFullpath, symlinkFullpath))}`,
      ],
    );

    for (const pkgsCombination of await getPkgsCombinationList(pkgNameList)) {
      const testSubdirFullpath = testDirPathGenerator(pkgsCombination);
      const nodeModulesDirFullpath = path.resolve(
        testSubdirFullpath,
        'node_modules',
      );
      const copyDestFullpath = path.join(nodeModulesDirFullpath, PKG.name);

      /*
       * Create installed packages symlink
       */
      const symlinkFullpathList = [];
      for (const { name: pkgName, version: pkgVersion } of pkgsCombination) {
        const pkgInstalledFullpath = path.join(
          localPkgDirFullpathMap.get(`${pkgName}@${pkgVersion}`),
          'node_modules',
          pkgName,
        );
        const symlinkFullpath = path.join(nodeModulesDirFullpath, pkgName);
        await createSymlink({
          symlinkFullpath,
          linkTarget: pkgInstalledFullpath,
        });
        symlinkFullpathList.push(symlinkFullpath);
      }

      /*
       * Copy npm project files
       */
      for (const projectFileFullpath of await getPackFileList()) {
        const destProjectFileFullpath = path.join(
          copyDestFullpath,
          path.relative(cwdFullpath, projectFileFullpath),
        );
        await cpFile(projectFileFullpath, destProjectFileFullpath);
      }
      console.error(
        `copy npm project files into '${cwdRelativePath(copyDestFullpath)}'`,
      );

      /*
       * Create .gitignore file
       */
      await writeMultilinesFileAsync(
        path.join(testSubdirFullpath, '.gitignore'),
        [
          `!/${toUnixPath(
            path.relative(testSubdirFullpath, nodeModulesDirFullpath),
          )}/`,
          `/${toUnixPath(
            path.relative(testSubdirFullpath, nodeModulesDirFullpath),
          )}/*`,
          ...symlinkFullpathList.map(
            symlinkFullpath =>
              `!/${toUnixPath(
                path.relative(testSubdirFullpath, symlinkFullpath),
              )}`,
          ),
        ],
      );

      /*
       * Copy test files
       */
      const testFileFullpathList = await recursive(testOrigDirFullpath, [
        (filepath, stats) => {
          return (
            (filepath === path.join(testOrigDirFullpath, '.gitignore') &&
              stats.isFile()) ||
            (filepath === path.join(testOrigDirFullpath, 'node_modules') &&
              stats.isDirectory())
          );
        },
      ]);
      for (const testFileFullpath of testFileFullpathList) {
        const destTestFileFullpath = path.join(
          testSubdirFullpath,
          path.relative(testOrigDirFullpath, testFileFullpath),
        );
        await cpFile(testFileFullpath, destTestFileFullpath);
      }
      console.error(
        `copy test files from '${cwdRelativePath(
          testOrigDirFullpath,
        )}' to '${cwdRelativePath(testSubdirFullpath)}'`,
      );
    }
  }
}

(async () => {
  try {
    await main(process.argv.slice(2));
  } catch (err) {
    process.exitCode = 1;
    console.error(err);
  }
})();
