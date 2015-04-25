var logger    = require("./plugins/log-plugin.js");
var ep        = require("./plugins/expireddomains-plugin.js");
var crawler = require("./index.js");


var c = new crawler.Crawler({
    externalLinks : true,
    images : false,
    scripts : false,
    links : false, //link tags used for css, canonical, ...
    followRedirect : true
});

//var log = new logger.Plugin(c);
var logger    = require("./plugins/log-plugin.js");
var ep        = require("./plugins/expireddomains-plugin.js");
var crawler = require("./index.js");
var expired = new ep.Plugin(c);



c.on("end", function() {

    var end = new Date();
    console.log("Well done Sir !, done in : " + (end - start));


});

var start = new Date();
c.queue({url : "http://www.authorize.net/"});
