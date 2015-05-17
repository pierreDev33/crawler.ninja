/**
 * Utility functions for managing HTML content
 *
 */
var cheerio     = require('cheerio');

module.exports.isHTML = function (body) {

  return body.match(/^\s*</) != null;
}


module.exports.$ = function (body) {

    var options = {
          normalizeWhitespace: false,
          xmlMode: false,
          decodeEntities: true
    };
    return cheerio.load(body, options);

};
