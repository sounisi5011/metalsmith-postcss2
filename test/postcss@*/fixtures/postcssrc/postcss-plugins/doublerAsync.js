const doubler = require('./doubler');

module.exports = async css =>
  new Promise(resolve => {
    setTimeout(() => {
      doubler(css);
      resolve();
    });
  });
