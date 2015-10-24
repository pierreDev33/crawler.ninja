var assert    = require("assert");
var _         = require("underscore");
var tooLong   = require("./plugins/long-plugin.js");
var crawler   = require("../index.js");

var testSite  = require("./website/start.js").site;



describe('Crawl invalid href', function() {

        it('Should wait until the end of a long plugin', function(done) {
            this.timeout(3000);
            var end =  function(){
                done();
            };

            crawler.init(null, end);
            var p = new tooLong.Plugin();
            crawler.registerPlugin(p);

            crawler.queue({url : "http://localhost:9999/page6.html"});
        });

});
