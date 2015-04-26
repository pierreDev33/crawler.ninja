Crawler Ninja
-------------

This crawler aims to help SEO to build custom solutions for crawling/scraping sites.
For example, this crawl can help to audit a site, find expired domains, build corpus, find netlinking spots, retrieve site ranking, check if web pages are correctly indexed, ...

This is just a matter of plugins ! :-) We plan to build generic & simple plugins but you are free to create your own.

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
    console.log("Well done Sir !, done in : " + (end - start));


});

var start = new Date();
c.queue({url : "http://www.authorize.net/"});
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
