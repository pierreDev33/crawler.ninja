var timers      = require('timers');
var util        = require("util");
var _           = require("underscore");
var async       = require('async');
var log         = require("crawler-ninja-logger").Logger;
var requester   = require("./lib/queue-requester");
var URI         = require('./lib/uri.js');
var html        = require("./lib/html.js");
var store       = require("./lib/store/store.js");
var plugin      = require("./lib/plugin-manager.js");

var domainBlackList  = require("./default-lists/domain-black-list.js").list();
var suffixBlackList  = require("./default-lists/suffix-black-list.js").list();


var DEFAULT_NUMBER_OF_CONNECTIONS = 30;
var DEFAULT_DEPTH_LIMIT = -1; // no limit
var DEFAULT_TIME_OUT = 20000;
var DEFAULT_RETRIES = 3;
var DEFAULT_RETRY_TIMEOUT = 10000;
var DEFAULT_SKIP_DUPLICATES = true;
var DEFAULT_RATE_LIMITS = 0;
var DEFAULT_MAX_ERRORS = 5;
var DEFAULT_ERROR_RATES = [200, 350, 500];

var DEFAULT_FIRST_EXTERNAL_LINK_ONLY = false;
var DEFAULT_CRAWL_EXTERNAL_DOMAINS = false;
var DEFAULT_CRAWL_EXTERNAL_HOSTS = false;
var DEFAULT_CRAWL_SCRIPTS = true;   // Crawl <script>
var DEFAULT_CRAWL_LINKS = true;     // Crawl <link>
var DEFAULT_CRAWL_IMAGES = true;

var DEFAULT_PROTOCOLS_TO_CRAWL = ["http", "https"];
var DEFAULT_FOLLOW_301 = false;

var DEFAULT_LINKS_TYPES = ["canonical", "stylesheet"];
var DEFAULT_USER_AGENT = "NinjaBot";
var DEFAULT_CACHE = false;
var DEFAULT_METHOD = 'GET';
var DEFAULT_REFERER = false;

var DEFAULT_STORE_MODULE = "./memory-store.js";


(function () {

  var globalOptions = {};

  // assign the default updateDepth method used to calculate the crawl depth
  var updateDepthFn = updateDepth;

  var endCallback = null;

  var pm = new plugin.PluginManager();

  /**
   * Init the crawler
   *
   * @param config used to customize the crawler.
   *
   *  The current config attributes are :
   *  - maxConnections        : the number of connections used to crawl - default is 10
   *  - externalDomains       : if true crawl the  external domains. This option can crawl a lot of different linked domains, default = false.
   *  - externalHosts         : if true crawl the others hosts on the same domain, default = false.
   *  - firstExternalLinkOnly : crawl only the first link found for external domains/hosts. externalHosts or externalDomains should be = true
   *  - scripts               : if true crawl script tags
   *  - links                 : if true crawl link tags
   *  - linkTypes             : the type of the links tags to crawl (match to the rel attribute), default : ["canonical", "stylesheet"]
   *  - images                : if true crawl images
   *  - protocols             : list of the protocols to crawl, default = ["http", "https"]
   *  - timeout               : timeout per requests in milliseconds (Default 20000)
   *  - retries               : number of retries if the request fails (default 3)
   *  - retryTimeout          : number of milliseconds to wait before retrying (Default 10000)
   *  - maxErrors             : number of timeout errors before changing the crawl rate, default is 5,
      - errorRates            : list of rates to used when too many timeout errors occur.
   *  - skipDuplicates        : if true skips URIs that were already crawled - default is true
   *  - rateLimits            : number of milliseconds to delay between each requests (Default 0).
   *                            Note that this option will force crawler to use only one connection
   *  - depthLimit            : the depth limit for the crawl
   *  - followRedirect        : if true, the crawl will not return the 301, it will follow directly the redirection
   *  - proxyList             : the list of proxies (see the project simple-proxies on npm)
   *
   *  + all options provided by nodejs request : https://github.com/request/request
   *
   * @param callback() called when all URLs have been crawled
   * @param proxies to used when making http requests
   */

  function init(config, callback, proxies) {

      if (! callback) {
        log.error("The end callback is not defined");
      }

      // Default config
      globalOptions = createDefaultConfig();

      // Merge default config values & overridden values provided by the arg config
      if (config) {
        _.extend(globalOptions, config);
      }

      // if using rateLimits we want to use only one connection with delay between requests
      if (globalOptions.rateLimits !== 0) {
          globalOptions.maxConnections = 1;
      }

      // create the crawl store
      store.createStore(globalOptions.storeModuleName, globalOptions.storeParams ? globalOptions.storeParams : null);

      // If the config object contains an new implementation of the updateDepth method
      if (globalOptions.updateDepth) {
        updateDepthFn = globalOptions.updateDepth;
      }

      // Init the crawl queue
      endCallback = callback;
      requester.init(globalOptions.maxConnections, crawl, endCallback, proxies);

  }

  /**
   * Add one or more urls to crawl
   *
   * @param The url(s) to crawl
   *
   */
 function queue(options) {
    if (! endCallback) {
      console.log("The end callback is not defined, impossible to run correctly");
      return;
    }
    
    // Error if no options
    if (! options){

        crawl({errorCode : "NO_OPTIONS"}, {method:"GET", url : "unknown", proxy : "", error : true},
              function(error){
                  if (requester.idle()) {
                      endCallback();
                  }
              });
        return;
    }


    // if Array => recall this method for each element
    if (_.isArray(options)) {
        options.forEach(function(opt){
            queue(opt);
        });

        return;
    }


    // if String, we expect to receive an url
    if (_.isString(options)) {
      store.getStore().addStartUrl(options, function(error) {
          requester.queue(addDefaultOptions({uri:options, url:options}, globalOptions));
      });

    }
    // Last possibility, this is a json
    else {

      if (! _.has(options, "url") && ! _.has(options, "uri")) {

            crawl({errorCode : "NO_URL_OPTION"}, {method:"GET", url : "unknown", proxy : "", error : true},
                  function(error){
                      if (requester.idle()) {
                          endCallback();
                      }
                  });
      }
      else {
        store.getStore().addStartUrl(_.has(options, "url") ? options.url : options.uri, function(error) {
            requester.queue(addDefaultOptions(options, globalOptions));
        });
      }
    }

}

/**
 *  Add the default crawler options into the option used for the current request
 *
 *
 * @param the option used for the current request
 * @return
 */
 function addDefaultOptions(options, defaultOptions) {

    _.defaults(options, defaultOptions);
    options.maxRetries = options.retries;

    return options;

}

/**
 *  Make a copy of an option object for a specific url
 *
 *
 * @param the options object to create/copy
 * @param the url to apply into the new option object
 * @return the new options object
 */
 function buildNewOptions (options, newUrl) {

    var o = createDefaultConfig(newUrl);

    // Copy only options attributes that are in the options used for the previous request
    // Could be more simple ? ;-)
    o =  _.extend(o, _.pick(options, _.without(_.keys(o), "url", "uri")));

    //Reset setting used for retries when an error occurs like a timeout
    o.maxRetries = o.retries;
    o.depthLimit = options.depthLimit;


    if (options.canCrawl) {
      o.canCrawl = options.canCrawl;
    }
    return o;

 }


/**
 * Default crawler config
 *
 * @returns the config object
 */
function createDefaultConfig(url) {

  var config = {
      method                  : DEFAULT_METHOD,
      referer                 : DEFAULT_REFERER,
      maxConnections          : DEFAULT_NUMBER_OF_CONNECTIONS,
      timeout                 : DEFAULT_TIME_OUT,
      retries                 : DEFAULT_RETRIES,
      maxRetries              : DEFAULT_RETRIES,
      retryTimeout            : DEFAULT_RETRY_TIMEOUT,
      maxErrors               : DEFAULT_MAX_ERRORS,
      errorRates              : DEFAULT_ERROR_RATES,
      skipDuplicates          : DEFAULT_SKIP_DUPLICATES,
      rateLimits              : DEFAULT_RATE_LIMITS,
      externalDomains         : DEFAULT_CRAWL_EXTERNAL_DOMAINS,
      externalHosts           : DEFAULT_CRAWL_EXTERNAL_HOSTS,
      firstExternalLinkOnly   : DEFAULT_FIRST_EXTERNAL_LINK_ONLY,
      protocols               : DEFAULT_PROTOCOLS_TO_CRAWL,
      depthLimit              : DEFAULT_DEPTH_LIMIT,
      followRedirect          : DEFAULT_FOLLOW_301,
      images                  : DEFAULT_CRAWL_IMAGES,
      links                   : DEFAULT_CRAWL_LINKS,
      linkTypes               : DEFAULT_LINKS_TYPES,
      scripts                 : DEFAULT_CRAWL_SCRIPTS,
      userAgent               : DEFAULT_USER_AGENT,
      domainBlackList         : domainBlackList,
      suffixBlackList         : suffixBlackList,
      storeModuleName         : DEFAULT_STORE_MODULE,

  };

  if (url) {
    config.url = url;
    config.uri = url;
  }

  return config;

}

/**
 * Default callback function used when the http queue requester get a resource (html, pdf, css, ...) or an error
 *
 * @param error : the usual nodejs error
 * @param result: the crawled resource
 *
 */
function crawl(error, result, callback) {

    // if HTTP error, delegate to the plugins
    if (error) {
        pm.error(error,result, callback);
        return;
    }

    var $ = html.isHTML(result.body) ? html.$(result.body) : null;

    // Analyse the HTTP response in order to check the content (links, images, ...)
    // or apply a redirect
    async.parallel([
      async.apply(pm.crawl.bind(pm), result, $),
      async.apply(analyzeHTML, result, $),
      async.apply(applyRedirect, result),
    ], function(error) {
        result = null;
        callback(error);
    });

}


function applyRedirect(result, callback) {
  // if 30* & followRedirect = false => chain 30*
  if (result.statusCode >= 300 && result.statusCode <= 399  &&  ! result.followRedirect) {

      var from = result.uri;
      var to = result.headers["location"];
      var to = URI.linkToURI(from, to);

      pm.crawlRedirect(from, to, result.statusCode, function(){
        requester.queue(buildNewOptions(result,to));
        callback();
      });
  }
  else {
      callback();
  }


}

/**
 * Analyze an HTML page. Mainly, found a.href, links,scripts & images in the page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags. Null is the resource
 *        is not an HTML
 */
function analyzeHTML(result, $, callback) {

  // if $ is note defined, this is not a HTML page with an http status 200
  if (! $) {
    return callback();
  }

  log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "Start check HTML code"});

  async.parallel([

    async.apply(crawlHrefs, result, $),
    async.apply(crawlLinks, result, $),
    async.apply(crawlScripts, result, $),
    async.apply(crawlImages, result, $),

  ], callback);

}


/**
 * Crawl urls that match to HTML tags a.href found in one page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 *
 */
function crawlHrefs(result, $, endCallback) {

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlHrefs"});

    async.each($('a'), function(a, callback) {
        crawlHref($, result, a, callback);
    }, endCallback);

}

function crawlHref($,result, a, callback) {

      var link = $(a).attr('href');
      var parentUri = result.uri;
      if (link) {

        var anchor = $(a).text() ? $(a).text() : "";
        var noFollow = $(a).attr("rel");
        var isDoFollow =  ! (noFollow && noFollow === "nofollow");

        var linkUri = URI.linkToURI(parentUri, link);

        pm.crawlLink(parentUri, linkUri, anchor, isDoFollow, function(){
          checkUrlToCrawl(result, parentUri, linkUri, anchor, isDoFollow, callback);
        });

      }
      else {
        callback();
      }

}


/**
 * Crawl link tags found in the HTML page
 * eg. : <link rel="stylesheet" href="/css/bootstrap.min.css">
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
function crawlLinks(result, $, endCallback) {

    if (! result.links){
        return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlLinks"});

    async.each($('link'), function(linkTag, callback) {
        crawLink($, result, linkTag, callback);
    }, endCallback);
}

function crawLink($,result,linkTag, callback) {
      var link = $(linkTag).attr('href');
      var parentUri = result.uri;

      if (link) {

          var rel =  $(linkTag).attr('rel');

          if (result.linkTypes.indexOf(rel) > 0) {
              var linkUri = URI.linkToURI(parentUri, link);

              pm.crawlLink(parentUri, linkUri, null, null, function(){
                checkUrlToCrawl(result, parentUri, linkUri, null, null, callback);
              });
          }
          else {
            callback();
          }
      }
      else {
        callback();
      }
}


/**
 * Crawl script tags found in the HTML page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
function crawlScripts(result, $, endCallback) {

    if (! result.scripts) {
      return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlScripts"});

    async.each($('script'), function(script, callback) {
        crawlScript($, result, script, callback);
    }, endCallback);
}

function crawlScript($,result, script, callback) {

    var link = $(script).attr('src');
    var parentUri = result.uri;

    if (link) {
          var linkUri = URI.linkToURI(parentUri, link);
          pm.crawlLink(parentUri, linkUri, null, null, function(){
            checkUrlToCrawl(result, parentUri, linkUri, null, null, callback);
          });
    }
    else {
      callback();
    }


}


/**
 * Crawl image tags found in the HTML page
 *
 * @param result : the result of the crawled resource
 * @param the jquery like object for accessing to the HTML tags.
 */
function crawlImages(result, $, endCallback) {

    if (! result.images) {
      return endCallback();
    }

    log.debug({"url" : result.url, "step" : "analyzeHTML", "message" : "CrawlImages"});

    async.each($('img'), function(img, callback) {
        crawlImage($, result, img, callback);
    }, endCallback);
}

function crawlImage ($,result, img, callback) {
      var parentUri = result.uri;

      var link = $(img).attr('src');
      var alt = $(img).attr('alt');
      if (link) {
          var linkUri = URI.linkToURI(parentUri, link);
          pm.crawlImage(parentUri, linkUri, alt, function(){
            checkUrlToCrawl(result, parentUri, linkUri, null, null, callback);
          });
      }
      else {
        callback();
      }
}

function checkUrlToCrawl(result, parentUri, linkUri, anchor, isDoFollow, endCallback) {

    async.waterfall([
        function(callback) {
            updateDepth(parentUri, linkUri, function(error, currentDepth) {
                callback(error,currentDepth);
            });

        },
        function(currentDepth, callback) {
          isAGoodLinkToCrawl(result, currentDepth, parentUri, linkUri, anchor, isDoFollow, function(error, toCrawl) {
              if (error) {
                return callback(error);
              }
              if (toCrawl && (result.depthLimit == -1 || currentDepth <= result.depthLimit)) {
                  requester.queue(buildNewOptions(result,linkUri));
                  callback();
              }
              else {
                pm.unCrawl(parentUri, linkUri, anchor, isDoFollow, callback);
              }

          });

        }
    ], endCallback);
}


/**
 * Check if a link has to be crawled
 *
 * @param the link url
 * @param the anchor text of the links
 * @param true if the link is dofollow
 * @returns
 */
function isAGoodLinkToCrawl(result, currentDepth, parentUri, link, anchor, isDoFollow, callback) {

  store.getStore().isStartFromUrl(parentUri, link, function(error, startFrom){

        // 1. Check if we need to crawl other hosts & domains
        if ((! startFrom.link.isStartFromHost && ! result.externalHosts) &&
           (! (! startFrom.link.isStartFromDomains && result.externalDomains))) {
            log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no external host or domain"});
            return callback(null, false);
        }

        // 2. Check if we need to crawl only the first pages of external hosts/domains
        if (result.firstExternalLinkOnly &&  ((! startFrom.link.isStartFromHost) || (! startFrom.link.isStartFromDomains))) {

          if (! startFrom.parentUri.isStartFromHost) {
            log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no external host or domain (not the first link)"});
            return callback(null, false);
          }
        }

        // 3. Check if the link is based on a good protocol
        var protocol = URI.protocol(link);
        if (result.protocols.indexOf(protocol) < 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - no valid protocol : " + protocol});
          return callback(null, false);
        }

        // 4. Check if the domain is in the domain black-list
        if (result.domainBlackList.indexOf(URI.domainName(link)) > 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - domain is blacklisted" });
          return callback(null, false);
        }

        // 5. Check if the domain is in the suffix black-list
        var suffix = URI.suffix(link);
        if (result.suffixBlackList.indexOf(suffix) > 0) {
          log.warn({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "Don't crawl url - suffix is blacklisted"});
          return callback(null, false);
        }

        // 6. Check if there is a rule in the crawler configuration
        if (! result.canCrawl) {
          log.info({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "URL can be crawled"});
          return callback(null, true);
        }
        // TODO : asynch this function ?
        var check =  result.canCrawl(parentUri, link, anchor, isDoFollow);
        log.debug({"url" : link, "step" : "isAGoodLinkToCrawl", "message" : "method options.canCrawl has been called and return "} + check);
        return callback(null, check);

  });

}

function registerPlugin(plugin) {
    pm.registerPlugin(plugin);
}

function unregisterPlugin(plugin) {
    pm.unregisterPlugin(plugin);
}

/**
 * Compute the crawl depth for a link in function of the crawl depth
 * of the page that contains the link
 *
 * @param The URI of page that contains the link
 * @param The link for which the crawl depth has to be calculated
 * @param callback(error, depth)
 *
 */
function updateDepth(parentUri, linkUri, callback) {

    var depths = {parentUri : parentUri, linkUri : linkUri, parentDepth : 0, linkDepth : 0};
    var execFns = async.seq(getDepths , calcultateDepths , saveDepths);

    execFns(depths, function (error, result) {
      if (error) {
        callback(error);
      }
      return callback(error, result.linkDepth);
    });

}

/**
 * get the crawl depths for a parent & link uri
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */
function getDepths(depths, callback) {

    async.parallel([
        async.apply(store.getStore().getDepth.bind(store.getStore()), depths.parentUri),
        async.apply(store.getStore().getDepth.bind(store.getStore()), depths.linkUri)
    ],
    function(error, results){
        if (error) {
          return callback(error);
        }
        depths.parentDepth = results[0];
        depths.linkDepth = results[1];
        callback(null, depths);
    });
}

/**
 * Calculate the depth
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */

function calcultateDepths(depths, callback) {
    if (depths.parentDepth) {
        // if a depth of the links doesn't exist : assign the parehtDepth +1
        // if not, this link has been already found in the past => don't update its depth
        if (! depths.linkDepth) {
            depths.linkDepth = depths.parentDepth + 1;
        }
    }
    else {
        depths.parentDepth = 0;
        depths.linkDepth = 1;
    }
    callback(null, depths);
}

/**
 * Save the crawl depths for a parent & link uri
 *
 *
 * @param a structure containing both url
 *        {parentUri : parentUri, linkUri : linkUri}
 * @param callback(error, depth)
 */
function saveDepths(depths, callback) {

  async.parallel([
      async.apply(store.getStore().setDepth.bind(store.getStore()), depths.parentUri, depths.parentDepth ),
      async.apply(store.getStore().setDepth.bind(store.getStore()), depths.linkUri, depths.linkDepth )
  ],
  function(error){
      callback(error, depths);
  });
}

module.exports.init = init;
module.exports.queue = queue;
module.exports.registerPlugin = registerPlugin;
module.exports.unregisterPlugin = unregisterPlugin;

}());
