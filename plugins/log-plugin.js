/**
 * This is a simple plugin which log on the console the crawled urls
 *
 * Each plugin has to listen the "crawl" event emitted by the crawler
 * the args for this event function are :
 * - error : error generated during a crawl step
 * - result : information on the request/url to crawl
 *    this json object contains mainly the following attributes :
 *    result.uri                   : URL of the page
 *    result.headers (json object) : http header like content-type, content-length,
 *    result.status                : HTTP status code (200, 404, 301, ...)
 *    result.body                  : HTML body
 * - $ : Cheerio representation of the body in order to make jquey style queries on the html content
 *
 */


function Plugin(crawler) {
   this.crawler = crawler;

   var self = this;

   this.crawler.on("crawl", function(result, $) {
     console.log(result.statusCode + " - " + result.options.method +" - " +
                 result.uri + ' - response time : ' + result.responseTime + "ms");
   });

   this.crawler.on("error", function(error, result) {
      console.log("Error on : " + result.uri + ":" +  error);
   });

 }


module.exports.Plugin = Plugin;
