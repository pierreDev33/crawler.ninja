var assert    = require("assert");
var _         = require("underscore");
var expired   = require("../plugins/expireddomains-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('Expired domains plugin', function() {

        it.skip('Should return a list of expired domains', function(done) {

            var c = new crawler.Crawler({
                externalLinks : true,
                images : false,
                scripts : false,
                links : false, //link tags used for css, canonical, ...
                followRedirect : true
            });

            var ed = new expired.Plugin(c);
            var log = new logger.Plugin(c);

            c.on("end", function(){

                //assert(audit.errors.length == 1);
                done();

            });

            c.queue({url : "http://localhost:9999/internal-links.html"});

        });
});
