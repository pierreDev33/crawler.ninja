var Map      = require("collections/fast-map");
var async    = require("async");
var log      = require("crawler-ninja-logger").Logger;

var PluginManager = function() {
  this.plugins =  new Map();

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
    log.debug({"step" : "plugin-manager.registerPlugin", "message" : "Register Plugin : " + plugin.name});
    this.plugins.set(name, plugin);

}

PluginManager.prototype.unregisterPlugin = function (plugin) {

    log.debug({"step" : "plugin-manager.unregisterPlugin", "message" : "Unregister Plugin : " + plugin.name});

    this.plugins.delete(plugin.name);

}

PluginManager.prototype.crawl = function (result, $, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawl) {
            log.debug({"url" : result.uri, "step" : "plugin-manager.crawl", "message" : "Call function crawl for plugin : " + plugin.name});
            plugin.crawl(result, $, callback);
        }
        else {
            log.debug({"url" : result.uri, "step" : "plugin-manager.crawl", "message" : "No function crawl for plugin : " + plugin.name});
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.error = function (error, result, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.error) {
            log.debug({"url" : result.uri, "step" : "plugin-manager.error", "message" : "Call function error for plugin : " + plugin.name});
            plugin.error(error, result, callback);
        }
        else {
            log.debug({"url" : result.uri, "step" : "plugin-manager.error", "message" : "No function error for plugin : " + plugin.name});
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlRedirect = function (from, to, statusCode, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawlRedirect) {
            log.debug({"url" : from, "step" : "plugin-manager.crawlRedirect", "message" : "Call function redirect for plugin : " + plugin.name , "options" : {"to" : to, "statusCode" : statusCode}});
            plugin.crawlRedirect(from, to, statusCode, callback);
        }
        else {
            log.debug({"url" : from, "step" : "plugin-manager.crawlRedirect", "message" : "No function crawlRedirect for plugin : " + plugin.name , "options" : {"to" : to, "statusCode" : statusCode}});
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlLink = function (page, link, anchor, isDoFollow, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {

        if (plugin.crawlLink) {
            log.debug({"url" : link, "step" : "plugin-manager.crawlLink", "message" : "Call function crawlLink for plugin : " + plugin.name, "options" : {"page" : page, "anchor" : anchor, "isDoFollow" : isDoFollow}});
            plugin.crawlLink(page, link, anchor, isDoFollow, callback);
        }
        else {
            log.debug({"url" : link, "step" : "plugin-manager.crawlLink", "message" : "No function crawlLink for plugin : " + plugin.name, "options" : {"page" : page, "anchor" : anchor, "isDoFollow" : isDoFollow}});
            callback();
        }

    }, endCallback);
}

PluginManager.prototype.crawlImage = function (page, link, alt, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.crawlImage) {
            log.debug({"url" : link, "step" : "plugin-manager.crawlImage", "message" : "Call function crawlImage for plugin : " + plugin.name, "options" : {"page" : page, "alt" : alt}});
            plugin.crawlImage(page, link, alt, callback);
        }
        else {
            log.debug({"url" : link, "step" : "plugin-manager.crawlImage", "message" : "No function crawlImage for plugin : " + plugin.name, "options" : {"page" : page, "alt" : alt}});
            callback();
        }

    }, endCallback);
}


PluginManager.prototype.unCrawl = function(page, link, anchor, isDoFollow, endCallback) {

    var ps = this.plugins.values();
    async.each(ps, function(plugin, callback) {
        if (plugin.unCrawl) {
            log.debug({"url" : link, "step" : "plugin-manager.unCrawl", "message" : "Call function unCrawl for plugin : " + plugin.name, "options" : {"page" : page, "anchor" : anchor, "isDoFollow" : isDoFollow}});
            plugin.unCrawl(page, link, anchor, isDoFollow, callback);
        }
        else {
            log.debug({"url" : link, "step" : "plugin-manager.unCrawl", "message" : "No function unCrawl for plugin : " + plugin.name, "options" : {"page" : page, "anchor" : anchor, "isDoFollow" : isDoFollow}});
            callback();
        }
    }, endCallback);
}

module.exports.PluginManager = PluginManager;
