#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');

const spawn = require('cross-spawn');
const escapeStringRegexp = require('escape-string-regexp');
const importFrom = require('import-from');
const makeDir = require('make-dir');
const getPackagesVersions = require('packages-versions');
const rimraf = require('rimraf');
const semver = require('semver');
const tar = require('tar');

const cwdFullpath = process.cwd();

const cwdRelativePath = path.relative.bind(path, cwdFullpath);
const statAsync = util.promisify(fs.stat);
const lstatAsync = util.promisify(fs.lstat);
const renameAsync = util.promisify(fs.rename);
const readdirAsync = util.promisify(fs.readdir);
const readFileAsync = util.promisify(fs.readFile);
const readlinkAsync = util.promisify(fs.readlink);
const writeFileAsync = util.promisify(fs.writeFile);
const linkAsync = util.promisify(fs.link);
const symlinkAsync = util.promisify(fs.symlink);
const rimrafAsync = util.promisify(rimraf);
const tarListAsync = util.promisify(tar.list);

function toUnixPath(pathstr) {
  return path
    .normalize(pathstr)
    .split(path.sep)
    .join('/');
}

function toJSCode(value, indent = 2) {
  return JSON.stringify(value, null, indent).replace(
    /[\u2028\u2029]/g,
    char => `\\u${char.charCodeAt(0).toString(16)}`,
  );
}

function trimPathSep(pathstr) {
  const escapedSep = escapeStringRegexp(path.sep);
  const trimPattern =
    path.sep === path.win32.sep
      ? /^[\\/]+|[\\/]+$/g
      : new RegExp(`^(?:${escapedSep})+|(?:${escapedSep})+$`, 'g');
  return pathstr.replace(trimPattern, '');
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

async function getChildDirFullpathList(
  parentDirPath,
  { excludeSymLinks = false } = {},
) {
  return (await Promise.all(
    (await readdirAsync(parentDirPath))
      .map(filepath => path.resolve(parentDirPath, filepath))
      .map(async fileFullpath => ({
        fullpath: fileFullpath,
        stat: excludeSymLinks
          ? await lstatAsync(fileFullpath)
          : await statAsync(fileFullpath),
      })),
  ))
    .filter(({ stat }) => stat.isDirectory())
    .map(({ fullpath }) => fullpath);
}

/**
 * An alternative to the recursive-readdir package. Supports symbolic links and fs.Stats
 * @param {string} dirpath
 * @param {(function(string, {stats:fs.Stats, lstats:fs.Stats}): boolean)[]} ignores
 * @returns {Promise<Map<string, {stats:fs.Stats, lstats:fs.Stats}>>}
 */
async function recursiveReaddir(dirpath, ignores = []) {
  return new Map(
    [].concat(
      ...(await Promise.all(
        (await readdirAsync(dirpath)).map(async filename => {
          const filepath = path.join(dirpath, filename);
          const lstats = await lstatAsync(filepath);

          /** @type {fs.Stats} */
          let stats;
          const statsObj = {
            get stats() {
              if (stats) {
                return stats;
              }

              try {
                stats = fs.statSync(filepath);
              } catch (error) {
                if (!(error.code === 'ENOENT' && lstats.isSymbolicLink())) {
                  throw error;
                }
                stats = lstats;
              }

              return stats;
            },
            lstats,
          };

          if (ignores.some(matcher => matcher(filepath, statsObj))) {
            return [];
          }

          return lstats.isDirectory()
            ? [...(await recursiveReaddir(filepath, ignores)).entries()]
            : [[filepath, statsObj]];
        }),
      )),
    ),
  );
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

async function forceRenameFile(oldPath, newPath, { debugLog = true } = {}) {
  const rename = async () => {
    await renameAsync(oldPath, newPath);
    if (debugLog) {
      console.error(
        `mv '${cwdRelativePath(oldPath)}' '${cwdRelativePath(newPath)}'`,
      );
    }
  };

  try {
    await rename();
  } catch (error) {
    if (error.code !== 'EISDIR') {
      throw error;
    }

    await rimrafAsync(newPath, { glob: false });
    if (debugLog) {
      console.error(`rm -rf '${cwdRelativePath(newPath)}${path.sep}'`);
    }

    await rename();
  }
}

async function createHardlink(existingPath, newPath, { debugLog = true } = {}) {
  await makeDir(path.dirname(newPath));

  try {
    await linkAsync(existingPath, newPath);
    if (debugLog) {
      console.error(
        `ln '${cwdRelativePath(existingPath)}' '${cwdRelativePath(newPath)}'`,
      );
    }
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }

    const fromStats = await statAsync(existingPath);
    const toStats = await statAsync(newPath);
    if (fromStats.ino === toStats.ino) {
      return false;
    }

    /*
     * Overwrite hardlink
     */
    let i = 0;
    while (true) {
      const tempName = `${newPath}.temp${i++}`;

      try {
        await linkAsync(existingPath, tempName);
        if (debugLog) {
          console.error(
            `ln '${cwdRelativePath(existingPath)}' '${cwdRelativePath(
              tempName,
            )}'`,
          );
        }
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        continue;
      }

      await forceRenameFile(tempName, newPath, { debugLog });

      break;
    }
  }

  return true;
}

async function createSymlink({ symlinkFullpath, linkTarget }) {
  symlinkFullpath = path.resolve(symlinkFullpath);
  const symlinkDirFullpath = path.dirname(symlinkFullpath);
  const symlinkTargetPath = path.isAbsolute(linkTarget)
    ? path.relative(symlinkDirFullpath, linkTarget)
    : linkTarget;

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

    await overwriteSymlink({
      symlinkPath: symlinkFullpath,
      linkTarget: symlinkTargetPath,
    });
  }
}

async function overwriteSymlink({ symlinkPath, linkTarget, debugLog = true }) {
  let i = 0;
  /** @type {string} */
  let tempName;

  while (true) {
    tempName = `${symlinkPath}.temp${i++}`;

    try {
      await symlinkAsync(linkTarget, tempName);
      if (debugLog) {
        console.error(`ln -s '${linkTarget}' '${cwdRelativePath(tempName)}'`);
      }

      break;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  await forceRenameFile(tempName, symlinkPath, { debugLog });
}

async function copySymlink(src, dest, { debugLog = true } = {}) {
  const targetPath = await readlinkAsync(src);
  const destFullpath = path.resolve(dest);
  const destDirFullpath = path.dirname(destFullpath);

  await makeDir(destDirFullpath);
  try {
    await symlinkAsync(targetPath, destFullpath);
    if (debugLog) {
      console.error(`ln -s '${targetPath}' '${cwdRelativePath(destFullpath)}'`);
    }
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }

    try {
      if ((await readlinkAsync(destFullpath)) === targetPath) {
        return false;
      }
    } catch (error) {
      if (error.code !== 'EINVAL') {
        throw error;
      }
    }

    await overwriteSymlink({
      symlinkPath: destFullpath,
      linkTarget: targetPath,
      debugLog,
    });
  }

  return true;
}

/**
 * @param {string|{root:string, files:string[]}} sourceDirFullpath
 * @param {string} destDirFullpath
 * @param {{ignoreFileList:string[]}} options
 */
async function syncTwoDir(
  sourceDirFullpath,
  destDirFullpath,
  { ignoreFileList = [] } = {},
) {
  /** @type {string[]} */
  const createdFileList = [];
  /** @type {string[]} */
  const removedFileList = [];

  /**
   * @param {string} dirFullpath
   * @returns {(function(string, {stats:fs.Stats, lstats:fs.Stats}): boolean)[]}
   */
  const ignoresGen = dirFullpath => {
    return ignoreFileList.map(ignoreFile => {
      ignoreFile = path.normalize(ignoreFile);
      const isRootOnlyIgnore = ignoreFile.startsWith(path.sep);
      const isDirOnlyIgnore = ignoreFile.endsWith(path.sep);
      ignoreFile = trimPathSep(ignoreFile);
      const matchPattern = new RegExp(
        `(?:^|${escapeStringRegexp(path.sep)})${escapeStringRegexp(
          ignoreFile,
        )}(?:${escapeStringRegexp(path.sep)}|$)`,
      );

      return (filepath, { stats }) => {
        if (isDirOnlyIgnore && !stats.isDirectory()) {
          return false;
        }
        return isRootOnlyIgnore
          ? filepath === path.join(dirFullpath, ignoreFile)
          : matchPattern.test(path.relative(dirFullpath, filepath));
      };
    });
  };

  /** @type {Map<string, {lstats:fs.Stats}} */
  let sourceFileDataMap;
  if (typeof sourceDirFullpath === 'string') {
    sourceDirFullpath = path.resolve(sourceDirFullpath);
    sourceFileDataMap = await recursiveReaddir(
      sourceDirFullpath,
      ignoresGen(sourceDirFullpath),
    );
  } else {
    const sourceDirRootFullpath = path.resolve(sourceDirFullpath.root);
    sourceFileDataMap = new Map(
      await Promise.all(
        sourceDirFullpath.files.map(async sourceFilepath => {
          const sourceFileFullpath = path.resolve(
            sourceDirRootFullpath,
            sourceFilepath,
          );

          return [
            sourceFileFullpath,
            { lstats: await lstatAsync(sourceFileFullpath) },
          ];
        }),
      ),
    );
    sourceDirFullpath = sourceDirRootFullpath;
  }

  destDirFullpath = path.resolve(destDirFullpath);
  /** @type {Map<string, {stats:fs.Stats, lstats:fs.Stats}} */
  let removeDestFileDataMap;
  try {
    removeDestFileDataMap = await recursiveReaddir(
      destDirFullpath,
      ignoresGen(destDirFullpath),
    );
  } catch (err) {
    removeDestFileDataMap = new Map();
  }

  for (const [
    sourceFileFullpath,
    { lstats: sourceFileLStats },
  ] of sourceFileDataMap) {
    const destFileFullpath = path.join(
      destDirFullpath,
      path.relative(sourceDirFullpath, sourceFileFullpath),
    );

    /*
     * Remove files that name duplicate the parent directories of destination path
     */
    let existFilepath = destFileFullpath;
    do {
      existFilepath = path.dirname(existFilepath);
      if (removeDestFileDataMap.has(existFilepath)) {
        await rimrafAsync(existFilepath, { glob: false });
        removeDestFileDataMap.delete(existFilepath);
        removedFileList.push(existFilepath);
      }
    } while (destDirFullpath !== existFilepath);

    if (!sourceFileLStats.isSymbolicLink()) {
      /*
       * create hardlink
       */
      if (
        await createHardlink(sourceFileFullpath, destFileFullpath, {
          debugLog: false,
        })
      ) {
        createdFileList.push(destFileFullpath);
      }
    } else {
      /*
       * copy symlink
       */
      if (
        await copySymlink(sourceFileFullpath, destFileFullpath, {
          debugLog: false,
        })
      ) {
        createdFileList.push(destFileFullpath);
      }
    }

    removeDestFileDataMap.delete(destFileFullpath);
  }

  for (const [removeDestFileFullpath] of removeDestFileDataMap) {
    await rimrafAsync(removeDestFileFullpath, { glob: false });
    removedFileList.push(removeDestFileFullpath);
  }

  return {
    create: createdFileList,
    remove: removedFileList,
  };
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

/**
 * @see https://gist.github.com/jhorsman/62eeea161a13b80e39f5249281e17c39
 */
const semverPattern = /[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+)?/;
const pkgNamePattern = /(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/g;
const latestVersionPattern = /latest|\*/;
const pkgNameWithVersionPattern = new RegExp(
  String.raw`(${pkgNamePattern.source})@(${latestVersionPattern.source})`,
  'g',
);
const pkgsDefDirnamePattern = new RegExp(
  String.raw`^${pkgNameWithVersionPattern.source}(?:(?:[^@a-z0-9-~]|[@a-z0-9-~](?=[^@a-z0-9-~]))+${pkgNameWithVersionPattern.source})*$`,
);

const pkgFullpath = path.resolve(cwdFullpath, 'package.json');
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

  let randStr = '';
  do {
    randStr = Math.random()
      .toString(36)
      .substring(2);
  } while (dirname.includes(randStr));
  const testDirMatchPattern = escapeStringRegexp(
    dirname.replace(
      pkgNameWithVersionPattern,
      (_, pkgName) => `${pkgName}@${randStr}`,
    ),
  ).replace(
    new RegExp(randStr, 'g'),
    String.raw`(?:${latestVersionPattern.source}|${semverPattern.source})`,
  );

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
        dirname.replace(
          pkgNameWithVersionPattern,
          (matchStr, pkgName, latestChar) => {
            const foundData = pkgsCombination.find(
              ({ name }) => name === pkgName,
            );
            const version =
              foundData.version === getInstalledPackageVersion(pkgName)
                ? latestChar
                : foundData.version;
            return foundData ? `${pkgName}@${version}` : matchStr;
          },
        ),
      );
    },
    testDirMatchRegExp: new RegExp(
      String.raw`(^|[\\/])${testDirMatchPattern}$`,
    ),
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

  /** @type {string[]} */
  const packFileList = [];
  try {
    const packData = JSON.parse(stdout);
    packFileList.push(...packData[0].files.map(file => file.path));
  } catch (err) {
    const tarballFilepath = path.resolve(cwd, stdout.trim());
    await tarListAsync({
      file: tarballFilepath,
      onentry(entry) {
        packFileList.push(entry.path.replace(/^package[\\/]/, ''));
      },
    });
  }

  const packFileFullpathList = packFileList.map(filepath =>
    path.resolve(cwd, filepath),
  );
  packFileListCache.set(cwd, packFileFullpathList);
  return packFileFullpathList;
}

function getInstalledPackageVersion(moduleId, fromDirectory = cwdFullpath) {
  const pkg = importFrom.silent(fromDirectory, `${moduleId}/package.json`);
  if (pkg && pkg.version) {
    return pkg.version;
  }
  return null;
}

const pkgVersionsCache = new Map();
async function getPkgVersions(
  pkgName,
  { excludeInstalledVersion = false } = {},
) {
  const cacheKey = `${pkgName}/${excludeInstalledVersion}`;
  const cachedVersions = pkgVersionsCache.get(cacheKey);
  if (cachedVersions) {
    return cachedVersions;
  }

  const versionRange = peerDependencies[pkgName] || devDependencies[pkgName];
  if (typeof versionRange !== 'string') {
    throw new Error(
      `package \`${pkgName}\` is not included in peerDependencies and devDependencies`,
    );
  }

  const installedVersion = excludeInstalledVersion
    ? getInstalledPackageVersion(pkgName)
    : null;
  const allVersions = await getPackagesVersions(pkgName);
  const filteredVersions = allVersions
    .filter(version => version !== installedVersion)
    .filter(version => semver.satisfies(version, versionRange));

  pkgVersionsCache.set(cacheKey, filteredVersions);
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

/**
 * @param {string} testDirFullpath
 * @param {(string|{name:string, version:string})[]} pkgNameListOrPkgsCombination
 * @returns {string[]}
 */
async function createPkgVersDefScripts(
  testDirFullpath,
  pkgNameListOrPkgsCombination,
) {
  /*
   * Note: AVA ignores files with an underscore prefix
   * see https://github.com/avajs/ava/blob/v2.4.0/docs/06-configuration.md#options
   */
  const pkgVersDefScriptNamePrefix = '_packages-versions';

  /** @type {{name:string, version:string, isLatest:boolean}[]} */
  const pkgDataList = pkgNameListOrPkgsCombination.map(pkgNameOrPkgData => {
    if (typeof pkgNameOrPkgData === 'string') {
      const name = pkgNameOrPkgData;
      return {
        name,
        version: getInstalledPackageVersion(name),
        isLatest: true,
      };
    } else {
      const { name, version } = pkgNameOrPkgData;
      return {
        name,
        version,
        isLatest: getInstalledPackageVersion(name) === version,
      };
    }
  });

  /*
   * Create JS file
   */
  const jsFilepath = path.join(
    testDirFullpath,
    `${pkgVersDefScriptNamePrefix}.js`,
  );
  await writeMultilinesFileAsync(jsFilepath, [
    'module.exports = {',
    ...pkgDataList.map(({ name, version, isLatest }) => [
      `${toJSCode(name)}: {`,
      [`version: ${toJSCode(version)},`, `isLatest: ${toJSCode(isLatest)}`],
      `},`,
    ]),
    '};',
  ]);

  /*
   * Create TypeScript Type Definition file
   */
  const tsFilepath = path.join(
    testDirFullpath,
    `${pkgVersDefScriptNamePrefix}.d.ts`,
  );
  await writeMultilinesFileAsync(
    tsFilepath,
    [
      'declare const x: {',
      ...pkgDataList.map(({ name }) => [
        `readonly ${toJSCode(name)}: {`,
        [`readonly version: string;`, `readonly isLatest: boolean;`],
        `};`,
      ]),
      '};',
      'export = x;',
    ],
    4,
  );

  return [jsFilepath, tsFilepath];
}

async function main(args) {
  const { options } = parseArgs(args);
  const testDirFullpath = path.resolve(
    cwdFullpath,
    options.get('test-dir') || 'test',
  );
  const allPackagesName =
    options.get('local-package-name') || '@sounisi5011/test-packages';

  const targetDirPkgsDataList = (await getChildDirFullpathList(
    testDirFullpath,
    { excludeSymLinks: true },
  ))
    .map(getDefinedPkgNames)
    .filter(Boolean);

  /*
   * Install npm packages
   */

  const packagesDirFullpath = path.resolve(testDirFullpath, '.packages');
  /** @type {Map<string, string>} */
  const localPkgDirFullpathMap = new Map();
  {
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
        await getPkgVersions(packageName, { excludeInstalledVersion: true }),
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

    const createdDirFullpathSet = new Set(localPkgDirFullpathMap.values());
    const allDirFullpathList = await getChildDirFullpathList(
      packagesDirFullpath,
    );
    const unusedDirFullpathList = allDirFullpathList.filter(
      dirFullpath => !createdDirFullpathSet.has(dirFullpath),
    );

    if (
      !isAllInstalled ||
      0 < unusedDirFullpathList.length ||
      !devDependencies[allPackagesName]
    ) {
      const npmArgs = ['install', '--save-dev', packagesDirFullpath];
      for (let i = 2; i--; ) {
        try {
          console.error(`$ npm ${npmArgs.join(' ')}`);
          await spawnAsync('npm', npmArgs, { stdio: 'inherit' });
          break;
        } catch (error) {
          if (!i) {
            throw error;
          }
          console.error(error);
          console.error();
        }
      }
    }

    /*
     * Remove unused directories
     *
     * Note: This operation must be done after executing the "npm install" command.
     *       Because the execution of npm command fails.
     */
    await Promise.all(
      unusedDirFullpathList.map(async unusedDirFullpath => {
        await rimrafAsync(unusedDirFullpath, { glob: false });
        console.error(`remove '${cwdRelativePath(unusedDirFullpath)}'`);
        isUnusedDetect = true;
      }),
    );
  }

  /*
   * Create test directories
   */

  for (const {
    dirpath: testOrigDirFullpath,
    pkgNameList,
    testDirPathGenerator,
    testDirMatchRegExp,
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
     * Create packages version definition script files
     */
    await createPkgVersDefScripts(testOrigDirFullpath, pkgNameList);

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

    const createdDirFullpathSet = new Set([
      packagesDirFullpath,
      testOrigDirFullpath,
    ]);
    for (const pkgsCombination of await getPkgsCombinationList(pkgNameList)) {
      const testSubdirFullpath = testDirPathGenerator(pkgsCombination);
      if (testSubdirFullpath === testOrigDirFullpath) {
        continue;
      }

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
        const localPkgDirFullpath = localPkgDirFullpathMap.get(
          `${pkgName}@${pkgVersion}`,
        );
        if (localPkgDirFullpath) {
          const pkgInstalledFullpath = path.join(
            localPkgDirFullpath,
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
      }

      /*
       * Sync npm project files
       */
      {
        const { create, remove } = await syncTwoDir(
          { root: cwdFullpath, files: await getPackFileList(cwdFullpath) },
          copyDestFullpath,
        );
        if (0 < create.length || 0 < remove.length) {
          console.error(
            `sync npm project files into '${cwdRelativePath(
              copyDestFullpath,
            )}'`,
          );
        }
      }

      /*
       * Create packages version definition script files
       */
      const pkgVersDefScriptFilepathList = await createPkgVersDefScripts(
        testSubdirFullpath,
        pkgsCombination,
      );

      /*
       * Create .gitignore file
       */
      await writeMultilinesFileAsync(
        path.join(testSubdirFullpath, '.gitignore'),
        [
          '/*',
          '!/.gitignore',
          `!/${toUnixPath(
            path.relative(testSubdirFullpath, nodeModulesDirFullpath),
          )}/`,
          `/${toUnixPath(
            path.relative(testSubdirFullpath, nodeModulesDirFullpath),
          )}/*`,
          ...[...symlinkFullpathList, ...pkgVersDefScriptFilepathList].map(
            fullpath =>
              `!/${toUnixPath(path.relative(testSubdirFullpath, fullpath))}`,
          ),
        ],
      );

      /*
       * Sync test files
       */
      {
        const { create, remove } = await syncTwoDir(
          testOrigDirFullpath,
          testSubdirFullpath,
          {
            ignoreFileList: [
              '/.gitignore',
              '/node_modules/',
              ...pkgVersDefScriptFilepathList.map(
                fullpath => `/${path.relative(testSubdirFullpath, fullpath)}`,
              ),
            ],
          },
        );
        if (0 < create.length || 0 < remove.length) {
          console.error(
            `sync test files from '${cwdRelativePath(
              path.join(testOrigDirFullpath, '*'),
            )}' to '${cwdRelativePath(path.join(testSubdirFullpath, '*'))}'`,
          );
        }
      }

      createdDirFullpathSet.add(testSubdirFullpath);
    }

    /*
     * Remove unused directories
     */
    {
      const allDirFullpathList = await getChildDirFullpathList(testDirFullpath);
      const unusedDirFullpathList = allDirFullpathList.filter(
        dirFullpath =>
          testDirMatchRegExp.test(dirFullpath) &&
          !createdDirFullpathSet.has(dirFullpath),
      );

      await Promise.all(
        unusedDirFullpathList.map(async unusedDirFullpath => {
          await rimrafAsync(unusedDirFullpath, { glob: false });
          console.error(`remove '${cwdRelativePath(unusedDirFullpath)}'`);
        }),
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
