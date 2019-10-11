const cpy = require('cpy');
const globby = require('globby');

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
  const { targets, options } = parseArgs(args);

  if (targets.length < 2) {
    throw new Error('2 or more arguments are required');
  }

  const isDryRun =
    options.has('d') ||
    options.has('dry-run') ||
    options.has('dryrun') ||
    options.has('dry');

  const sourcePathPattern = targets[0];
  const destPathList = await globby([targets[1]], { onlyFiles: false });
  for (const destPath of destPathList) {
    if (!isDryRun) {
      await cpy([sourcePathPattern], destPath, { parents: true });
    }
    if (options.has('v') || options.has('verbose') || isDryRun) {
      console.error(
        `${
          isDryRun ? '[dry-run] ' : ''
        }copied '${sourcePathPattern}' to '${destPath}'`,
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
