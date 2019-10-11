const fs = require('fs');
const path = require('path');
const util = require('util');

const cpy = require('cpy');
const spawn = require('cross-spawn');
const del = require('del');
const getPackagesVersions = require('packages-versions');
const semver = require('semver');

const cwdRelativePath = path.relative.bind(path, process.cwd());
const writeFileAsync = util.promisify(fs.writeFile);

function isStringList(value) {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function getMaxLenHyphen(str) {
  return (str.match(/-+/g) || ['']).sort().reverse()[0];
}

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

/**
 * @param {string} filepath
 * @param {string[]|string[][]|string[][][]|string[][][][]|string[][][][][]|string[][][][][][]} lines
 * @param {string|number} indent
 */
async function writeMultilinesFileAsync(filepath, lines, indent = 2) {
  if (typeof indent === 'number') {
    indent = ' '.repeat(indent);
  }
  return writeFileAsync(filepath, lines2str(lines, indent));
}

async function writeJSONFileAsync(filepath, data) {
  return writeFileAsync(filepath, JSON.stringify(data, null, 2) + '\n');
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

async function main(args) {
  const { options } = parseArgs(args);

  const pkgFullpath = path.resolve(process.cwd(), 'package.json');
  const PKG = require(pkgFullpath);
  const peerDependencies = PKG.peerDependencies || {};
  const copyFiles = PKG.files;
  if (!isStringList(copyFiles)) {
    throw new Error('Requires valid "files" field in package.json');
  }

  const installDirFullpath = path.resolve(
    options.get('install-dir') || 'packages',
    PKG.name,
  );
  const targetPkg = options.get('pkg');
  const targetPkgSet = new Set(
    typeof targetPkg === 'string'
      ? targetPkg.split(/[\s,]+/)
      : Object.keys(peerDependencies),
  );

  if (targetPkgSet.size < 1) {
    return;
  }

  /** @type {null | (Map<string, string|null>)} */
  const installedPkgVersionMap = options.has('exclude-installed-peerdeps')
    ? (new Map(
        [...targetPkgSet].map(pkgName => {
          if (Object.keys(PKG.devDependencies || {}).includes(pkgName)) {
            try {
              return [pkgName, require(`${pkgName}/package.json`).version];
            } catch (err) {}
          }
          return [pkgName, null];
        }, {}),
      ))
    : null;

  /** @type {Map<string, string[]>} */
  const targetPkgVersionsMap = new Map(
    await Promise.all(
      [...targetPkgSet].sort().map(async pkgName => {
        const versionRange = peerDependencies[pkgName];
        if (typeof versionRange !== 'string') {
          throw new Error(
            `package \`${pkgName}\` is not included in peerDependencies`,
          );
        }
        /** @type {string[]} */
        const allVersions = await getPackagesVersions(pkgName);
        const filteredVersions = allVersions.filter(version =>
          semver.satisfies(version, versionRange),
        );
        return [pkgName, filteredVersions];
      }),
    ),
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
  if (installedPkgVersionMap) {
    pkgsCombinationList = pkgsCombinationList.filter(
      pkgsCombination =>
        !pkgsCombination.every(
          ({ name, version }) => installedPkgVersionMap.get(name) === version,
        ),
    );
  }

  /** @type {Map<string, {installPath:string, pkgs: ({name:string, version:string})[]}>} */
  const localPkgMap = new Map();
  /** @type {Set<string>} */
  const ignoreFullpathSet = new Set();
  for (const pkgsCombination of pkgsCombinationList) {
    const _sep_ =
      getMaxLenHyphen(pkgsCombination.map(({ name }) => name).join()) + '-';
    const getSafeName = name => name.replace(/^@([^/]+)\//, `$1${_sep_}`);

    const localPkgName = `${PKG.name}-with-${pkgsCombination
      .map(({ name, version }) => `${getSafeName(name)}${_sep_}${version}`)
      .join('-')}`;
    const localPkgFullpath = path.join(
      installDirFullpath,
      ...pkgsCombination.map(({ name, version }) => `with-${name}@${version}`),
    );
    ignoreFullpathSet.add(
      path.join(
        installDirFullpath,
        ...pkgsCombination.map(({ name }) => `with-${name}@*`),
      ),
    );

    const newPKGData = {
      name: localPkgName,
      version: `0.0.0+${pkgsCombination
        .map(
          ({ name, version }) =>
            `${getSafeName(name)}${_sep_}${version.replace(/\./g, '-')}`,
        )
        .join('.')}`,
      private: true,
    };

    for (const prop of ['main', 'types', 'typings']) {
      if (Object.prototype.hasOwnProperty.call(PKG, prop)) {
        newPKGData[prop] = PKG[prop];
      }
    }

    newPKGData.dependencies = pkgsCombination.reduce(
      (deps, { name, version }) => ({ ...deps, [name]: version }),
      {},
    );

    const deletedFullpathList = await del(
      copyFiles.map(copyFile => `${localPkgFullpath}/${copyFile}`),
    );
    if (0 < deletedFullpathList.length) {
      console.error(
        `deleted ${deletedFullpathList
          .map(deletedFullpath => `'${cwdRelativePath(deletedFullpath)}'`)
          .join(', ')}`,
      );
    }

    await cpy(copyFiles, localPkgFullpath, { parents: true });
    console.error(
      `copied ${copyFiles
        .map(copyFile => `'${copyFile}'`)
        .join(', ')} to '${cwdRelativePath(localPkgFullpath)}'`,
    );

    const newPKGFullpath = path.join(localPkgFullpath, 'package.json');
    await writeJSONFileAsync(newPKGFullpath, newPKGData);
    console.error(`created ${cwdRelativePath(newPKGFullpath)}`);

    localPkgMap.set(localPkgName, {
      installPath: localPkgFullpath,
      pkgs: pkgsCombination,
    });
  }

  /*
   * Create all-pkgs.js
   */
  const allPkgsJSFullpath = path.join(installDirFullpath, 'all-pkgs.js');
  await writeMultilinesFileAsync(allPkgsJSFullpath, [
    'module.exports = {',
    ...[...localPkgMap].map(([localPkgName, { pkgs }]) => [
      `${toJSCode(localPkgName)}: {`,
      [
        `peerDeps: ${toJSCode(
          pkgs.reduce(
            (deps, { name, version }) => ({ ...deps, [name]: version }),
            {},
          ),
          2,
        )},`,
        `module: require(${toJSCode(localPkgName)}),`,
      ],
      `},`,
    ]),
    '};',
  ]);
  console.error(`created ${cwdRelativePath(allPkgsJSFullpath)}`);

  /*
   * Create all-pkgs.ts
   */
  const allPkgsTSFullpath = path.join(installDirFullpath, 'all-pkgs.ts');
  await writeMultilinesFileAsync(
    allPkgsTSFullpath,
    [
      ...[...localPkgMap.keys()].map(
        (localPkgName, index) =>
          `import pkg${index} from ${toJSCode(localPkgName)};`,
      ),
      '',
      'export = {',
      ...[...localPkgMap].map(([localPkgName, { pkgs }], index) => [
        `${toJSCode(localPkgName)}: {`,
        [
          `peerDeps: {`,
          pkgs.map(
            ({ name, version }) =>
              `${toJSCode(name)}: ${toJSCode(version)} as ${toJSCode(
                version,
              )},`,
          ),
          `},`,
          `module: pkg${index},`,
        ],
        `},`,
      ]),
      '};',
    ],
    4,
  );
  console.error(`created ${cwdRelativePath(allPkgsTSFullpath)}`);

  /*
   * Create .gitignore
   */
  const gitignoreFullpath = path.join(installDirFullpath, '.gitignore');
  await writeMultilinesFileAsync(
    gitignoreFullpath,
    [...ignoreFullpathSet]
      .map(ignoreFullpath => path.relative(installDirFullpath, ignoreFullpath))
      .map(toUnixPath)
      .map(ignorePath =>
        copyFiles.map(copyFile => `/${ignorePath}/${copyFile}`),
      )
      .reduce((list, value) => list.concat(value), []),
  );
  console.error(`created ${cwdRelativePath(gitignoreFullpath)}`);

  /*
   * Update package.json and package-lock.json
   */
  const npmArgs = [
    'install',
    '--save-dev',
    ...[...localPkgMap.values()].map(({ installPath }) => installPath),
  ];
  console.error(`$ npm ${npmArgs.join(' ')}`);
  await spawnAsync('npm', npmArgs, { stdio: 'inherit' });
  console.error(`updated ${cwdRelativePath(pkgFullpath)}`);
}

(async () => {
  try {
    await main(process.argv.slice(2));
  } catch (err) {
    process.exitCode = 1;
    console.error(err);
  }
})();
