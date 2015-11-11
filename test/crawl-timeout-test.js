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

});
