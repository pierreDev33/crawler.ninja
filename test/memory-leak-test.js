var assert      = require("assert");
var crawler          = require("../index.js");
var cs          = require("../plugins/console-plugin.js");
var testSite    = require("./website-2/start.js").site;

var heapdump    = require('heapdump');


var proxyList = null;

describe('Memory leaks', function() {


        it.skip('should crawl without memory leaks', function(done) {
            this.timeout(3000000);
            setInterval(function(){
              console.log(">>>>> Dump !");
              heapdump.writeSnapshot('./dump/dump' + Date.now() + '.heapsnapshot');
            }, 120000);

            var options = {
              skipDuplicates: true,
              scripts : false,
              links : false,
              image : false,
              maxConnections : 100

            }
            var c = new crawler.Crawler(options);
            var consolePlugin = new cs.Plugin();
            c.registerPlugin(consolePlugin);

            c.on("end", function(){
                done();
            });

            c.queue({url : "http://www.rtbf.be/", externalDomains: false});

        });

});
