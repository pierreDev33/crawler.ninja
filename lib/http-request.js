/**
 * function that makes the HTTP call, check error, build response
 * and send back this response/error to the requester manager
 *
 * @param the options to used to make the HTTP call
 * @param the callback used to send back the response or error
 *
 */
var request     = require('request');
var zlib        = require('zlib');
var _           = require('underscore');
var log         = require("../lib/logger.js").Logger;


// Fallback on iconv-lite if we didn't succeed compiling iconv


//TODO : used on when options.forceUTF8, is it really necessary  ?
/*
var iconv, iconvLite;
try {
    iconv = require('iconv').Iconv;
} catch (e) {}

if (!iconv) {
    iconvLite = require('iconv-lite');
}
*/

module.exports  = function(options, endCallback) {

    if (! options.headers) {
        options.headers = {};
    }

    if (options.forceUTF8) {
        if (!options.headers['Accept-Charset'] && !options.headers['accept-charset']) {
            options.headers['Accept-Charset'] = 'utf-8;q=0.7,*;q=0.3';
        }
        if (!options.encoding) {
            options.encoding=null;
        }
    }

    if (options.userAgent) {
        options.headers['User-Agent'] = options.userAgent;
    }


    if (typeof options.encoding === 'undefined') {

        options.headers['Accept-Encoding'] = 'gzip';
        options.encoding = null;
    }


    if (options.referer) {
        options.headers.Referer = options.referer;
    }



    var requestArgs = ['uri','url','qs','method','headers','body','form','json','multipart','followRedirect',
        'followAllRedirects', 'maxRedirects','encoding','pool','timeout','proxy','auth','oauth','strictSSL',
        'jar','aws'];


    var start = new Date();
    var req = request(_.pick.apply(this,[options].concat(requestArgs)), function(error,response) {


        var end = new Date() - start;
        if (error) {

            return onContent(error, endCallback, options);
        }

        var result = {};

        result.uri = response.request.href;
        result.url = response.request.href;
        result.statusCode = response.statusCode;
        result.responseTime = end;

        // can be usefull to add the proxy into the response to log
        result.proxy = options.proxy;
        result.headers = response.headers;
        result.body = response.body;
        result.method = options.method;

        if (response.headers['content-encoding'] &&
            response.headers['content-encoding'].toLowerCase().indexOf('gzip') >= 0 ) {
            zlib.gunzip(response.body, function (error, body) {
                if (error) {

                    return onContent(error, endCallback, options);
                }

                if (!options.forceUTF8) {
                    result.body = body.toString(req.encoding);
                }
                else {
                    result.body = body;
                }

                onContent(error, endCallback, options,result,false);
            });
        }
        else {
            onContent(error, endCallback, options,result,false);
        }

    }).setMaxListeners(0);
};

var onContent = function(error, endCallback, options, result, fromCache) {
    var self = this;

    if (error) {
        return endCallback({code: error.code}, options);
    }

    if (!result.body) { result.body=''; }

    /*
    if (options.forceUTF8) {
        //TODO check http header or meta equiv?
        var iconvObj;

        if (!options.incomingEncoding) {
            var detected = jschardet.detect(result.body);

            if (detected && detected.encoding) {
                if (options.debug) {
                    console.log(
                        'Detected charset ' + detected.encoding +
                        ' (' + Math.floor(detected.confidence * 100) + '% confidence)'
                    );
                }
                if (detected.encoding !== 'utf-8' && detected.encoding !== 'ascii') {

                    if (iconv) {
                        iconvObj = new iconv(detected.encoding, 'UTF-8//TRANSLIT//IGNORE');
                        result.body = iconvObj.convert(result.body).toString();

                        // iconv-lite doesn't support Big5 (yet)
                    } else if (detected.encoding !== 'Big5') {
                        result.body = iconvLite.decode(result.body, detected.encoding);
                    }

                } else if (typeof result.body !== 'string') {
                    result.body = result.body.toString();
                }

            } else {
                result.body = result.body.toString('utf8'); //hope for the best
            }
        } else { // do not hope to best use custom encoding
            if (iconv) {
                iconvObj = new iconv(options.incomingEncoding, 'UTF-8//TRANSLIT//IGNORE');
                result.body = iconvObj.convert(result.body).toString();
                // iconv-lite doesn't support Big5 (yet)
            } else if (options.incomingEncoding !== 'Big5') {
                result.body = iconvLite.decode(result.body, options.incomingEncoding);
            }
        }

    } else {
    */
        result.body = result.body.toString();
    //}

    /*
    TODO : Add cache support ?
    if (useCache(options) && !fromCache) {
        if (options.cache) {
            self.cache[options.uri] = [result];

            //If we don't cache but still want to skip duplicates we have to maintain a list of fetched URLs.
        } else if (options.skipDuplicates) {
            self.cache[options.uri] = true;
        }
    }
    */
    // Add in the result object all crawl options
    // By this way, the crawler can use the same options for upcoming requests (eg like the hrefs on page)
    result = _.extend(result, _.omit(options, _.keys(result)));

    endCallback(null, result);
};
