Crawler Ninja
-------------

This crawler aims to help SEO to build custom solutions for crawling/scraping sites.
For example, it can help to audit a site, find expired domains, build corpus, scrap texts, find netlinking spots, retrieve site ranking, check if web pages are correctly indexed, ...

This is just a matter of plugins ! :-) We plan to build generic & simple plugins but you are free to create your owns.

The best environment to run Crawler Ninja is a linux server.


Help & Forks welcomed ! or please wait ... work in progress !

How to install
--------------

    $ npm install crawler-ninja --save


Crash course
------------
###How to use an existing plugin ?

```javascript
var crawler = require("crawler-ninja");
var logger  = require("crawler-ninja/plugins/log-plugin");

var c = new crawler.Crawler();
var log = new logger.Plugin(c);

c.on("end", function() {

    var end = new Date();
    console.log("End of crawl !, done in : " + (end - start));


});

var start = new Date();
c.queue({url : "http://www.mysite.com/"});
```
This script logs on the console all crawled pages thanks to the usage of the log-plugin component.

The Crawler component emits different kind of events that plugins can use (see below).
When the crawl ends, the event 'end' is emitted.

###Create a new plugin

The following script show you the events callbacks that your have to implement for creating a new plugin.

This is not mandatory to implement all crawler events. You can also reduce the scope of the crawl by using the different crawl options (see below the section :  option references).


```javascript

// userfull lib for managing uri
var URI    = require('crawler/lib/uri');


function Plugin(crawler) {

    this.crawler = crawler;

    /**
     * Emits when the crawler found an error
     *
     * @param the usual error object
     * @param the result of the request (contains uri, headers, ...)
     */
    this.crawler.on("error", function(error, result) {

    });

    /**
     * Emits when the crawler crawls a resource (html,js,css, pdf, ...)
     *
     * @param result : the result of the crawled resource
     * @param the jquery like object for accessing to the HTML tags. Null is if the resource is not an HTML.
     * See the project cheerio : https://github.com/cheeriojs/cheerio
     */
    this.crawler.on("crawl", function(result,$) {

    });

    /**
     * Emits when the crawler founds a link in a page
     *
     * @param the page that contains the link
     * @param the link uri
     * @param the anchor text
     * @param true if the link is do follow
     */
    this.crawler.on("crawlLink", function(page, link, anchor, isDoFollow) {

    });


    /**
     * Emits when the crawler founds an image
     *
     * @param the page that contains the image
     * @param the image uri
     * @param the alt text
     */
    this.crawler.on("crawlImage", function(page, link, alt) {


    });

    /**
     * Emits when the crawler founds a redirect 3**
     *
     * @param the from url
     * @param the to url
     * @param statusCode : the exact status code : 301, 302, ...
     */
    this.crawler.on("crawlRedirect", function(from, to, statusCode) {

    });

}

module.exports.Plugin = Plugin;

```


Option references
-----------------


### The main crawler config options

You can pass these options to the Crawler() constructor like :

```javascript


var c = new crawler.Crawler({
  externalLinks : true,
  scripts : false,
  images : false
});


```

- maxConnections     : the number of connections used to crawl, default is 10.
- externalLinks      : if true crawl external links, default = false.
- externalDomains    : if true crawl the  external domains. This option can crawl a lot of different linked domains.
- scripts            : if true crawl script tags, default = true.
- links              : if true crawl link tags, default = true.
- linkTypes          : the type of the links tags to crawl (match to the rel attribute), default = ["canonical", "stylesheet"].
- images             : if true crawl images, default = true.
- protocols          : list of the protocols to crawl, default = ["http", "https"].
- timeout            : timeout per requests in milliseconds, default = 8000.
- retries            : number of retries if the request fails, default = 0.
- retryTimeout       : number of milliseconds to wait before retrying,  default = 10000.
- skipDuplicates     : if true skips URIs that were already crawled, default is true.
- rateLimits         : number of milliseconds to delay between each requests , default = 0.
                         Note that this option will force crawler to use only one connection
- depthLimit         : the depth limit for the crawl, default is no limit.
- followRedirect     : if true, the crawl will not return the 301, it will
 follow directly the redirection, default is false.
- proxyList          : The list of proxy to use for each crawler request (see below).



### Other options
You can pass these options to the Crawler() constructor if you want them to be global or as
items in the queue() calls if you want them to be specific to that item (overwriting global options)

Pool options:

 * `priorityRange`: Number, Range of acceptable priorities starting from 0 (Default 10),
 * `priority`: Number, Priority of this request (Default 5),


Server-side DOM options:

 * `jQuery`: true, false or ConfObject (Default true)
   see below [Working with Cheerio or JSDOM](https://github.com/paulvalla/node-crawler/blob/master/README.md#working-with-cheerio-or-jsdom)

Charset encoding:

 * `forceUTF8`: Boolean, if true will try to detect the page charset and convert it to UTF8 if necessary. Never worry about encoding anymore! (Default false),
 * `incomingEncoding`: String, with forceUTF8: true to set encoding manually (Default null)
     `incomingEncoding : 'windows-1255'` for example

Cache:

 * `cache`: Boolean, if true stores requests in memory (Default false)


Other:

 * `userAgent`: String, defaults to "node-crawler/[version]"
 * `referer`: String, if truthy sets the HTTP referer header
 * `rateLimits`: Number of milliseconds to delay between each requests (Default 0) Note that this option will force crawler to use only one connection (for now)

This options list is a strict superset of [mikeal's request options](https://github.com/mikeal/request#requestoptions-callback) and will be directly passed to the request() method.


### Add your own crawl rules

If the predefined options are not sufficiants, you can customize which kind of links to crawl by implementing a callback function in the crawler config object. This is a nice way to limit the crawl scope in function of your needs. The following example crawls only dofollow links.


```javascript


var c = new crawler.Crawler({
  // add here predefined options you want to override

  /**
   *  this callback is called for each link found in an html page
   *  @param  : the uri of the page that contains the link
   *  @param  : the uri of the link to check
   *  @param  : the anchor text of the link
   *  @param  : true if the link is dofollow
   *  @return : true if the crawler can crawl the link on this html page
   */
  canCrawl : function(htlmPage, link, anchor, isDoFollow) {
      return isDoFollow;
  }

});


```


Using proxies
-------------

Crawler.ninja can be configured to execute each http request through a proxy.
It uses the npm package [simple-proxies](https://github.com/christophebe/simple-proxies).

You have to install it in your project with the command :

    $ npm install simple-proxies --save


Here is a code sample that uses proxies from a file :

```javascript
var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var crawler     = require("crawler-ninja");
var logger      = require("crawler-ninja/plugins/log-plugin");


var proxyFile = "proxies.txt";

// Load proxies
var config = proxyLoader.config()
                        .setProxyFile(proxyFile)
                        .setCheckProxies(false)
                        .setRemoveInvalidProxies(false);

proxyLoader.loadProxyFile(config, function(error, proxyList) {
    if (error) {
      console.log(error);

    }
    else {
       crawl(proxyList);
    }

});


function crawl(proxyList){
    var c = new crawler.Crawler({
        externalLinks : true,
        images : false,
        scripts : false,
        links : false, //link tags used for css, canonical, ...
        followRedirect : true,
        proxyList : proxyList
    });

    var log = new logger.Plugin(c);

    c.on("end", function() {

        var end = new Date();
        console.log("Well done Sir !, done in : " + (end - start));


    });

    var start = new Date();
    c.queue({url : "http://www.site.com"});
}

```

Using the crawl logger in your own plugin
------------------------------------------

The current crawl logger is based on [winston](https://github.com/winstonjs/winston).
- It logs the all crawl actions & errors in the file ./logs/crawler.log.
- The list of crawled urls are in the file ./logs/urls.log.
- The list of errors can be found in ./logs/errors.log.


You can use the current logger or create a new one in your own Plugin

*Use default loggers*


```javascript

var log = require("../lib/logger.js").Logger;

log.info("log info");  // Log into crawler.log
log.debug("log debug"); // Log into crawler.log
log.error("log error"); // Log into crawler.log & errors.log

```

*Create a new logger for your plugin*

```javascript
// Log into crawler.log
var log = require("../lib/logger.js");

var myLog = log.createLogger("myLoggerName", "./logs/myplugin.log", true); //true = json output

```

More features & flexibilities will be added in the upcoming releases.


Current Plugins
---------------

- Log
- Stat
- Audit


Rough todolist
--------------

 * More & more plugins (in progress)
 * Use Riak as default persistence layer/Crawler Store
 * Multicore architecture and/or micro service architecture for plugins that requires a lot of CPU usage
 * CLI for extracting data from the Crawl Store
 * Build UI : dashboards, view project data, ...


ChangeLog
---------

0.1.0
 - crawler engine that support navigation through a.href, detect images, links tag & scripts.
 - Add flexible parameters to crawl (see the section crawl option above) like the crawl depth, crawl rates, craw external links, ...
 - Implement a basic log plugin & an SEO audit plugin.
 - Unit tests.

0.1.1
 - Add proxy support.
 - Gives the possibility to crawl (or not) the external domains which is different than crawling only the external links. Crawl external links means to check the http status & content of the linked external resources which is different of expand the crawl through the entire external domains.

0.1.2
 - Review Log component.
 - set the default userAgent to NinjaBot.
 - update README.

0.1.3
 - avoid crash for long crawls.

0.1.4
 - code refactoring in order to make a tentative of multicore proccess for making http requests

0.1.5
  - remove the multicore support for making http requests due to the important overhead. Plan to use multicore for some intensive CPU plugins.
  - refactor the rate limit and http request retries in case of errors.

0.1.6
 - Review logger : use winston, different log files : the full crawl, errors and urls. Gives the possibility to create a specific logger for a plugin.
