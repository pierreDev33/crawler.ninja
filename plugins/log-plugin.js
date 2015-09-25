/**
 * This is a simple plugin which log the crawled urls
 *
 */
var log = require("../lib/logger.js").Logger;

function Plugin(crawler) {
   this.crawler = crawler;


}

Plugin.prototype.crawl = function(result, $, callback) {

      var data = {
          statusCode    : result.statusCode,
          method        : result.method,
          url           : result.uri,
          responseTime  : result.responseTime,
          proxy         : (result.proxy ? result.proxy : ""),
          error         : false
      }
      log.info(data);
      callback();
}

Plugin.prototype.error = function(error, result, callback) {

     var data = {
       errorCode     : error.code,
       method        : result.method,
       url           : result.uri,
       proxy         : (result.proxy ? result.proxy : ""),
       error         : true
     }

     log.error(data);
     callback();

}



module.exports.Plugin = Plugin;
