const path = require('path');

module.exports = ctx => {
  const { metalsmith } = ctx;
  const destRootPath = metalsmith.destination();
  const destFullFilepath = ctx.options.to;
  const destFilepath = path.relative(destRootPath, destFullFilepath);
  const sourceMapFullFilepath = path.join(
    destRootPath,
    '.sourcemap.css',
    path.dirname(destFilepath),
    path.basename(destFilepath, '.css') + '.map',
  );
  const sourceMapFilepath = path.relative(
    path.dirname(destFullFilepath),
    sourceMapFullFilepath,
  );

  return {
    plugins: [require('./postcss-plugins/doubler')],
    map: {
      inline: false,
      annotation: sourceMapFilepath,
    },
  };
};
