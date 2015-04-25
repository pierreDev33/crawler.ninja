/**
 * Script used to start the local web site used for the unit tests.
 * This is mainly a static web site containing pages with the different use cases to tests
 */

var express     = require('express');
var serveStatic = require('serve-static');

var TEST_SITE_FOLDER = "./test/website-2/www";
var site = express();

site.use(serveStatic(TEST_SITE_FOLDER));

site.get('/redirect', function(req, res) {
  res.redirect(301, '/');
});


site.listen(9991);

//console.log("Website used for the tests is starting from : " + TEST_SITE_FOLDER);
exports.site = site;
