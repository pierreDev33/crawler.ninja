/**
 * Utily functions used to transform, create, extract info on URIs
 *
 * Based on the module URIjs : http://medialize.github.io/URI.js/
 *
 * @TODO : avoid the try & catch blocks => replace by a callback(error, result) ?
 *
 */
var log = require("crawler-ninja-logger").Logger;

var URI = require('URIjs');

/**
 * Get the protocol name for one uri
 *
 * @param the uri
 * @returns the uri protocol
 */
var protocol = function(uri) {

  return buildURI(uri).protocol();

}

var domain = function(uri) {

  return buildURI(uri).domain();
}


var domainName = function(uri) {

    try {
      var name = buildURI(uri).tld("xxx").domain().toString().replace(".xxx", "");
      return name;
    }
    catch (e) {
      // cannot extract the domain name, return domain (domainName + tld)
      return domain(uri);
    }
}


var suffix = function(uri) {
  return buildURI(uri).suffix();
}

/**
 * Get the host for one uri
 *
 * @param the uri
 * @returns the uri host
 */
var host = function(uri) {
  return buildURI(uri).host();
}

/**
 * Build an standard URI format for a link href
 *
 * @param the page URI that contains the link. this should be a full path uri with protocol & domain
 * @param the link href (could be relative or absolute)
 * @returns the full path uri matching to the link
 */
var linkToURI = function(pageUri, link) {

    try {
      var page = buildURI(pageUri);
      var lk = buildURI(link);

      // fragment are not necessary for crawling a website
      lk = lk.fragment("");

      // convert absolute & relative links into a standard URI format
      if (isRelativeOrAbsolute(link)) {
        lk = lk.absoluteTo(pageUri);
      }

      return lk.toString();
    }
    catch (e) {
      log.error({"url" : link, "step" : "uri.linkToURI", "message" : "Impossible to build an standard URI for link", "options" : e});
      return "";
    }

}


/**
 * Check if an uri is relative or absolute
 *
 * @param the uri to check
 * @returns true is the uri is relative or absolute
 */
var isRelativeOrAbsolute = function (uri) {

    try {
        var parse = URI.parse(uri);
      	if ( ( ! parse.hasOwnProperty("protocol")) &&
      		 ( ! parse.hasOwnProperty("hostname")) && parse.hasOwnProperty("path")) {

      		return true;
      	}
      	return false;
    }
    catch (e) {
        log.error({"url" : link, "step" : "uri.isRelativeOrAbsolute", "message" : "Impossible to check if isRelativeOrAbsolute", "options" : e});
        return false;
    }


};

/**
 * Check if a link in an html page is external.
 *
 * @param the uri of the page that contains the link
 * @param the link defined in the page
 * @returns true if the link is external
 */
var isExternalLink = function (pageUri, link) {

    var page = buildURI(pageUri);
    var lk = buildURI(link);

    if (lk.host() == "" ) {
      return false;
    }

    return page.host() != lk.host();
}


var buildURI = function (uri) {

  try {
    return URI(uri);
  }
  catch (e) {
    log.error({"url" : uri, "step" : "uri.buildURI", "message" : "Impossible to build URI"});
    return URI("");
  }

}

module.exports.protocol = protocol;
module.exports.host = host;
module.exports.domain = domain;
module.exports.domainName = domainName;
module.exports.suffix = suffix;
module.exports.linkToURI = linkToURI;
module.exports.isRelativeOrAbsolute = isRelativeOrAbsolute;
module.exports.isExternalLink = isExternalLink;
