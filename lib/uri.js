/**
 * Utily methods used to transform, create, extract info on URIs
 *
 */

var URI = require('URIjs');

var protocol = function(uri) {

  return URI(uri).protocol();

}


var host = function(uri) {
  return URI(uri).host();
}

/**
 * Build an standard URI format for a link href
 *
 * @param the page URI that contains the link
 * @param the link href
 * @returns a new url with match to the fusion of both url
 */
var linkToURI = function(pageUri, link) {

    var page = URI(pageUri);
    var lk = URI(link);

    // fragment are not necessary for crawling a website
    lk = lk.fragment("");

    // convert absolute & relative links into a standard URI format
    if (isRelativeOrAbsolute(link)) {
      lk = lk.absoluteTo(pageUri);
    }

    return lk.toString();
};



var isRelativeOrAbsolute = function (uri) {
  //console.log("isRelativeOrAbsolute : " + uri);
	var parse = URI.parse(uri);
	if ( ( ! parse.hasOwnProperty("protocol")) &&
		 ( ! parse.hasOwnProperty("hostname")) && parse.hasOwnProperty("path")) {

		return true;
	}
	return false;

};


var isExternalLink = function (pageUri, link) {

    var page = URI(pageUri);
    var lk = URI(link);
    //console.log("isExternalLink - pageUri : " + pageUri + " link : " + link + " : " + (page.host() != lk.host()) );
    return page.host() != lk.host();
}


module.exports.protocol = protocol;
module.exports.host = host;
module.exports.linkToURI = linkToURI;
module.exports.isRelativeOrAbsolute = isRelativeOrAbsolute;
module.exports.isExternalLink = isExternalLink;
