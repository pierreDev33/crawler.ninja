var async       = require('async');
var _           = require('underscore');
var Set         = require("collections/fast-set");
var request     = require("./http-request.js");
var logger      = require("../lib/logger.js").Logger;

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

    this.numberOfErrors = 0;
    this.globalRateLimits = 0;
    this.forceRateLimits = false;

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

                    if (this.forceRateLimits) {
                      log("Force request with rate limit -  globalRateLimits =" + this.globalRateLimits + " for " + options.url);
                      setTimeout(function() {
                        self.execHttp(options, callback);

                      }, this.globalRateLimits);
                      return;
                    }

                    //Case of a retry due to an previous http error on the same request
                    if (options.maxRetries < options.retries) {
                      log("Retry Request -  maxRetries =" + options.maxRetries +  " - retries : " + options.retries  +  " for " + options.url);
                      setTimeout(function() {
                        self.execHttp(options, callback);

                      }, options.retryTimeout);
                      return;
                    }

                    if (options.rateLimits != 0) {
                        log("Request with option on ratelimit = " + options.rateLimits +  " for " + options.url);
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

      if (error && error.code ==  'ETIMEDOUT') {

        // If too many timeout, decrease the crawl rate
        self.numberOfErrors++;
        if (options.maxErrors != -1 &&
            self.numberOfErrors == options.maxErrors && self.globalRateLimits < 500 ) {
            result = self.decreaseCrawlRate(result);
            self.history.remove(result.url);
            self.queue(result);
            return;
        }
      }
      // If there is an error (eg. timout) & retries
      // Remove the url from the history & add the url into
      // the request queue, the same request will be eecuted with a delay
      if (error && error.code ==  'ETIMEDOUT' && result.maxRetries > 1) {
          result.maxRetries--;
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


Requester.prototype.decreaseCrawlRate = function(options) {

    this.numberOfErrors = 0;
    this.forceRateLimits = true;
    if (this.globalRateLimits == 0) {
      log(" Too many errors, set rateLimits to 200 - last error on : " + options.url);
      this.globalRateLimits = 200;
    }
    else {
      if (this.globalRateLimits == 200) {
        log(" Too many errors, set rateLimits to 350 - last error on : " + options.url);
        this.globalRateLimits = 350;
      }
      else {
        log(" Too many errors, set rateLimits to 500 - last error on : " + options.url);
        this.globalRateLimits = 500;
      }
    }

    options.maxRetries = options.retries;
    return options;

}

log = function(message) {

    var data = {
        step    : "queue",
        message : message
    }

    logger.info(data);
}

module.exports.Requester = Requester;
