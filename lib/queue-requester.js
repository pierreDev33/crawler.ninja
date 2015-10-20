/**
 * The Request Queue
 *
 * its main job is make the http requests & analyze the responses
 * It is used an internal queue to limit the number of workers
 *
 */
var async       = require('async');
var _           = require('underscore');
var log         = require("crawler-ninja-logger").Logger;
var URI         = require("./uri.js");
var request     = require("./http-request.js");
var store       = require("../lib/store/store.js");


(function () {

  var requestQueue = {};


  /**
   * Init the Queue Requester
   *
   *
   * @param The number of task/connection that the request queu can start in parallel
   * @param the callback executes when all task (url to cralw) are completed
   *
   */

  function init (maxConnections, onDrain) {
      createQueue(maxConnections, onDrain);
  }

  /**
   * Add a new url to crawl in the queue.
   * Check the desired options and add it to a request queue
   *
   * @param the options used to crawl the url
   *
   */
  function queue(options) {

        // Up to you to use uri or url.
        if (options.uri) {
          options.url = options.uri;
        }
        else {
          options.uri = options.url;
        }

        // if skipDuplicates, don't crawl twice the same uri
        if (options.skipDuplicates) {
            store.getStore().isInCrawlHistory(options.uri, function(error, isInCrawlHistory) {
              if (isInCrawlHistory) {
                log.warn({"url" : options.url, "step" : "queue-resquester.queue", "message" :  "Don't crawl this url - Option skipDuplicates=true & the url has already been crawled" });
              }
              else {
                store.getStore().addInHistory(options.uri,function(error) {

                  requestQueue.push(options);
                  log.info({"url" : options.url, "step" : "queue-resquester.queue", "message" : "Add in the request queue"});

                });
              }

            });
        }
        else {
            log.info({"url" : options.url, "step" : "queue-resquester.queue", "message" : "Add in the request queue"});
            requestQueue.push(options);
        }




  }


  /**
   *  @return false if there are some URL waiting to be crawled or being processed in the queue, or true if not.
   *
   */
  idle = function() {
      return requestQueue.idle();
  }

  /*****************************************************************************************
   *
   *      PRIVATES FUNCTIONS
   *
   ******************************************************************************************/

  /**
   * Create the Request Queue
   *
   */
  function createQueue (maxConnections, onDrain) {
    requestQueue = async.queue(onUrlToCrawl,maxConnections);
    requestQueue.drain = onDrain;

  }

  function onUrlToCrawl(options, callback) {

      log.debug({"url" : options.url, "step" : "queue-resquester.execQueueTask", "message" : "Start Crawling"});
      // If the domain is in the blacklist => don't crawl the url
      if (options.domainBlackList.indexOf(URI.domainName(options.url)) > 0) {

          log.error({"url" : options.url, "step" : "queue-resquester.execQueueTask", "message" : "Domain of the url is in the blacklist"});
          options.onCrawl({code:"DOMAINBLACKLIST"}, options, function(error){
            process.nextTick(function() {callback(error)});
          });
          return;
      }

      // Check if there are some errors for the host & make the appropriate crawl in function of that
      store.getStore().getHostErrors(options.url, function(error, errorInfo) {
            log.debug({"url" : options.url, "step" : "queue-resquester.execQueueTask", "message" : "Check if errors already exist"});

            if (error) {
                onStoreError(error, options);
                return callback();
            }

            if (errorInfo) {
                crawlWithErrors(options, errorInfo, callback);
            }
            else {
                crawl(options, callback);
            }
      });

  }

  /**
   *  Stop the crawl if the crawl persistence store provides some errors
   *
   *
   * @param the error provided by the persistence store
   * @param the crawl options
   *
   */
  function onStoreError(error, options, callback) {
      log.error({"url" : options.url , "step" : "queue-resquester.onStoreError", "message" : "Error from the crawl persistence service (crawl canceled for this url) : " + error.code});
      options.onCrawl({code:"STOPCRAWL"}, options, function(error){
        process.nextTick(function() {callback(error)});
      });
  }

  /**
   * Crawl one url with optionnaly a delay (rate limit)
   *
   *
   * @param the crawl options
   * @param the callback used to inform the queue that request is finished
   */
  function crawl(options, callback) {

          if (options.rateLimits != 0) {

              log.error({"url" : options.url, "step" : "queue-resquester.crawl", "message" : "Request with option on ratelimit = " + options.rateLimits});
              setTimeout(function() {
              execHttp(options, callback);

              }, options.rateLimits);
          }
          else {
            execHttp(options, callback);
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
  function crawlWithErrors(options, errorInfo, callback) {

    log.warn({"url" : options.url, "step" : "queue-resquester.crawlWithErrors", "message" : "Crawl with errors", "options" : "errorInfo"});

    if (errorInfo.stopCrawlOnThisDomain) {
        log.error({"url" : options.url, "step" : "queue-resquester.crawlWithErrors", "message" : "Too many errors on the domain - Stop to crawl its URLS"});

        options.onCrawl({code:"STOPCRAWL"}, options, function(error) {
          process.nextTick(function() {callback(error)});
        });

        return;
    }

    if (errorInfo.forceRateLimits) {
      log.warn({"url" : options.url, "step" : "queue-resquester.crawlWithErrors", "message" : "Too many errors on the domain - Force request with rate limit" });
      setTimeout(function() {
        execHttp(options, callback);

      }, options.errorRates[errorInfo.currentRateLimitIndex]);

      return;
    }

    //Case of a retry due to a previous http error on the same request
    if (options.maxRetries < options.retries) {
      log.warn({"url" : options.url, "step" : "queue-resquester.crawlWithErrors", "message" : "Retry Request -  maxRetries =" + options.maxRetries +  " - retries : " + options.retries});
      setTimeout(function() {
         execHttp(options, callback);

      }, options.retryTimeout);
      return;

    }

    log.error({"url" : options.url, "step" : "queue-resquester.crawlWithErrors", "message" : "Invalid Error option - last crawl of the url", "options" : "errorInfo" });
    crawl(options, callback);

  }

  /**
   * Execute an http request
   *
   * @param The options to used for the request
   * @param callback executed when the request is finished
   *
   */
  function execHttp(options, callback) {

      if (options.proxyList) {
        options.proxy  = options.proxyList.getProxy().getUrl();
      }
      log.debug({"url" : options.url, "step" : "queue-requester.execHttp", "message" : "Execute the request"});
      request(options, function(error, result) {
        log.debug({"url" : options.url, "step" : "queue-requester.execHttp", "message" : "Execute the request done"});
        if (error) {
          onRequestError(error, options, result, callback);
        }
        else {
          options.onCrawl(null, result, function(error){
            process.nextTick(function() {callback(error)});
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
  function onRequestError(error, options, result, callback) {

      // if the error is a timeout :
      // 1. Check the crawl rate and if necessary decrease it for slower skipDuplicates
      // 2. Save the error info for the associated host.
      // 3. recrawl the url if the maximum of retries is not yet reaches
      if (error.code ==  'ETIMEDOUT' || error.code ==  'ESOCKETTIMEDOUT') {
          log.error({"url" : options.url, "step" : "queue-requester.onRequestError", "message" : "Timeout"});
          var execOnError = async.compose(recrawlUrl, saveErrorInfo, checkCrawlRate);

          execOnError({options : options, result : result, error : error}, function(err, params){
              process.nextTick(function() {callback()});
          });
          return;

      }

      // if it is a connection error, recrawl the url if the maximum of retries is not yet reaches
      if (error.code ==  'ECONNRESET' || error.code ==  'ECONNREFUSED' ) {
            log.error({"url" : options.url, "step" : "queue-requester.onRequestError", "message" : "connection refused"});
            recrawlUrl({options : options, result : result, error : error}, function(error,params){
            process.nextTick(function() {callback()});
            });
            return;
      }

      // For the other kind of errors, just inform the crawler
      options.onCrawl(error, result, function(error) {
        process.nextTick(function() {callback(error)});
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
  function checkCrawlRate(params, callback) {

      store.getStore().getHostErrors(params.options.url, function(error, errorInfo) {

            if (error) {
                onStoreError(error, params.options);
                return callback(error);
            }

            params.errorInfo = errorInfo;

            if (! errorInfo) {
                params.errorInfo = { numberOfErrors : 0, currentRateLimitIndex : -1, forceRateLimits : false};
            }
            params.errorInfo.numberOfErrors++;


            if (params.options.maxErrors != -1 && params.errorInfo.numberOfErrors == params.options.maxErrors ) {
                decreaseCrawlRate(params, callback);
            }
            else {
              log.info({"url" : params.options.url, "step" : "queue-requester.checkCrawlRate", "message" : "Don't decrease rate (number of errors < max number of errors)"});
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
  function decreaseCrawlRate(params, callback) {

      params.errorInfo.currentRateLimitIndex++;
      // If there is still an available rate limit
      if (params.options.errorRates.length > 0 && params.errorInfo.currentRateLimitIndex < params.options.errorRates.length) {
        params.errorInfo.numberOfErrors = 0;
        params.errorInfo.forceRateLimits = true;
        log.warn({"url" : params.options.url, "step" : "queue-requester.decreaseCrawlRate", "message" : "Too many errors, set rateLimits to " + params.options.errorRates[params.errorInfo.currentRateLimitIndex]});

        params.options.maxRetries = params.options.retries;

      }
      // we stop to crawl on this domain if all rate limits have been used
      else {
        log.error({"url" : params.options.url, "step" : "queue-requester.decreaseCrawlRate", "message" : "Stop crawl domain  - all crawl rates done"});
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
  function saveErrorInfo(params, callback) {

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
  function recrawlUrl(params, callback) {

    if (params.result.maxRetries > 1) {
        log.warn({"url" : params.options.url, "step" : "queue-requester.recrawlUrl", "message" : "Recrawl"});
        params.result.maxRetries--;

        //TODO : async this code
        store.getStore().removeFromHistory(params.result.url);
        queue(params.result);

        callback(null, params);
    }
    else {
        log.warn({"url" : params.result.url, "step" : "queue-requester.recrawlUrl", "message" : "Don't recrawl - end of retries"});
        params.options.onCrawl(params.error, params.result, function(error){
          callback(error, params);
        });

    }

  }

  module.exports.init = init;
  module.exports.queue = queue;
  module.exports.idle = idle;


}());
