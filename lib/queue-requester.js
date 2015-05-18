var async       = require('async');
var _           = require('underscore');
var Set         = require("collections/fast-set");
var request     = require("./http-request.js");

/**
 * The request queue
 *
 * its main job is to make the http request & get the responsed
 * It is used a internal queue to limit the number of workers
 *
 * @param the config to uses to make the requests.
 *
 */
var Requester = function(options) {


    this.options = options;
    // The crawl history
    this.history = new Set();

    this.initQueue();


}

/**
 * Init the queue
 *
 */
Requester.prototype.initQueue = function () {

  var self = this;
  this.q = async.queue(
               function (options, callback) {

                    //Case of a retry due to an previous http error on the same request
                    if (options.retries < self.options.retries) {
                      setTimeout(function() {
                        self.execHttp(options, callback);

                      }, options.retryTimeout);
                      return;
                    }

                    if (typeof options.rateLimits === 'number' && options.rateLimits !== 0) {
                        setTimeout(function() {
                          self.execHttp(options, callback);

                        }, options.rateLimits);
                    } else {
                      self.execHttp(options, callback);
                    }
               },
               self.options.maxConnections);

  this.q.drain = function() {

      if (self.options.onDrain) {
        self.options.onDrain();
      }
  }

}

Requester.prototype.execHttp = function (options, callback) {

    var self = this;
    if (this.options.proxyList) {
      options.proxy  = this.options.proxyList.getProxy().getUrl();
    }

    request(options, function(error, result) {

      if (error && result.retries && result.retries > 1) {
          result.retries--;
          self.history.remove(result.url);
          self.queue(result);

      }
      else {

        self.options.callback(error, result);
      }
      callback();


    });


}

/**
 * Add a new url to crawl
 *
 * @param the options used to configure the crawl
 *
 */
Requester.prototype.queue = function(options) {

    options.uri = options.url;
    // if skipDuplicates, don't crawl twice the same uri
    if (this.options.skipDuplicates) {

      if(this.history.has(options.uri)) {
          return;
      }
      else {
        this.history.add(options.uri);
      }

    }

    var jsonOpt = _.extend(options, _.omit(this.options, _.keys(options)));
    this.q.push(jsonOpt);

    // Did you get a single object or string? Make it compatible.
    /*
    options = _.isString(options) || _.isPlainObject(options) ? [ options ] : options;
    if (options !== undefined && options.length == 1) {
        self._pushToQueue(
            _.isString(options[0]) ? { uri: options[0] } : options[0]
        );
    // Did you get multiple requests? Queue the URLs.
    } else if (options !== undefined) {
        self.queue(
            _.isString(options[0]) ? { uri: options[0] } : options[0]
        );
        self.queue(options.slice(1))
    }
    */
}


module.exports.Requester = Requester;
