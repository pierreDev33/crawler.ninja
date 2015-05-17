/**
 * This is a simple plugin which log on the console the crawled urls
 *
 */
 var log = require("../lib/logger.js").Logger;

function Plugin(crawler) {
   this.crawler = crawler;


   var self = this;

   this.crawler.on("crawl", function(result, $) {
      log.info(result.statusCode + " - " + result.method +" - " +
                       result.uri + ' - response time : ' + result.responseTime + "ms" +
                       (result.proxy ? " - proxy : " + result.proxy : ""));
   });

   this.crawler.on("error", function(error, result) {
       log.info("Error on : " + result.uri + ":" +  error + (result.proxy ? " - proxy : " + result.proxy : ""));

   });

 }


module.exports.Plugin = Plugin;
