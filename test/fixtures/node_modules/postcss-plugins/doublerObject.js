const postcss = require('postcss');
const doubler = require('./doubler');

module.exports = () => {
  const processor = postcss();
  processor.use(doubler);
  return processor;
};
