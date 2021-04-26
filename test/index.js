const X = require('../');

const Future = X.default;

Future.defer = Future.deferred = function () {
  let dfd = {}
  dfd.Promise = new Future((resolve, reject)=>{
      dfd.resolve = resolve;
      dfd.reject = reject;
  });
  return dfd;
}
module.exports = Future;