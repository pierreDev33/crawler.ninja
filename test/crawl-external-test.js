var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/console-plugin.js")

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('External Links', function() {

        it('Should not crawl external links & external domains by default', function(done) {
            var end = function(){

                assert(! audit.resources.get("http://www.nytimes.com"));
                assert(! audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") != null);
                done();

            };
            crawler.init(null, end);
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://localhost:9999/page2.html"});

        });


        it.skip('Should crawl external links but not entire domains', function(done) {
            this.timeout(3000);
            var end = function(){

                assert(audit.resources.get("http://www.nytimes.com/"));
                assert(audit.externalLinks.get("http://www.nytimes.com/") != null);
                done();

            };
            crawler.init({externalDomains : true, firstExternalLinkOnly : true}, end );
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);

            crawler.queue({url : "http://localhost:9999/page2.html"});

        });

        it('Should not crawl domains that are in the black list', function(done) {

            var end = function(){
                assert(audit.resources.toArray() == 0);
                assert(audit.errors.toArray()[0].error.code == "DOMAINBLACKLIST");
                done();
            };
            crawler.init(null, end);
            var audit = new seoaudit.Plugin();
            crawler.registerPlugin(audit);
            crawler.queue({url : "http://www.youtube.com"});

        });


        it.skip('Should crawl external links & external domains with a firstExternalLinkOnly', function(done) {
            this.timeout(900000);
            var end = function(){

                //assert(! audit.resources.get("http://www.nytimes.com"));
                //assert(! audit.resources.get("http://www.nytimes.com/"));
                //assert(audit.externalLinks.get("http://www.nytimes.com/") != null);
                done();

            };

            crawler.init({
              externalHosts : true,
              externalDomains : true,
              depthLimit : 2
            }, end);

            //var audit = new seoaudit.Plugin(c);
            var log = new logger.Plugin();
            crawler.registerPlugin(log);

            crawler.queue({url : "http://localhost:9999/page12.html"});

        });

});
