var async       = require('async');
var _           = require('underscore');
var Set         = require("collections/fast-set");
var Map         = require("collections/fast-map");
var URI         = require("./uri.js");
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

    // Error info per domains
    // Use to force a crawl rate limit on a domain or cancel the crawl if there are too many errors
    this.domainErrors = new Map();

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

                    // Case of too many errors on a domain
                    // => use a crawl rate limit or stop to crawl this domain
                    var host = URI.host(options.url);
                    if (self.domainErrors.has(host)) {
                        var errorInfo = self.domainErrors.get(host);

                        if (errorInfo.stopCrawlOnThisDomain) {
                            log("Too many errors on the domain : " +  host  + " - Stop to crawl its URLS - from " + options.url);
                            options.onCrawl({code:"STOPCRAWL"}, options);
                            callback();
                            return;
                        }


                        if (errorInfo.forceRateLimits) {
                          log("Too many errors on the domain : " +  host  +  " - Force request with rate limit : " +
                              options.errorRates[errorInfo.currentRateLimitIndex] +
                              " for " + options.url);

                          setTimeout(function() {
                            self.execHttp(options, callback);

                          }, options.errorRates[errorInfo.currentRateLimitIndex]);
                          return;
                        }
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

        // If too many timeouts, decrease the crawl rate
        // & make another request on the same url
        if (self.hasTooManyErrors(result)) {
            result = self.decreaseCrawlRate(result);

            self.history.remove(result.url);
            self.queue(result);
            callback();
            return;
        }
      }
      // If there is an error & options.retries
      // make a new request with a rate limit
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


Requester.prototype.hasTooManyErrors = function (options) {

    var errorInfo;
    var host = URI.host(options.url);

    if (this.domainErrors.has(host)) {
        errorInfo = this.domainErrors.get(host);
    }
    else {
        errorInfo = { numberOfErrors : 0, currentRateLimitIndex : -1, forceRateLimits : false};
    }
    errorInfo.numberOfErrors++;

    this.domainErrors.set(host, errorInfo);

    if (options.maxErrors != -1 && errorInfo.numberOfErrors == options.maxErrors ) {
        return true;
    }
    else {
        return false;
    }


}

Requester.prototype.decreaseCrawlRate = function(options) {

    var host = URI.host(options.url);
    var errorInfo = this.domainErrors.get(host);

    errorInfo.currentRateLimitIndex++;
    // If there is still an available rate limit
    if (options.errorRates.length > 0 && errorInfo.currentRateLimitIndex < options.errorRates.length) {

      errorInfo.numberOfErrors = 0;
      errorInfo.forceRateLimits = true;
      log("Too many errors, set rateLimits to " +  options.errorRates[errorInfo.currentRateLimitIndex]  +  " - last error on : " + options.url);

      options.maxRetries = options.retries;

    }

    // we don't continue to crawl the domain if all rate limits have been used
    else {
      errorInfo.stopCrawlOnThisDomain = true;
    }

    this.domainErrors.set(host, errorInfo);
    return options;

}

log = function(message) {

    var data = {
        step    : "request-queue",
        message : message
    }

    logger.info(data);

}

module.exports.Requester = Requester;
