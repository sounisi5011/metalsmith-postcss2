module.exports = ctx => {
  const map = { inline: false };

  if (/^src\.[^.]+$/i.test(ctx.file.basename)) {
    map.annotation = `${ctx.options.from}.map`;
  } else if (/^dest\.[^.]+$/i.test(ctx.file.basename)) {
    map.annotation = `${ctx.options.to}.map`;
  } else if (/^same\.[^.]+$/i.test(ctx.file.basename)) {
    map.annotation = ctx.options.to;
  }

  return { map };
};
