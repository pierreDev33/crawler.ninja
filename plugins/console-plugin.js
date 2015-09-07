/**
 * This is a simple plugin which log on the console the crawled urls
 *
 */

function Plugin(crawler) {
   this.crawler = crawler;


   var self = this;

   this.crawler.on("crawl", function(result, $) {
      console.log(result.statusCode + ',' + result.method + ',' +
                  result.uri + ',' + result.responseTime + ',' + (result.proxy ? result.proxy : "no-proxy") );
   });

   this.crawler.on("error", function(error, result) {

     console.log("Error : " + error.code + ',' + + result.method + ',' +
                 result.uri + ',' + result.responseTime + ',' + (result.proxy ? result.proxy : "no-proy"));

   });


   this.crawler.on("end", function() {

     console.log("End of the crawl");

   });

 }


module.exports.Plugin = Plugin;
