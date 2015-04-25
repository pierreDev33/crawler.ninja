/**
 * Script used to start the local web site used for the unit tests.
 * This is mainly a static web site containing pages with the different use cases to tests
 */

var express     = require('express');
var serveStatic = require('serve-static');

var TEST_SITE_FOLDER = "./test/website/www";
var site = express();


site.get('/redirect', function(req, res) {
  res.redirect(301, '/page2.html');
});


site.get('/redirect1', function(req, res) {
  res.redirect(301, '/redirect2');
});


site.get('/redirect2', function(req, res) {
  res.redirect(302, '/redirect3');
});

site.get('/redirect3', function(req, res) {
  res.redirect(301, '/index.html');
});

site.get('/internal-error', function(req, res) {
  res.status(500).json({ error: 'Internal Server Error' });
});


site.get('/timeout', function(req, res) {
  setTimeout(function(){
    res.status(200).json({ message: 'This is a long process' });
  }, 1500);
});

site.use(serveStatic(TEST_SITE_FOLDER));
site.listen(9999);

//console.log("Website used for the tests is starting from : " + TEST_SITE_FOLDER);
exports.site = site;
