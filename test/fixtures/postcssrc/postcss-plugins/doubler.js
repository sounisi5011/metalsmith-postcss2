module.exports = css => {
  css.walkDecls(decl => {
    decl.parent.prepend(decl.clone());
  });
};
