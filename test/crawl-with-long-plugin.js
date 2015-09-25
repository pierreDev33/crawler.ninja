var assert    = require("assert");
var _         = require("underscore");
var tooLong   = require("./plugins/long-plugin.js");
var crawler   = require("../index.js");

var testSite  = require("./website/start.js").site;



describe('Crawl invalid href', function() {

        it('Should wait until the end of a long plugin', function(done) {
          this.timeout(3000);
            var c = new crawler.Crawler();
            var p = new tooLong.Plugin();
            c.registerPlugin(p);

            c.on("end", function(){
                done();
            });

            c.queue({url : "http://localhost:9999/page6.html"});

        });

});
