/**
 *
 *  Memory implementation for a crawl persistence store
 *
 */

var Set         = require("collections/fast-set");
var Map         = require("collections/fast-map");
var URI         = require("crawler-ninja-uri");


var Store = function() {

    // Error info per host
    // Use to force a crawl rate limit on a host or cancel the crawl if there are too many errors
    this.hostErrors = new Map();

    // The crawl history
    this.history = new Set();

    // Store the depth for each crawled url
    // Override config.updateDepth function in order to use another storage
    // This default implementation is not recommanded for big crawl
    this.depthUrls = new Map();

    // list of the hosts from which the crawl starts
    this.startFromHosts = new Set();

    // list of the domains from wih the crawl starts
    this.startFromDomains = new Set();

}

/**
 * Get the current errors for a host
 *
 * @param one url of the host
 * @param callback(error, erroInfo)
 *
 * errorInfo = {
 *    numberOfErrors : 0, // the number of errors already generates by the hosts
 *    currentRateLimitIndex : -1,  // the current index for the rate limit array
 *    forceRateLimits : false // if true, we force the craw rate limit
 * }
 */

Store.prototype.getHostErrors = function (url, callback) {
    var host = URI.host(url);
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    callback(null, this.hostErrors.get(host));
};

/**
 * Persist a new errorInfo for a host
 *
 * @param one url of the host
 * @return callback(error)
 */

Store.prototype.setHostErrors = function (url, errorInfo, callback) {
    var host = URI.host(url);
    this.hostErrors.set(host, errorInfo);
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    callback();

};

/**
 *  Check if an url is in the crawl history (that means already crawled)
 *
 * @param the url to check
 * @param callback(error, true/false)
 */
Store.prototype.isInCrawlHistory = function(url, callback) {
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    callback(null, this.history.has(url));
}

/**
 * Add a new url in the crawl history
 *
 * @param the url to add
 * @param callback(error)
 */
Store.prototype.addInHistory = function(url, callback) {
    this.history.add(url);
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    if (callback) {
        callback();
    }
}

/**
 * Remove an url from the crawl history
 *
 * @param the url to remove
 * @param callback(error)
 */
Store.prototype.removeFromHistory = function(url, callback) {
  this.history.remove(url);
  /* TODO :
      process.nextTick(function() {
          callback(...);
      });
  */
  if (callback) {
      callback();
  }
}


/**
 * Get the current errors for a host
 *
 * @param one url of the host
 * @param callback(error, erroInfo)
 *
 * errorInfo = {
 *    numberOfErrors : 0, // the number of errors already generates by the hosts
 *    currentRateLimitIndex : -1,  // the current index for the rate limit array
 *    forceRateLimits : false // if true, we force the craw rate limit
 * }
 */

Store.prototype.getDepth = function (url, callback) {
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    callback(null, this.depthUrls.get(url));
};

Store.prototype.setDepth = function (url, depth, callback) {
    this.depthUrls.set(url, depth);
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    if (callback) {
      callback();
    }
};


Store.prototype.addStartUrls = function(urls, callback) {
    var self = this;
    urls.forEach(function(url){
        self.startFromHosts.add(URI.host(url));
        self.startFromDomains.add(URI.domain(url));
    });

    if (callback) {
      callback();
    }
}


Store.prototype.isStartFromUrl = function(parentUri, link, callback) {
    /* TODO :
        process.nextTick(function() {
            callback(...);
        });
    */
    callback(null,
        {
          parentUri : {
            isStartFromHost : this.startFromHosts.has(URI.host(parentUri)),
            isStartFromDomain : this.startFromDomains.has(URI.domain(parentUri))
          },
          link : {
            isStartFromHost : this.startFromHosts.has(URI.host(link)),
            isStartFromDomain : this.startFromDomains.has(URI.domain(link))
          }

       }
    );

}


Store.prototype.toString = function() {
    return "Memory Store";
};

module.exports.Store = Store;
