/**
 * This is a simple plugin which log on the console the crawled urls
 *
 */
var log = require("../lib/logger.js").Logger;
var urlLog = require("../lib/logger.js").UrlLogger;

function Plugin(crawler) {
   this.crawler = crawler;


   var self = this;

   this.crawler.on("crawl", function(result, $) {
      log.info(result.statusCode + " - " + result.method +" - " +
                       result.uri + ' - response time : ' + result.responseTime + "ms" +
                       (result.proxy ? " - proxy : " + result.proxy : ""));
      urlLog.info(result.uri);
   });

   this.crawler.on("error", function(error, result) {
       log.error(error.code + " - " + result.method +" - " + result.uri +
                        (result.proxy ? " - proxy : " + result.proxy : ""));
       urlLog.info(result.uri + " (error)");

   });

 }


module.exports.Plugin = Plugin;
