var async = require('async');

(function () {

  var queue = null;
  var crawUrl = null;
  function init (options, onUrlToCrawl, endCallback) {

      crawUrl = onUrlToCrawl;
      queue = async.queue(function(options,callback) {
            crawUrl(options, callback);
      },options.maxConnections);

      queue.drain = endCallback;
  }

  function push(options) {
      queue.push(options);
  }

  function idle() {
      return queue.idle();
  }

  module.exports.init = init;
  module.exports.push = push;
  module.exports.idle = idle;
  //module.exports.queue = queue;
  //module.exports.idle = idle;

}());
