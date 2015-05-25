/**
 * This is a simple plugin which log on the console the crawled urls
 *
 */
var log = require("../lib/logger.js").Logger;

function Plugin(crawler) {
   this.crawler = crawler;


   var self = this;

   this.crawler.on("crawl", function(result, $) {
      var data = {
          statusCode    : result.statusCode,
          method        : result.method,
          url           : result.uri,
          responseTime  : result.responseTime,
          proxy         : (result.proxy ? result.proxy : ""),
          error         : false
      }
      log.info(data);
      

   });

   this.crawler.on("error", function(error, result) {

     var data = {
       errorCode     : error.code,
       method        : result.method,
       url           : result.uri,
       proxy         : (result.proxy ? result.proxy : ""),
       error         : true
     }

     log.error(data);

   });

 }


module.exports.Plugin = Plugin;
