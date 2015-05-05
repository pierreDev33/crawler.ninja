var assert      = require("assert");
var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var crawler     = require("../index.js");
var testSite    = require("./website/start.js").site;

var proxyList = null;

describe('Proxies', function() {

        beforeEach(function(done) {

          var config = proxyLoader.config()
                                  .setProxyFile("./test/proxies.txt")
                                  .setCheckProxies(false)
                                  .setRemoveInvalidProxies(false);

          proxyLoader.loadProxyFile(config, function(error, list) {
              if (error) {
                console.log(error);
                done(error);
              }
              else {
                 proxyList = list;
                 done();
              }

          });


        });

        it('should execute the request with a proxy', function(done) {

            var c = new crawler.Crawler({proxyList : proxyList});

            c.on("end", function(){
                done();
            });

            c.on("error", function(error, result) {
               assert(result.proxy=="http://john:password@localhost:8000");
            });

            c.queue({url : "http://localhost:9999/internal-links.html"});

        });

});
