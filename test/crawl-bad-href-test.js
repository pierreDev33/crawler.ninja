var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var crawler   = require("../index.js");

var testSite  = require("./website/start.js").site;



describe('Crawl invalid href', function() {

        it('Should return an error for an invalid href', function(done) {
          this.timeout(3000);
            var c = new crawler.Crawler({externalDomains : true, externalHosts : true});
            var audit = new seoaudit.Plugin(c);

            c.on("end", function(){
                //console.log(audit.resources.keys());
                assert(audit.errors.length == 4);
                done();

            });

            c.queue({url : "http://localhost:9999/page10.html"});

        });

});
