var logger      = require("../logger.js").Logger;

var store = null;
/**
 *  Create a new crawler persistence store in function of the name of a module
 *
 * @param the nodejs module name
 * @param the params used for that store (optionals) - eg. connection infos, ...
 */
var createStore = function(moduleName, params) {
   logger.info("Create store with module : " + moduleName);
   var storeModule = require(moduleName);
   store = new storeModule.Store(params);
}

/**
 *
 * @return the crawl persistence store
 */
var getStore = function() {
    return store;
}

module.exports.createStore = createStore;
module.exports.getStore = getStore;
