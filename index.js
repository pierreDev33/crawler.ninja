var events    = require('events');
var util      = require("util");
var _         = require("underscore");
var JsCrawler = require("./lib/crawler.js");
var URI       = require('./lib/uri.js');
var Map       = require("collections/fast-map");
var Set       = require("collections/fast-set");

var DEFAULT_NUMBER_OF_CONNECTIONS = 10;
var DEFAULT_DEPTH_LIMIT = -1; // no limit
var DEFAULT_TIME_OUT = 8000;
var DEFAULT_RETRIES = 0;
var DEFAULT_RETRY_TIMEOUT = 10000;
var DEFAULT_SKIP_DUPLICATES = true;
var DEFAULT_RATE_LIMITS = 0;
var DEFAULT_CRAWL_EXTERNAL_LINKS = false;
var DEFAULT_PROTOCOLS_TO_CRAWL = ["http", "https"];
var DEFAULT_FOLLOW_301 = false;
var DEFAULT_DEDUG = false;
var DEFAULT_CRAWL_SCRIPTS = true;   // Crawl <script>
var DEFAULT_CRAWL_LINKS = true;     // Crawl <link>
var DEFAULT_LINKS_TYPES = ["canonical", "stylesheet"]
var DEFAULT_CRAWL_IMAGES = true;


/**
 * The crawler object
 *
 * @param config used to customize the crawler.
 *
 *  The current config attributes are :
 *  - maxConnections     : the number of connections used to crawl - default is 10
 *  - externalLinks      : if true crawl external links
 *  - scripts            : if true crawl script tags
 *  - links              : if true crawl link tags
 *  - linkTypes          : the type of the links tags to crawl (match to the rel attribute)
 *  - images             : if true crawl images
 *  - protocols          : list of the protocols to crawl
 *  - timeout            : timeout per requests in milliseconds (Default 5000)
 *  - retries            : number of retries if the request fails (default 0)
 *  - retryTimeout       : number of milliseconds to wait before retrying (Default 10000)
 *  - skipDuplicates     : if true skips URIs that were already crawled - default is true
 *  - rateLimits         : number of milliseconds to delay between each requests (Default 0).
 *                         Note that this option will force crawler to use only one connection
 *  - depthLimit         : the depth limit for the crawl
 *  - followRedirect     : if true, the crawl will not return the 301, it will follow directly the redirection
 *  + all params provided by nodejs request : https://github.com/request/request
 */
function Crawler(config) {

    var self = this;
    // Store the depth for each crawled url
    // Override config.updateDepth function in order to use another storage
    // This default implementation is not recommanded for big crawl
    this.depthUrls = new Map();

    this.history = new Set();

    // Default config
    this.config = this.createDefaultConfig();

    //Merge default config values & overridden values provided by the arg config
    if (config) {
      _.extend(this.config, config);
    }

    // assign the default updateDepth method used to calculate the crawl depth
    this.updateDepth = updateDepth;

    // If the config object contains an new implementation of the updateDepth method
    if (this.config.updateDepth) {
      this.updateDepth = this.config.updateDepth;
    }

    this.crawler = new JsCrawler(this.config);

    events.EventEmitter.call(this);

}

util.inherits(Crawler, events.EventEmitter);


/**
 * Add an url to crawl
 *
 * @param The url to crawl
 *
 */
Crawler.prototype.queue = function(url) {

  this.crawler.queue(url);
}

/**
 * Default crawler config
 *
 * @returns the config object
 */
Crawler.prototype.createDefaultConfig = function() {
  var self = this;
  return {

    maxConnections : DEFAULT_NUMBER_OF_CONNECTIONS,
    timeout         : DEFAULT_TIME_OUT,
    retries        : DEFAULT_RETRIES,
    retryTimeout   : DEFAULT_RETRY_TIMEOUT,
    skipDuplicates : DEFAULT_SKIP_DUPLICATES,
    rateLimits     : DEFAULT_RATE_LIMITS,
    externalLinks  : DEFAULT_CRAWL_EXTERNAL_LINKS,
    protocols      : DEFAULT_PROTOCOLS_TO_CRAWL,
    depthLimit     : DEFAULT_DEPTH_LIMIT,
    followRedirect : DEFAULT_FOLLOW_301,
    debug          : DEFAULT_DEDUG,
    images         : DEFAULT_CRAWL_IMAGES,
    links          : DEFAULT_CRAWL_LINKS,
    linkTypes      : DEFAULT_LINKS_TYPES,
    scripts        : DEFAULT_CRAWL_SCRIPTS,

    callback : function(error, result, $){
        self.crawl(error, result,$);
      },

      onDrain : function(){
        self.emit('end');
      }


  };
}

/**
 * Callback method used when the crawler crawl a resource (html, pdf, css, ...)
 *
 * @param error The usual nodejs error
 * @param result : the result of the resource crawl
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 */
Crawler.prototype.crawl = function (error, result, $) {

    if (error) {
        this.emit("error", error, result);
        return;
    }

    // if skipDuplicates, don't crawl twice the same url
    if (this.config.skipDuplicates) {

      if(this.history.has(result.uri)) {
          return;
      }
      else {
        this.history.add(result.uri);
      }

    }

    this.emit("crawl", result, $);

    // if $ is defined, this is an HTML page with an http status 200, crawl the linked resources
    // Other resources can be managed by a plugin (a listener to the event "crawl")
    if ($) {
      this.analyzeHTML(result,$);
    }

    // if 301 & followRedirect = false => chain 301
    if (result.statusCode >= 300 && result.statusCode <= 399  &&  ! this.config.followRedirect) {

        var from = result.uri;
        var to = result.headers["location"];
        var to = URI.linkToURI(from, to);
        this.emit("crawlRedirect", from, to, result.statusCode);
        this.crawler.queue(to);

    }
}


/**
 * Analyze an HTML page. Mainly, found a.href & links in the page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 */
Crawler.prototype.analyzeHTML = function(result, $) {

    this.crawlHrefs(result, $);

    if (this.config.links){
        this.crawlLinks(result, $);
    }

    if (this.config.scripts) {
        this.crawlScripts(result,$);
    }

    if (this.config.images) {
      this.crawlImages(result,$);
    }


}


/**
 * Crawl urls that match to HTML tags a.href found in one page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 *
 */
Crawler.prototype.crawlHrefs = function(result, $) {
  var parentUri = result.uri
  var self = this;

  $('a').each(function(index, a) {

      var link = $(a).attr('href');
      if (link) {

        var anchor = $(a).text() ? $(a).text() : "";
        var noFollow = $(a).attr("rel");
        var isDoFollow =  ! (noFollow && noFollow === "nofollow");

        var linkUri = URI.linkToURI(parentUri, link);

        var currentDepth = self.updateDepth(parentUri, linkUri);

        self.emit("crawlLink", parentUri, linkUri, anchor, isDoFollow);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri, anchor, isDoFollow)) {

              self.crawler.queue(linkUri);
        }
        else {
          self.emit("uncrawl", parentUri, linkUri, anchor, isDoFollow);
        }


      }

  });

}

/**
 * Crawl link tags found in the HTML page
 * eg. : <link rel="stylesheet" href="/css/bootstrap.min.css">
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
Crawler.prototype.crawlLinks = function(result, $) {

  var parentUri = result.uri;
  var self = this;

  $('link').each(function(index, linkTag) {

      var link = $(linkTag).attr('href');

      if (link) {

          var rel =  $(linkTag).attr('rel');

          if (self.config.linkTypes.indexOf(rel) > 0) {
              var linkUri = URI.linkToURI(parentUri, link);
              var currentDepth = self.updateDepth(parentUri, linkUri);

              self.emit("crawlLink", parentUri, linkUri);

              if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

                    self.crawler.queue(linkUri);
              }
              else {
                self.emit("uncrawl", parentUri, linkUri);
              }
          }

      }

  });

}

/**
 * Crawl script tags found in the HTML page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
Crawler.prototype.crawlScripts = function(result, $) {

  var parentUri = result.uri;
  var self = this;

  $('script').each(function(index, link) {

      var link = $(link).attr('src');
      if (link) {
        var linkUri = URI.linkToURI(parentUri, link);
        var currentDepth = self.updateDepth(parentUri, linkUri);

        self.emit("crawlLink", parentUri, linkUri);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

              self.crawler.queue(linkUri);
        }
        else {
          self.emit("uncrawl", parentUri, linkUri);
        }
      }

  });

}

/**
 * Crawl image tags found in the HTML page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
Crawler.prototype.crawlImages = function(result, $) {

  var parentUri = result.uri;
  var self = this;

  $('img').each(function(index, img) {

      var link = $(img).attr('src');
      var alt = $(img).attr('alt');
      if (link) {
        var linkUri = URI.linkToURI(parentUri, link);
        var currentDepth = self.updateDepth(parentUri, linkUri);

        self.emit("crawlImage", parentUri, linkUri, alt);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

              self.crawler.queue(linkUri);
        }
        else {
          self.emit("uncrawl", parentUri, linkUri);
        }
      }

  });

}

/**
 * Check if a link has to be crawled
 *
 * @param the link url
 * @param the anchor text of the links
 * @param true if the link is dofollow
 * @returns
 */
Crawler.prototype.isAGoodLinkToCrawl = function(currentDepth, parentUri, link, anchor, isDoFollow) {

  // 1. Check the depthLimit
  if (this.config.depthLimit > -1 && currentDepth > this.config.depthLimit) {
    return false
  }

  // 2. Check if we need to crawl external links
  if (URI.isExternalLink(parentUri,link) &&  ! this.config.externalLinks) {
    return false;
  }

  // 3. Check if the link is based on a good protocol
  if (this.config.protocols.indexOf(URI.protocol(link)) < 0) {
    return false;
  }


  // 4. Check if there is a rule in the crawler configuration
  if (! this.config.canCrawl) {
    return true;
  }

  return this.config.canCrawl(parentUri, link, anchor, isDoFollow);

}

/**
 * Compute the crawl depth for a link in function of the crawl depth
 * of the page that contains the link
 *
 * @param The URI of page that contains the link
 * @param The link for which the crawl depth has to be calculated
 * @returns the crawl depth of the link
 *
 */
var updateDepth = function(parentUri, linkUri) {

    if (this.depthUrls.has(parentUri)) {

        var parentDepth = this.depthUrls.get(parentUri);
        if (this.depthUrls.has(linkUri)) {
            return this.depthUrls.get(linkUri);
        }
        else {
          var depth = parentDepth + 1;
          this.depthUrls.set(linkUri, depth);
          return depth;
        }
    }
    else {
        this.depthUrls.set(parentUri, 0);
        this.depthUrls.set(linkUri, 1);
        return 1;
    }


}

module.exports.Crawler = Crawler;
