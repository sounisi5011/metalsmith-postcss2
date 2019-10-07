const fs = require('fs');
const path = require('path');
const util = require('util');

const Mustache = require('mustache');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

async function tryReadFile(...args) {
  try {
    return await readFileAsync(...args);
  } catch (error) {
    return null;
  }
}

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
  const cwd = process.cwd();
  const { options } = parseArgs(args);
  const templatePath = path.resolve(
    cwd,
    options.get('template') || 'README.mustache',
  );
  const templateCode = await readFileAsync(templatePath, 'utf8');
  const view = {
    pkg: require(path.resolve(cwd, 'package.json')),
    pkgLock: require(path.resolve(cwd, 'package-lock.json')),
    encURL: () => (text, render) =>
      encodeURIComponent(render(text.trim())).replace(
        /[!'()*]/g,
        char =>
          `%${char
            .charCodeAt(0)
            .toString(16)
            .toUpperCase()}`,
      ),
  };
  const output = Mustache.render(templateCode, view);
  const outputPath = path.resolve(path.dirname(templatePath), 'README.md');

  if (options.has('test')) {
    const origReadme = await tryReadFile(outputPath);
    if (origReadme && !origReadme.equals(Buffer.from(output))) {
      throw new Error(`Do not edit ${path.relative(cwd, outputPath)} manually`);
    }
  } else {
    await writeFileAsync(outputPath, output);
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
