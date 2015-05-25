var async       = require('async');
var _           = require('underscore');
var Set         = require("collections/fast-set");
var request     = require("./http-request.js");


/**
 * The request queue
 *
 * its main job is to make the http request & get the response
 * It is used a internal queue to limit the number of workers
 *
 * @param the default options to use to make the requests.
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

/**
 * Execute an http request
 *
 * @param The options to used for the request
 * @param callback executed when the request is finished
 *
 */
Requester.prototype.execHttp = function (options, callback) {

    var self = this;
    if (this.options.proxyList) {
      options.proxy  = this.options.proxyList.getProxy().getUrl();
    }

    request(options, function(error, result) {

      // If there is an error (eg. timout) & retries
      // Remove the url from the history & add the url into
      // the request queue
      if (error && result.retries && result.retries > 1) {
          result.retries--;
          self.history.remove(result.url);
          self.queue(result);

      }
      else {
        options.onCrawl(error, result);
      }
      callback();


    });


}

/**
 * Add a new url to crawl. Check the desired options and add it to a request queue
 *
 * @param the options used to configure the crawl
 *
 */
Requester.prototype.queue = function (options) {

    // Up to you to use uri or url.
    if (options.uri) {
      options.url = options.uri;
    }
    else {
      options.uri = options.url;
    }


    // if skipDuplicates, don't crawl twice the same uri
    if (this.options.skipDuplicates) {

      if(this.history.has(options.uri)) {
          return;
      }
      else {
        this.history.add(options.uri);
      }

    }

    this.q.push(options);

}

Requester.prototype.idle = function() {
  return this.q.idle();
}

module.exports.Requester = Requester;
