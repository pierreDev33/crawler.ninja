/**
 * function that makes the HTTP call, check error, build a response
 * and send back this response/error to the queue requester
 *
 */
var request     = require('request');
var zlib        = require('zlib');
var _           = require('underscore');

module.exports.checkRedirect = function(url, callback) {
    request({url : url, followRedirect : false}, function(error, response) {
        if (error) {
          return callback(null, url);
        }

        if (response.statusCode >= 300 && response.statusCode <= 399) {
          callback(null, response.headers["location"])
        }
        else {
          callback(null, url);
        }
    });
}

module.exports.get = function(options, endCallback) {

    if (! options.headers) {
        options.headers = {};
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
    request(_.pick.apply(this,[options].concat(requestArgs)), function(error,response) {

        var end = new Date() - start;
        if (error) {
            return endCallback({code: error.code}, options);
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
                    result = null;
                    return onContent(error, endCallback, options);
                }

                result.body = body;

                onContent(error, endCallback, options,result);
            });
        }
        else {
            onContent(error, endCallback, options,result);
        }

    }).setMaxListeners(0);
};

var onContent = function(error, endCallback, options, result) {

    // Sorry for this hack but that's solve some issues with Cheerio
    if (!result || !result.body) {
        result.body='';
    }
    result.body = result.body.toString();

    result = _.extend(result, _.omit(options, _.keys(result)));

    options = null;

    endCallback(null, result);
};
