var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");
var cs        = require("../plugins/console-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('Timeout & error tests', function() {

        it('Should crawl with a rate limit', function(done) {

            this.timeout(10000);
            var end =  function() {
                assert(audit.resources.keys().length == 6);
                done();
            };

            var audit = new seoaudit.Plugin();
            //var cons = new cs.Plugin();
            crawler.init({rateLimits:100}, end);
            crawler.registerPlugin(audit);
            //crawler.registerPlugin(cons);

            crawler.queue({url : "http://localhost:9999/page1.html"});

        });

        it.skip('Should crawl the complete site with timeout & decreasing crawl rate', function(done) {
            this.timeout(60000);
            var audit = new seoaudit.Plugin();
            //var cons = new cs.Plugin();

            var end = function(){

                var resource = audit.resources.get("http://localhost:9999/timeout");
                //console.log(audit.resources.get("http://localhost:9999/timeout"));
                assert(resource.statusCode == 408);
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[0].page == "http://localhost:9999/timeout");
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[1].page == "http://localhost:9999/");
                assert(audit.inLinks.get("http://localhost:9999/timeout")[0].page == "http://localhost:9999/page4.html");

                done();

            };

            crawler.init({timeout: 100, retryTimeout : 200, maxErrors:5, retries:20 }, end);
            crawler.registerPlugin(audit);
            //crawler.registerPlugin(cons);
            crawler.queue({url : "http://localhost:9999/page4.html"});


        });

});
