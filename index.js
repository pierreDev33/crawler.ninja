var events    = require('events');
var timers    = require('timers');
var util      = require("util");
var _         = require("underscore");
var requester = require("./lib/queue-requester");
var URI       = require('./lib/uri.js');
var Map       = require("collections/fast-map");
var Set       = require("collections/fast-set");
var html      = require("./lib/html.js");

var DEFAULT_NUMBER_OF_CONNECTIONS = 10;
var DEFAULT_DEPTH_LIMIT = -1; // no limit
var DEFAULT_TIME_OUT = 8000;
var DEFAULT_RETRIES = 0;
var DEFAULT_RETRY_TIMEOUT = 10000;
var DEFAULT_SKIP_DUPLICATES = true;
var DEFAULT_RATE_LIMITS = 0;
var DEFAULT_CRAWL_EXTERNAL_LINKS = false;
var DEFAULT_CRAWL_EXTERNAL_DOMAINS = false;
var DEFAULT_CRAWL_SCRIPTS = true;   // Crawl <script>
var DEFAULT_CRAWL_LINKS = true;     // Crawl <link>
var DEFAULT_CRAWL_IMAGES = true;

var DEFAULT_PROTOCOLS_TO_CRAWL = ["http", "https"];
var DEFAULT_FOLLOW_301 = false;
var DEFAULT_DEDUG = false;

var DEFAULT_LINKS_TYPES = ["canonical", "stylesheet"];

var DEFAULT_USER_AGENT = "NinjaBot";
var DEFAULT_DEBUG = false;
var DEFAULT_CACHE = false;
var DEFAULT_FORCE_UTF8 = true;
var DEFAULT_INCOMING_ENCODING = null;
var DEFAULT_METHOD = 'GET';
var DEFAULT_REFERER = false;

/**
 * The SEO crawler object
 *
 * @param config used to customize the crawler.
 *
 *  The current config attributes are :
 *  - maxConnections     : the number of connections used to crawl - default is 10
 *  - externalLinks      : if true crawl external links
 *  - externalDomains    : if true crawl the complete external domains. This option can crawl a lot of different domains
 *  - scripts            : if true crawl script tags
 *  - links              : if true crawl link tags
 *  - linkTypes          : the type of the links tags to crawl (match to the rel attribute), default : ["canonical", "stylesheet"]
 *  - images             : if true crawl images
 *  - protocols          : list of the protocols to crawl, default = ["http", "https"]
 *  - timeout            : timeout per requests in milliseconds (Default 8000)
 *  - retries            : number of retries if the request fails (default 0)
 *  - retryTimeout       : number of milliseconds to wait before retrying (Default 10000)
 *  - skipDuplicates     : if true skips URIs that were already crawled - default is true
 *  - rateLimits         : number of milliseconds to delay between each requests (Default 0).
 *                         Note that this option will force crawler to use only one connection
 *  - depthLimit         : the depth limit for the crawl
 *  - followRedirect     : if true, the crawl will not return the 301, it will follow directly the redirection
 *  - proxyList          : the list of proxies (see the project simple-proxies on npm)
 *  + all params provided by nodejs request : https://github.com/request/request
 */
function Crawler(config) {    var self = this;


    // Store the depth for each crawled url
    // Override config.updateDepth function in order to use another storage
    // This default implementation is not recommanded for big crawl
    // TODO : use an external store
    this.depthUrls = new Map();

    // list of the hosts from which the crawl starts
    this.startFromHosts = new Set();

    // Default config
    this.config = this.createDefaultConfig();

    //Merge default config values & overridden values provided by the arg config
    if (config) {
      _.extend(this.config, config);
    }

    // if using rateLimits we want to use only one connection with delay between requests
    if (this.config.rateLimits !== 0) {
        this.config.maxConnections = 1;
    }


    // assign the default updateDepth method used to calculate the crawl depth
    this.updateDepth = updateDepth;

    // If the config object contains an new implementation of the updateDepth method
    if (this.config.updateDepth) {
      this.updateDepth = this.config.updateDepth;
    }

    this.httpRequester = new requester.Requester(this.config);

    events.EventEmitter.call(this);

}

util.inherits(Crawler, events.EventEmitter);


/**
 * Add one or more urls to crawl
 *
 * @param The url to crawl
 *
 */
Crawler.prototype.queue = function(options) {

    var self = this;

    if (! options)  {
        if (self.config.callback) {
            self.config.callback({errorCode : "NO_OPTIONS"}, {method:"GET", url : "unknown", proxy : "", error : true});
        }

        if (this.httpRequester.idle()) {
          self.config.onDrain();
        }
        return;
    }


    // if Array => recall this method for each element
    if (_.isArray(options)) {
        options.forEach(function(opt){
            self.queue(opt);
        });

        return;
    }


    // if String, we expect to receive an url
    if (_.isString(options)) {
      this.startFromHosts.add(URI.host(options));
      this.httpRequester.queue({uri:options, url:options})
    }
    // Last possibility, this is a json
    else {

      if (! _.has(options, "url") && ! _.has(options, "uri")) {
        if (self.config.callback) {
            self.config.callback({errorCode : "NO_URL_OPTION"}, {method:"GET", url : "unknown", proxy : "", error : true});
        }

        if (this.httpRequester.idle()) {
          self.config.onDrain();
        }
      }
      else {
        this.startFromHosts.add(URI.host(_.has(options, "url") ? options.url : options.uri));
        this.httpRequester.queue(options);
      }
    }


}

/**
 * Default crawler config
 *
 * @returns the config object
 */
Crawler.prototype.createDefaultConfig = function() {
  var self = this;
  return {


    cache           : DEFAULT_CACHE,
    forceUTF8       : DEFAULT_FORCE_UTF8,
    incomingEncoding: DEFAULT_INCOMING_ENCODING, //TODO remove or optimize
    method          : DEFAULT_METHOD,
    referer         : DEFAULT_REFERER,
    maxConnections  : DEFAULT_NUMBER_OF_CONNECTIONS,
    timeout         : DEFAULT_TIME_OUT,
    retries         : DEFAULT_RETRIES,
    retryTimeout    : DEFAULT_RETRY_TIMEOUT,
    skipDuplicates  : DEFAULT_SKIP_DUPLICATES,
    rateLimits      : DEFAULT_RATE_LIMITS,
    externalLinks   : DEFAULT_CRAWL_EXTERNAL_LINKS,
    externalDomains : DEFAULT_CRAWL_EXTERNAL_DOMAINS,
    protocols       : DEFAULT_PROTOCOLS_TO_CRAWL,
    depthLimit      : DEFAULT_DEPTH_LIMIT,
    followRedirect  : DEFAULT_FOLLOW_301,
    debug           : DEFAULT_DEDUG,
    images          : DEFAULT_CRAWL_IMAGES,
    links           : DEFAULT_CRAWL_LINKS,
    linkTypes       : DEFAULT_LINKS_TYPES,
    scripts         : DEFAULT_CRAWL_SCRIPTS,
    userAgent       : DEFAULT_USER_AGENT,
    debug           : DEFAULT_DEBUG,

    callback : function(error, result){
        self.crawl(error, result);
      },

      onDrain : function(){
        timers.setImmediate(function(){
            self.emit('end');
        });

      },

      onConfigError : function() {

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
Crawler.prototype.crawl = function (error, result) {

    var self = this;
    if (error) {
        //console.log(error);
        timers.setImmediate(emitErrorEvent, self, error, result);
        return;
    }

    var $ = html.isHTML(result.body) ? html.$(result.body) : null;

    timers.setImmediate(emitCrawlEvent, self,result, $);

    // if $ is defined, this is an HTML page with an http status 200, crawl the linked resources
    // Other resources can be managed by a plugin (a listener to the event "crawl")
    if ($) {

      this.analyzeHTML(result,$);
    }


    // if 30* & followRedirect = false => chain 30*
    if (result.statusCode >= 300 && result.statusCode <= 399  &&  ! this.config.followRedirect) {

        var from = result.uri;
        var to = result.headers["location"];
        var to = URI.linkToURI(from, to);
        timers.setImmediate(emitRedirectEvent, self, from, to, result.statusCode);
        this.httpRequester.queue({url : to});

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

        timers.setImmediate(emitCrawlHrefEvent, self, "crawlLink", parentUri, linkUri, anchor, isDoFollow);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri, anchor, isDoFollow)) {
          self.httpRequester.queue({url : linkUri});
        }
        else {
          timers.setImmediate(emitCrawlHrefEvent, self, "uncrawl", parentUri, linkUri, anchor, isDoFollow);
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

              timers.setImmediate(emitCrawlLinkEvent, self, parentUri, linkUri);

              if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

                self.httpRequester.queue({url : linkUri});

              }
              else {
                timers.setImmediate(emitUnCrawlEvent, self, parentUri, linkUri);
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

        timers.setImmediate(emitCrawlLinkEvent, self, parentUri, linkUri);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

          self.httpRequester.queue({url : linkUri});

        }
        else {
          timers.setImmediate(emitUnCrawlEvent, self, parentUri, linkUri);
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

        timers.setImmediate(emitCrawlImage, self, parentUri, linkUri, alt);

        if (self.isAGoodLinkToCrawl(currentDepth, parentUri, linkUri)) {

          self.httpRequester.queue({url : linkUri});

        }
        else {
          timers.setImmediate(emitUnCrawlEvent, self, parentUri, linkUri);
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

  // 3. Check if we need to crawl external domains
  if (! this.startFromHosts.has(URI.host(parentUri)) && ! this.config.externalDomains) {
    return false;
  }

  // 4. Check if the link is based on a good protocol
  if (this.config.protocols.indexOf(URI.protocol(link)) < 0) {
    return false;
  }


  // 5. Check if there is a rule in the crawler configuration
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

function emitCrawlEvent(crawler, result, $) {

  crawler.emit("crawl", result, $);
}

function emitErrorEvent(crawler, error, result) {
  crawler.emit("error", error, result);
}

function emitRedirectEvent(crawler, from, to, statusCode) {
  crawler.emit("crawlRedirect", from, to, statusCode);
}


function emitCrawlHrefEvent(crawler, eventName, parentUri, linkUri, anchor, isDoFollow) {
  crawler.emit(eventName, parentUri, linkUri, anchor, isDoFollow);
}

function emitCrawlLinkEvent(crawler, parentUri, linkUri ) {
  crawler.emit("crawlLink", parentUri, linkUri);
}

function emitUnCrawlEvent(crawler, parentUri, linkUri ) {
  crawler.emit("uncrawl", parentUri, linkUri);
}

function emitCrawlImage(crawler, parentUri, linkUri, alt ) {

  crawler.emit("crawlImage", parentUri, linkUri, alt);
}

module.exports.Crawler = Crawler;
