function Plugin() {
    this.name = "TooLong-Plugin";
}

Plugin.prototype.crawl = function (result,$, callback) {

    setTimeout(function() {
      callback();
    }, 1500);

};


module.exports.Plugin = Plugin;
