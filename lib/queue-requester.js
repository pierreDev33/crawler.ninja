var events      = require('events');
var util        = require('util');

var async       = require('async');
var _           = require('lodash');
var workerFarm  = require('worker-farm');
var Set         = require("collections/fast-set");
var html        = require("./html.js");
var request     = require("./http-request.js");

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

/**
 * The web cralwer
 *
 * its main job is to make the http request & get the responsed
 * It is used a internal queue to limit the number of workers
 *
 * @param the config to uses to make the requests.
 *
 */
var Requester = function(options) {

    this.options = options;
    // The crawl history
    this.history = new Set();


    this.initQueue();

    if (this.options.multiCores) {
      this.workers = workerFarm(require.resolve('./http-request.js'));
    }

    events.EventEmitter.call(this);
}

util.inherits(Requester, events.EventEmitter);


/**
 * Add a new url to crawl
 *
 * @param the options used to configure the crawl
 *
 */
Requester.prototype.queue = function(options) {

    options.uri = options.url;
    // if skipDuplicates, don't crawl twice the same uri
    if (this.options.skipDuplicates) {

      if(this.history.has(options.uri)) {
          return;
      }
      else {
        this.history.add(options.uri);
      }

    }


    this.q.push(options);

    // Did you get a single object or string? Make it compatible.
    /*
    options = _.isString(options) || _.isPlainObject(options) ? [ options ] : options;
    if (options !== undefined && options.length == 1) {
        self._pushToQueue(
            _.isString(options[0]) ? { uri: options[0] } : options[0]
        );
    // Did you get multiple requests? Queue the URLs.
    } else if (options !== undefined) {
        self.queue(
            _.isString(options[0]) ? { uri: options[0] } : options[0]
        );
        self.queue(options.slice(1))
    }
    */
}


/**
 * Init the queue
 *
 */
Requester.prototype.initQueue = function () {

  var self = this;
  this.q = async.queue(
               function (options, callback) {
                    var jsonOpt = _.extend(options, self.options);

                    if (options.proxyList) {
                      jsonOpt.proxy  = options.proxyList.getProxy().getUrl();
                    }

                    if (self.options.multiCores) {
                        self.workers(jsonOpt, function(error, result){

                          self.options.callback(error, result);

                          callback();

                        });
                    }
                    else {
                        request(jsonOpt, function(error, result){

                          self.options.callback(error, result);

                          callback();

                        });
                    }

               },
               self.options.maxConnections);

  this.q.drain = function() {

      if (self.options.onDrain) {
        self.options.onDrain();
      }

      if (self.options.multiCores) {
        workerFarm.end(self.workers);
      }

  }

}



module.exports.Requester = Requester;
