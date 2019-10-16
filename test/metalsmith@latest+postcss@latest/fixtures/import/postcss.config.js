module.exports = ctx => {
  return {
    map: ctx.options.map,
    plugins: {
      'postcss-import': {},
    },
  };
};
