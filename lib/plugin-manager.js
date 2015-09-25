var Map      = require("collections/fast-map");
var async    = require("async");
var logger   = require("./logger.js").Logger;

var PluginManager = function() {
  this.plugins =  new Map();
  this.pluginCounter = 0;
}

PluginManager.prototype.registerPlugin = function (plugin) {
    var name = "plugin-" ;
    if (plugin.name) {
      name += plugin.name;
    }
    else {
      name +=  ++this.pluginCounter;
      plugin.name = name;
    }
    log("Register Plugin : " + plugin.name);
    this.plugins.set(name, plugin);

}

PluginManager.prototype.unregisterPlugin = function (plugin) {

    log("Unregister Plugin : " + plugin.name);
    this.plugins.delete(plugin.name);

}

PluginManager.prototype.crawl = function (result, $, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawl) {
            log("Call function crawl for plugin : " + plugin.name + ' for ' + result.uri);
            plugin.crawl(result, $, callback);
        }
        else {
            log("No function crawl for plugin : " + plugin.name + ' for ' + result.uri);
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.error = function (error, result, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.error) {
            log("Call function error for plugin : " + plugin.name );
            plugin.error(error, result, callback);
        }
        else {
            log("No function error for plugin : " + plugin.name );
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlRedirect = function (from, to, statusCode, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawlRedirect) {
            log("Call function crawlRedirect for plugin : " + plugin.name + ' for ' + from);
            plugin.crawlRedirect(from, to, statusCode, callback);
        }
        else {
            log("No function crawlRedirect for plugin : " + plugin.name + ' for ' + to);
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlLink = function (page, link, anchor, isDoFollow, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {

        if (plugin.crawlLink) {
            log("Call function crawlLink for plugin : " + plugin.name + ' for ' + link);
            plugin.crawlLink(page, link, anchor, isDoFollow, callback);
        }
        else {
            log("No function crawlLink for plugin : " + plugin.name + ' for ' + link);
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlImage = function (page, link, alt, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawlImage) {
            log("Call function crawlImage for plugin : " + plugin.name + ' for ' + link);
            plugin.crawlImage(page, link, alt, callback);
        }
        else {
            log("No function crawlImage for plugin : " + plugin.name + ' for ' + link);
            callback();
        }

    }, endCallback);
}


PluginManager.prototype.unCrawl = function(page, link, anchor, isDoFollow, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.unCrawl) {
            log("Call function unCrawl for plugin : " + plugin.name + ' for ' + link);
            plugin.unCrawl(page, link, anchor, isDoFollow, callback);
        }
        else {
            log("No function unCrawl for plugin : " + plugin.name + ' for ' + link);
            callback();
        }
    }, endCallback);
}

var log = function(message, options) {

    //console.log(message, options ? options :  "");


    var data = {
        step    : "plugin-manager",
        message : message
    }
    if (options) {
      data.options = options;
    }
    logger.debug(data);
    
}


module.exports.PluginManager = PluginManager;
