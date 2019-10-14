const fs = require('fs');
const path = require('path');
const util = require('util');

const recursive = require('recursive-readdir');

const acceptedPluginPattern = /(^|\W)(postcss\.AcceptedPlugin)(\W|$)/g;
const importStatementsPattern = /(?:^import\s+[^\r\n]+;[\r\n]+)+/m;
const dynamicAcceptedPluginDefPattern = /^export\s+(?:declare\s+)?type\s+(\w+)\s*=\s*Parameters\s*<\s*typeof\s+postcss\s*>\s*\[\s*0\s*\]\s*;$/m;

const cwdRelativePath = path.relative.bind(path, process.cwd());
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const unlinkAsync = util.promisify(fs.unlink);

function removeStrRange(str, start, end) {
  return str.substring(0, start) + str.substring(end);
}

function getRelativeFilename(currentFullpath, targetFullpath) {
  return path.relative(path.dirname(currentFullpath), targetFullpath);
}

function toUnixPath(pathstr) {
  return path
    .normalize(pathstr)
    .split(path.sep)
    .join('/');
}

function omitExt(filepath, ext) {
  return path.join(path.dirname(filepath), path.basename(filepath, ext));
}

function getImportPath(currentFullpath, targetFullpath) {
  const filename = toUnixPath(
    omitExt(getRelativeFilename(currentFullpath, targetFullpath), '.d.ts'),
  ).replace(/(?:^|\/)index$/, '');
  return /^\.{0,2}\//.test(filename) ? filename : `./${filename}`;
}

function getSourceMapData(contents, filepath) {
  const pattern = /(?:[\r\n]+)?(?:\/\*\s*# sourceMappingURL=((?:(?!\*\/).)*)\*\/|\/\/\s*# sourceMappingURL=([^\r\n]*))/g;
  let mapData = null;

  let match;
  while ((match = pattern.exec(contents))) {
    mapData = {
      fullpath: path.resolve(
        path.dirname(filepath),
        (match[2] || match[1]).trim(),
      ),
      commentStart: match.index,
      commentEnd: match.index + match[0].length,
      commentLength: match[0].length,
    };
  }

  return mapData;
}

async function main(distDir) {
  const distDirFullpath = path.resolve(process.cwd(), distDir);
  const dtsFilepathList = (await recursive(distDirFullpath)).filter(path =>
    /\.d\.ts$/.test(path),
  );

  let dynamicAcceptedPluginDefData = null;
  const dtsFileMap = new Map(
    (await Promise.all(
      dtsFilepathList.map(async dtsFilepath => {
        const dtsContents = await readFileAsync(dtsFilepath, 'utf8');

        const match = dynamicAcceptedPluginDefPattern.exec(dtsContents);
        if (match) {
          dynamicAcceptedPluginDefData = {
            filepath: dtsFilepath,
            typeName: match[1],
          };
        }

        return acceptedPluginPattern.test(dtsContents)
          ? [dtsFilepath, dtsContents]
          : null;
      }),
    )).filter(Boolean),
  );

  await Promise.all(
    [...dtsFileMap].map(async ([dtsFilepath, dtsContents]) => {
      const sourceMapPath = getSourceMapData(dtsContents, dtsFilepath);
      const replaceTypeName = dynamicAcceptedPluginDefData
        ? dynamicAcceptedPluginDefData.typeName
        : 'AcceptedPlugin';
      const insertDefLine = dynamicAcceptedPluginDefData
        ? `import { ${replaceTypeName} } from '${getImportPath(
            dtsFilepath,
            dynamicAcceptedPluginDefData.filepath,
          )}';`
        : `declare type ${replaceTypeName} = Parameters<typeof postcss>[0];`;

      let updatedDtsContents = (sourceMapPath
        ? removeStrRange(
            dtsContents,
            sourceMapPath.commentStart,
            sourceMapPath.commentEnd,
          )
        : dtsContents
      )
        .replace(importStatementsPattern, `$&${insertDefLine}\n`)
        .replace(acceptedPluginPattern, `$1${replaceTypeName}$3`);

      if (dtsContents !== updatedDtsContents) {
        await writeFileAsync(dtsFilepath, updatedDtsContents);
        console.error(`Updated '${cwdRelativePath(dtsFilepath)}'`);
      }

      if (sourceMapPath) {
        // TODO: Update SourceMap

        await unlinkAsync(sourceMapPath.fullpath);
        console.error(`Removed '${cwdRelativePath(sourceMapPath.fullpath)}'`);
      }
    }),
  );
}

(async () => {
  try {
    await main('dist');
  } catch (err) {
    process.exitCode = 1;
    console.error(err);
  }
})();
