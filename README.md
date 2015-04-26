Crawler Ninja
-------------

This crawler aims to help SEO to build custom solutions for crawling/scraping sites.
For example, this crawl can help to audit a site, find expired domains, build corpus, find netlinking spots, retrieve site ranking, check if web pages are correctly indexed, ...

This is just a matter of plugins ! :-) We plan to build generic & simple plugins but you are free to create your owns.

The best environment to run Crawler Ninja is a linux server.


Help & Forks welcomed ! or please wait ... work in progress !

How to install
--------------

    $ npm install crawler-ninja


Crash course
------------
*How to use an existing plugin ?*

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

*Create a new plugin*

This is not mandatory to implement all crawler events. You can also reduce the scope of the crawl by using the different options (see below).


```javascript

// userfull lib for managing uri
var URI    = require('crawler/lib/uri');


function Plugin(crawler) {

    this.crawler = crawler;

    /**
     * Event when the crawler found an error
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
     * @param the jquery like object for accessing to the HTML tags. Null is the resource
     *        is not an HTML
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


Options reference
-----------------

TODO

Current Plugins
---------------

- Console Log
- Stat
- Audit



Rough todolist
--------------

 * Add proxy supports (in progress)
 * More & more plugins
 * Use Riak as default persistence layer
 * Use RabbitMQ
 * Build UI : dashboards, view project data, ...


ChangeLog
---------

0.1.0
 - crawler engine that support navigation through a.href, detect images, links tag & scripts.
 - Add flexible parameters to crawl (see in the file : index.js) like the crawl depth, crawl rates, craw external links, ...
 - Implement a basic log plugin & an SEO audit plugin.
