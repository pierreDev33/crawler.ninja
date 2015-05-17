/**
 * Utily functions used to transform, create, extract info on URIs
 *
 * Based on the module URIjs : http://medialize.github.io/URI.js/
 */
var log = require("../lib/logger.js").Logger;

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

    var page = buildURI(pageUri);
    var lk = buildURI(link);

    // fragment are not necessary for crawling a website
    lk = lk.fragment("");

    // convert absolute & relative links into a standard URI format
    if (isRelativeOrAbsolute(link)) {
      lk = lk.absoluteTo(pageUri);
    }

    return lk.toString();
};


/**
 * Checl if an uri is relative or absolute
 *
 * @param the uri to check
 * @returns true is the uri is relative or absolute
 */
var isRelativeOrAbsolute = function (uri) {

	var parse = URI.parse(uri);
	if ( ( ! parse.hasOwnProperty("protocol")) &&
		 ( ! parse.hasOwnProperty("hostname")) && parse.hasOwnProperty("path")) {

		return true;
	}
	return false;

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
    return page.host() != lk.host();
}


var buildURI = function (uri) {

  try {
    return URI(uri);
  }
  catch (e) {
    console.log("Impossible to build uri for : " +  uri +  " - error : " + e);
    log.error("Impossible to build uri for : " +  uri +  " - error : " + e);
  }

}

module.exports.protocol = protocol;
module.exports.host = host;
module.exports.linkToURI = linkToURI;
module.exports.isRelativeOrAbsolute = isRelativeOrAbsolute;
module.exports.isExternalLink = isExternalLink;
