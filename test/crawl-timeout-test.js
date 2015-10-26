var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");
var cs        = require("../plugins/console-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('Timeout & error tests', function() {


        it.skip('Should crawl the complete site even with timeout without retries', function(done) {
            this.timeout(5000);
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

            crawler.init({timeout: 50, maxErrors:-1, retries:0 }, end);
            crawler.registerPlugin(audit);
            //crawler.registerPlugin(cons);
            crawler.queue({url : "http://localhost:9999/page4.html"});


        });

        it.skip('Should crawl the complete websute even with timeout with retries', function(done) {
            this.timeout(10000);
            var audit = new seoaudit.Plugin();
            var end =  function(){

                var resource = audit.resources.get("http://localhost:9999/timeout");

                assert(resource.statusCode==408);
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[0].page == "http://localhost:9999/timeout");
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[1].page == "http://localhost:9999/");
                assert(audit.inLinks.get("http://localhost:9999/timeout")[0].page == "http://localhost:9999/page4.html");

                done();

            };

            crawler.init({timeout: 50, retries : 3, retryTimeout : 200}, end);
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9999/page4.html"});

        });


        it.skip('Should stop to crawl the site if there are too many errors', function(done) {
            this.timeout(60000);

            var audit = new seoaudit.Plugin();
            var cons = new cs.Plugin();

            var end = function(){
                console.log(audit.errors.toArray());
                done();
            };

            crawler.init({skipDuplicates : false, maxConnections: 2, timeout: 50, maxErrors : 3, retries : 2, retryTimeout:200}, end);
            crawler.registerPlugin(audit);
            crawler.registerPlugin(cons);

            crawler.queue({url : "http://localhost:9999/page11.html"});

        });

        it.skip('Should crawl with a rate limit', function(done) {

            this.timeout(20000);
            var end =  function() {
                assert(audit.resources.keys().length == 16);
                //console.log(audit.resources.keys());
                done();
            };

            var audit = new seoaudit.Plugin();
            crawler.init({rateLimits:500}, end);
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9991/index.html"});

        });


});
