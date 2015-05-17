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
var _           = require('lodash');
var log         = require("../lib/logger.js").Logger;

module.exports  = function(options, endCallback) {

    if (options.debug) {
        log.debug(options.method + ' ' + options.uri + ' - pid : ' + process.pid);
    }


    // Cloning keeps the opts parameter clean:
    // - some versions of "request" apply the second parameter as a
    // property called "callback" to the first parameter
    // - keeps the query object fresh in case of a retry
    // Doing parse/stringify instead of _.clone will do a deep clone and remove functions

    var ropts = JSON.parse(JSON.stringify(options));

    if (!ropts.headers) {
        ropts.headers={};
    }

    if (ropts.forceUTF8) {
        if (!ropts.headers['Accept-Charset'] && !ropts.headers['accept-charset']) {
            ropts.headers['Accept-Charset'] = 'utf-8;q=0.7,*;q=0.3';
        }
        if (!ropts.encoding) {
            ropts.encoding=null;
        }
    }

    if (ropts.userAgent) {
        ropts.headers['User-Agent'] = ropts.userAgent;
    }


    if (typeof ropts.encoding === 'undefined') {

        ropts.headers['Accept-Encoding'] = 'gzip';
        ropts.encoding = null;
    }


    if (ropts.referer) {
        ropts.headers.Referer = ropts.referer;
    }


    var requestArgs = ['uri','url','qs','method','headers','body','form','json','multipart','followRedirect',
        'followAllRedirects', 'maxRedirects','encoding','pool','timeout','proxy','auth','oauth','strictSSL',
        'jar','aws'];

    var start = new Date();
    var req = request(_.pick.apply(this,[ropts].concat(requestArgs)), function(error,response) {


        var end = new Date() - start;
        if (error) {

            return _onContent(error, endCallback, options);
        }

        var result = {};

        result.uri = response.request.href;
        result.url = response.request.href;
        result.statusCode = response.statusCode;
        result.responseTime = end;

        // can be usefull to add the proxy into the response to log
        result.proxy = ropts.proxy;
        result.headers = response.headers;
        result.body = response.body;
        result.method = options.method;

        if (response.headers['content-encoding'] &&
            response.headers['content-encoding'].toLowerCase().indexOf('gzip') >= 0 ) {
            zlib.gunzip(response.body, function (error, body) {
                if (error) {

                    return _onContent(error, endCallback, options);
                }

                if (!options.forceUTF8) {
                    result.body = body.toString(req.encoding);
                }
                else {
                    result.body = body;
                }

                _onContent(error, endCallback, options,result,false);
            });
        }
        else {
            _onContent(error, endCallback, options,result,false);
        }

    });
};

var _onContent = function(error, endCallback, options, response, fromCache) {
    var self = this;

    if (error) {


        if (options.debug) {
            log.error('Error '+error+' when fetching '+
            options.uri+(options.retries?' ('+options.retries+' retries left)':''));
        }
        /*
        if (options.retries) {
            self.plannedQueueCallsCount++;
            setTimeout(function() {
                options.retries--;
                self.plannedQueueCallsCount--;

                // If there is a "proxies" option, rotate it so that we don't keep hitting the same one
                if (options.proxies) {
                    options.proxies.push(options.proxies.shift());
                }

                self.queue(options);
            },options.retryTimeout);

        } else if (options.callback) {
            options.callback(error, options);
        }*/
        //console.log(options);
        return endCallback({code: error.code}, options);

    }

    if (!response.body) { response.body=''; }

    if (options.debug) {
        console.log('Got '+(options.uri||'html')+' ('+response.body.length+' bytes)...');
    }

    /*
    if (options.forceUTF8) {
        //TODO check http header or meta equiv?
        var iconvObj;

        if (!options.incomingEncoding) {
            var detected = jschardet.detect(response.body);

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
                        response.body = iconvObj.convert(response.body).toString();

                        // iconv-lite doesn't support Big5 (yet)
                    } else if (detected.encoding !== 'Big5') {
                        response.body = iconvLite.decode(response.body, detected.encoding);
                    }

                } else if (typeof response.body !== 'string') {
                    response.body = response.body.toString();
                }

            } else {
                response.body = response.body.toString('utf8'); //hope for the best
            }
        } else { // do not hope to best use custom encoding
            if (iconv) {
                iconvObj = new iconv(options.incomingEncoding, 'UTF-8//TRANSLIT//IGNORE');
                response.body = iconvObj.convert(response.body).toString();
                // iconv-lite doesn't support Big5 (yet)
            } else if (options.incomingEncoding !== 'Big5') {
                response.body = iconvLite.decode(response.body, options.incomingEncoding);
            }
        }

    } else {
    */
        response.body = response.body.toString();
    //}

    /*
    TODO : Add cache support ?
    if (useCache(options) && !fromCache) {
        if (options.cache) {
            self.cache[options.uri] = [response];

            //If we don't cache but still want to skip duplicates we have to maintain a list of fetched URLs.
        } else if (options.skipDuplicates) {
            self.cache[options.uri] = true;
        }
    }
    */
    endCallback(null, response);
};
