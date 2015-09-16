var async       = require('async');
var _           = require('underscore');
var URI         = require("./uri.js");
var request     = require("./http-request.js");
var logger      = require("../lib/logger.js").Logger;
var store       = require("../lib/store/store.js");

/**
 * The Request Queue
 *
 * its main job is to make the http requests & analyze the responses
 * It is used an internal queue to limit the number of workers
 *
 * @param the options to use to make the requests.
 *
 */
var Requester = function(options) {

    this.options = options;
    this.initQueue();
}

/**
 * Add a new url to crawl in the queue.
 * Check the desired options and add it to a request queue
 *
 * @param the options used to crawl the url
 *
 */
Requester.prototype.queue = function (options) {

      var self = this;
      // Up to you to use uri or url.
      if (options.uri) {
        options.url = options.uri;
      }
      else {
        options.uri = options.url;
      }

      // if skipDuplicates, don't crawl twice the same uri
      if (this.options.skipDuplicates) {
          store.getStore().isInCrawlHistory(options.uri, function(error, isInCrawlHistory) {
            if (isInCrawlHistory) {
              log("Don't crawl this url - Option skipDuplicates=true & the url has already been crawled : " + options.url);
            }
            else {
              store.getStore().addInHistory(options.uri,function(error) {
                self.q.push(options);
                log("Add in the request queue", options.url);
              });
            }

          });
      }
      else {
          log("Add in the request queue", options.url);
          this.q.push(options);
      }


}


/**
 *  @return false if there are items waiting or being processed in the queue, or true if not.
 *
 */
Requester.prototype.idle = function() {
    return this.q.idle();
}

/*****************************************************************************************
 *
 *      PRIVATES FUNCTIONS
 *
 ******************************************************************************************/

/**
 * Init the queue
 *
 */
Requester.prototype.initQueue = function () {

  var self = this;
  this.q = async.queue(
               function (options, callback) {

                    log("Start crawling ", options.url);
                    //console.log(options);
                    // If the domain is in the blacklist => don't crawl the url
                    if (options.domainBlackList.indexOf(URI.domainName(options.url)) > 0) {
                        log("Domain of the url is in the blacklist : " + options.url);
                        options.onCrawl({code:"DOMAINBLACKLIST"}, options, function(error){
                          callback(error);
                        });
                        return;
                    }

                    // Check if there are some errors for the host & make the appropriate crawl in function of that
                    store.getStore().getHostErrors(options.url, function(error, errorInfo) {
                          log("Check if errors already exist : " + options.url );
                          if (error) {
                              self.onStoreError(error, options);
                              return callback();
                          }

                          if (errorInfo) {
                              self.crawlWithErrors(options, errorInfo, callback);
                          }
                          else {
                              self.crawl(options, callback);
                          }
                    });


               },
               self.options.maxConnections);

  this.q.drain = function() {

      if (self.options.onDrain) {
        self.options.onDrain();
      }
  }
}

/**
 *  Stop the crawl if the crawl persistence store provides some errors
 *
 *
 * @param the error provided by the persistence store
 * @param the crawl options
 *
 */
Requester.prototype.onStoreError = function(error, options, callback) {
    log("Error from the crawl persistence service : " + error.code + " for host : " + host + " - url : " + options.url + " (crawl canceled for this url)");
    options.onCrawl({code:"STOPCRAWL"}, options, function(error){
      callback(error);
    });
}

/**
 * Crawl one url with optionnaly a delay (rate limit)
 *
 *
 * @param the crawl options
 * @param the callback used to inform the queue that request is finished
 */
Requester.prototype.crawl = function(options, callback) {

        var self = this;

        if (options.rateLimits != 0) {
            log("Request with option on ratelimit = " + options.rateLimits +  " for " + options.url);
            setTimeout(function() {

              self.execHttp(options, callback);

            }, options.rateLimits);
        }
        else {
          self.execHttp(options, callback);
        }


}
/**
 * Crawl an url for a host which has already provided some errors (timout, connection refused, ... )
 *
 *
 * @param the crawl options
 * @param the info on errors
 * @param the callback used to inform the queue that request is finished
 */
Requester.prototype.crawlWithErrors = function(options, errorInfo, callback) {

  log("Crawl with errors " + options.url, errorInfo);
  var self = this;

  if (errorInfo.stopCrawlOnThisDomain) {
      log("Too many errors on the domain : " +  host  + " - Stop to crawl its URLS - from " + options.url, errorInfo);
      options.onCrawl({code:"STOPCRAWL"}, options, function(error) {
        callback(error);
      });

      return;
  }


  if (errorInfo.forceRateLimits) {
    log("Too many errors on the domain : " +  host  +  " - Force request with rate limit : " +
        options.errorRates[errorInfo.currentRateLimitIndex] +
        " for " + options.url, errorInfo);

    setTimeout(function() {
      self.execHttp(options, callback);

    }, options.errorRates[errorInfo.currentRateLimitIndex]);

    return;
  }

  //Case of a retry due to a previous http error on the same request
  if (options.maxRetries < options.retries) {
    log("Retry Request -  maxRetries =" + options.maxRetries +  " - retries : " + options.retries  +  " for " + options.url);
    setTimeout(function() {
      self.execHttp(options, callback);

    }, options.retryTimeout);
    return;

  }

  log("Invalid Error option - last crawl of the url", options);
  this.crawl(options, callback);

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
    log("Execute the request :" + options.url);
    request(options, function(error, result) {
      log("Execute the request done :" + options.url);
      if (error) {
        self.onRequestError(error, options, result, callback);
      }
      else {
        options.onCrawl(null, result, function(error){
          callback(error);
        });
      }

    });


}

/**
 *  Callback used when a Http request generates an error
 *
 *
 * @param The Http error
 * @param the crawl options
 * @param the HTTP response
 * @param callback()
 */
Requester.prototype.onRequestError = function (error, options, result, callback) {

    var self = this;

    // if the error is a timeout :
    // 1. Check the crawl rate and if necessary decrease it for slower skipDuplicates
    // 2. Save the error info for the associated host.
    // 3. recrawl the url if the maximum of retries is not yet reaches
    if (error.code ==  'ETIMEDOUT' || error.code ==  'ESOCKETTIMEDOUT') {
        log("Request Error - Timeout for : " + options.url);
        var execOnError = async.compose(self.recrawlUrl, self.saveErrorInfo, self.checkCrawlRate);

        execOnError({options : options, result : result, error : error,crawler : self}, function(err, params){
            callback();
        });
        return;

    }

    // if it is a connection error, recrawl the url if the maximum of retries is not yet reaches
    if (error.code ==  'ECONNRESET' || error.code ==  'ECONNREFUSED' ) {
          log("Request Error - connection refused for : " + options.url);
          this.recrawlUrl({options : options, result : result, error : error, crawler : self}, function(error,params){
            callback();
          });
          return;
    }

    // For the other kind of errors, just inform the crawler
    options.onCrawl(error, result, function(error) {
      callback(error);
    });


};

/**
 * In the case of a timeout error, this method is call in order to check
 * if it is not necessary to decrease the crawl rate
 *
 *
 * @param the crawl params (options, result, errors, errorInfo)
 * @param callback(error, params)
 */
Requester.prototype.checkCrawlRate = function (params, callback) {


    var self = this;

    store.getStore().getHostErrors(params.options.url, function(error, errorInfo) {

          if (error) {
              self.onStoreError(error, params.options);
              return callback(error);
          }

          params.errorInfo = errorInfo;

          if (! errorInfo) {
              log("Check Crawl Rate - Not yet ErrorInfo for : " + params.options.url);
              params.errorInfo = { numberOfErrors : 0, currentRateLimitIndex : -1, forceRateLimits : false};
          }
          params.errorInfo.numberOfErrors++;


          if (params.options.maxErrors != -1 && params.errorInfo.numberOfErrors == params.options.maxErrors ) {
              self.decreaseCrawlRate(params, callback);
          }
          else {
            log("Check Crawl Rate - don't decrease rate (number of errors < max number of errors) : " + params.options.url);
            callback(null,params);
          }
    });


}

/**
 * In the case of a timeout error and if there are too many errors,
 * this method will decrease the crawl rate or stop the crawl for the
 * associated domain
 *
 * @param the crawl params (options, result, errors, errorInfo)
 * @param callback(error, params)
 */
Requester.prototype.decreaseCrawlRate = function(params, callback) {

    params.errorInfo.currentRateLimitIndex++;
    // If there is still an available rate limit
    if (params.options.errorRates.length > 0 && params.errorInfo.currentRateLimitIndex < params.options.errorRates.length) {
      params.errorInfo.numberOfErrors = 0;
      params.errorInfo.forceRateLimits = true;
      log("Decrease Crawl Rate - Too many errors, set rateLimits to " +
           params.options.errorRates[params.errorInfo.currentRateLimitIndex]  +  " - last error on : " + params.options.url);

      params.options.maxRetries = params.options.retries;

    }
    // we stop to crawl on this domain if all rate limits have been used
    else {
      log("Decrease Crawl Rate - Stop crawl domain  - all crawl rates done : " + params.options.url);
      params.errorInfo.stopCrawlOnThisDomain = true;
    }

    callback(null, params);
}

/**
 * Save the error info into the crawl persistence store
 *
 *
 * @param the crawl params (options, result, errorInfo)
 * @param callback(error, params)
 */
Requester.prototype.saveErrorInfo = function(params, callback) {

    store.getStore().setHostErrors(params.options.url, params.errorInfo, function(error) {
        callback(null, params);
    });

}

/**
 * Recrawl an url if the maximum of retries is no yet fetch
 *
 *
 * @param the crawl params (options, result, errorInfo)
 * @param callback(error, params)
 */
Requester.prototype.recrawlUrl = function(params, callback) {

  if (params.result.maxRetries > 1) {
      log("Recrawl : " + params.options.url);
      params.result.maxRetries--;

      //TODO : async this code
      store.getStore().removeFromHistory(params.result.url);
      params.crawler.queue(params.result);

      callback(null, params);
  }
  else {

      log("Don't recrawl - end of retries for : ", params.result.url);
      params.options.onCrawl(params.error, params.result, function(error){
        callback(error, params);
      });

  }

}

/**
 * Log method
 *
 *
 * @param the message to log
 * @param the crawl option (can be optional)
 */
var log = function(message, options) {

    //console.log(message, options ? option, "");

    var data = {
        step    : "request-queue",
        message : message,
        options : options
    }

    logger.debug(data);


}

module.exports.Requester = Requester;
