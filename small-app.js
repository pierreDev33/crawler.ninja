var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var logger      = require("./plugins/log-plugin.js");
var crawler     = require("./index.js");

var proxyFile = "../../proxies.txt"; //change this !

// Load proxies
var config = proxyLoader.config()
                        .setProxyFile(proxyFile)
                        .setCheckProxies(false)
                        .setRemoveInvalidProxies(false);

proxyLoader.loadProxyFile(config, function(error, proxyList) {
    if (error) {
      console.log(error);

    }
    else {
       crawl(proxyList);
    }

});


function crawl(proxyList){
    var c = new crawler.Crawler({
        externalLinks : true,
        images : false,
        scripts : false,
        links : false, //link tags used for css, canonical, ...
        followRedirect : true,
        proxyList : proxyList
    });

    var log = new logger.Plugin(c);

    c.on("end", function() {

        var end = new Date();
        console.log("Well done Sir !, done in : " + (end - start));


    });

    var start = new Date();
    c.queue({url : "http://www.authorize.net/"});
}
