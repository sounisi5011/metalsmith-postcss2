#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');

const { commandJoin } = require('command-join');
const spawn = require('cross-spawn');
const importFrom = require('import-from');
const watch = require('node-watch');
const getPackagesVersions = require('packages-versions');
const semver = require('semver');
const onExit = require('signal-exit');

const CWD_FULLPATH = process.cwd();
const PKG_FULLPATH = path.resolve(CWD_FULLPATH, 'package.json');
const PKG = require(PKG_FULLPATH);
if (!PKG.peerDependencies) PKG.peerDependencies = {};

const readFileAsync = util.promisify(fs.readFile);

async function spawnAsync(...args) {
  return new Promise((resolve, reject) => {
    console.log(`> $ ${commandJoin([args[0], ...(args[1] || [])])}`);

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
        code,
        signal,
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

function spawnSync(...args) {
  console.log(`> $ ${commandJoin([args[0], ...(args[1] || [])])}`);
  return spawn.sync(...args);
}

function getInstalledPackageVersion(moduleId, fromDirectory = CWD_FULLPATH) {
  const pkg = importFrom.silent(fromDirectory, `${moduleId}/package.json`);
  if (pkg && pkg.version) {
    return pkg.version;
  }
  return null;
}

const getPkgVersions = (() => {
  const pkgVersionsCache = new Map();

  return async (pkgName, versionRange = '*') => {
    const cacheKey = `${pkgName}/${versionRange}`;
    const cachedVersions = pkgVersionsCache.get(cacheKey);

    if (cachedVersions) return cachedVersions;

    const installedVersion = getInstalledPackageVersion(pkgName);
    const allVersions = await getPackagesVersions(pkgName);
    const filteredVersions = allVersions
      .filter(version => semver.satisfies(version, versionRange))
      .filter(version => semver.lte(version, installedVersion));

    pkgVersionsCache.set(cacheKey, filteredVersions);

    return filteredVersions;
  };
})();

/**
 * @param {Object.<string, string>} pkgMap
 */
async function getPkgsCombinationList(pkgMap) {
  /** @type {Map<string, string[]>} */
  const targetPkgVersionsMap = new Map(
    (await Promise.all(
      Object.keys(pkgMap)
        .sort()
        .map(async pkgName => [
          pkgName,
          await getPkgVersions(pkgName, pkgMap[pkgName]),
        ]),
    )),
  );

  /** @type {Object.<string, string>[]} */
  let pkgsCombinationList = [];
  for (const [pkgName, pkgVersions] of [...targetPkgVersionsMap].reverse()) {
    /** @type {Object.<string, string>[]} */
    const list = [];

    for (const pkgVersion of pkgVersions) {
      const pkgData = { [pkgName]: pkgVersion };

      if (0 < pkgsCombinationList.length) {
        for (const pkgList of pkgsCombinationList) {
          list.push(Object.assign({}, pkgData, pkgList));
        }
      } else {
        list.push(pkgData);
      }
    }

    pkgsCombinationList = list;
  }

  return pkgsCombinationList;
}

async function main(args) {
  const testCmd = args[0];
  const testCmdArgs = args.splice(1);

  if (!testCmd) return;

  /** @type {Map<string, Buffer>} */
  const fileDataMap = new Map(
    await Promise.all(
      ['package.json', 'package-lock.json']
        .map(filename => path.resolve(CWD_FULLPATH, filename))
        .map(async filepath => [filepath, await readFileAsync(filepath)]),
    ),
  );

  const changedFilenameSet = new Set();
  watch([...fileDataMap.keys()], (event, filename) => {
    changedFilenameSet.add(filename);
  });

  let exitFn = () => {
    if (0 < changedFilenameSet.size) {
      for (const [filepath, data] of fileDataMap) {
        fs.writeFileSync(filepath, data);
      }

      const result = spawnSync('npm', ['ci'], { stdio: 'inherit' });
      if (result.status !== 0) {
        spawnSync('npm', ['install'], { stdio: 'inherit' });
      }

      changedFilenameSet.clear();
    }
  };
  onExit(exitFn);

  await spawnAsync(testCmd, testCmdArgs, { stdio: 'inherit' });

  const pkgsCombinationList = await getPkgsCombinationList(
    PKG.peerDependencies,
  );
  const filteredPkgsCombinationList = pkgsCombinationList.filter(
    pkgsCombination =>
      !Object.entries(pkgsCombination).every(
        ([name, version]) => getInstalledPackageVersion(name) === version,
      ),
  );

  for (const pkgsCombination of filteredPkgsCombinationList) {
    console.log();

    const installArgs = Object.entries(pkgsCombination).map(
      ([name, version]) => `${name}@${version}`,
    );
    await spawnAsync('npm', ['install', ...installArgs], { stdio: 'inherit' });
    await spawnAsync(testCmd, testCmdArgs, { stdio: 'inherit' });
  }

  exitFn();
}

(async () => {
  try {
    await main(process.argv.slice(2));
  } catch (err) {
    process.exitCode = 1;
    console.log();
    console.error(err);
  }
  process.exit();
})();
