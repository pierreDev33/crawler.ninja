/**
 * function that makes the HTTP call, check error, build a response
 * and send back this response/error to the queue requester
 *
 */
var request     = require('request');
var zlib        = require('zlib');
var _           = require('underscore');
var log         = require("../lib/logger.js").Logger;


module.exports  = function(options, endCallback) {

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
    var self = this;

    if (error) {
        return endCallback({code: error.code}, options);
    }

    // Sorry for this hack but that's solve some issue with Cheerio
    if (!result.body) {
        result.body='';
    }
    result.body = result.body.toString();


    result = _.extend(result, _.omit(options, _.keys(result)));

    endCallback(null, result);
};
