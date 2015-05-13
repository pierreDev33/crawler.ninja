var bunyan = require('bunyan');
var fs = require('graceful-fs');

var logFolder = process.cwd() + "/logs";
var logfile = logFolder + '/crawler.log';


fs.mkdir(logFolder, function(err) {

    if (err && err.code != "EEXIST") {
    	throw err;
    };
});

// Levels : trace, debug, info, warn, error

var Logger = bunyan.createLogger({
  name: 'crawler.ninja',
  streams: [
    {
      type: 'rotating-file',
      path: logfile,
      period: '1d',
      count: 20
    }
  ]
});

module.exports.Logger = Logger;
