---
dummy: 42
---

module.exports = {
  plugins: Array(3).fill(require('../../postcss-plugins/doubler')),
};
