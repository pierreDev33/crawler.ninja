var assert    = require("assert");
var crawler   = require("../index.js");
var audit     = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;


describe('Crawl Option tests', function() {

        it('Should returns an error for an empty options', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            c.registerPlugin(a);

            c.on("end", function(){

                assert(a.errors.toArray()[0].error.errorCode=="NO_OPTIONS");
                done();

            });

            c.queue();

        });

        it('Should returns a ressource with an option as a String', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            c.registerPlugin(a);

            //var l = new logger.Plugin(c);

            c.on("end", function(){

                assert(a.resources.get("http://localhost:9999/").statusCode ==200);
                done();

            });

            c.queue("http://localhost:9999/");

        });

        it('Should returns a ressource with an option as a json object', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            c.registerPlugin(a);

            //var l = new logger.Plugin(c);

            c.on("end", function(){

                assert(a.resources.get("http://localhost:9999/").statusCode ==200);
                done();

            });

            c.queue({url:"http://localhost:9999/"});

        });

        it('Should returns an error for an options without url ', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            c.registerPlugin(a);

            c.on("end", function(){

                assert(a.errors.toArray()[0].error.errorCode=="NO_URL_OPTION");
                done();

            });

            c.queue({});

        });

        it('Should returns a ressource with an option as a Array', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            c.registerPlugin(a);

            //var l = new logger.Plugin(c);

            c.on("end", function(){

                assert(a.resources.get("http://localhost:9999/page6.html").statusCode ==200);
                assert(a.resources.get("http://localhost:9999/").statusCode ==200);
                done();

            });

            c.queue(["http://localhost:9999/", {url:"http://localhost:9999/page6.html"}]);

        });


        it('Should use the custom options for all upcoming requests', function(done) {

            var c = new crawler.Crawler();
            var a = new audit.Plugin();
            //var l = new logger.Plugin();
            c.registerPlugin(a);
            
            var ok = false;

            c.on("end", function(){

                assert(ok);
                done();

            });

            c.queue({uri :"http://localhost:9999/page7.html",
                     userAgent : "dummyBot",
                     canCrawl : function (parentUri, link, anchor, isDoFollow){
                                    if (link == "http://localhost:9999/page9.html") {
                                      ok = true;
                                    }
                                    return true;
                                }

                     });


        });

});
