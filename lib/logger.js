var fs     = require("fs")
var bunyan = require("bunyan");


var logFile = process.cwd() + "/logs/crawler.log";

console.log("Use log in : " + logFile);

var Logger = bunyan.createLogger({
  name: 'full-log',
  streams: [
    {
      type: 'rotating-file',
      period : '1h',
      path: logFile
    },
    {
      level: 'error',
      path: logFile
    },
  ]
});


var createLogger = function(name, file) {
  return bunyan.createLogger({
    name: name,
    streams: [
      {
        type: 'rotating-file',
        period : '1h',
        path: file
      }
    ]
  });

}

module.exports.Logger = Logger;
module.exports.createLogger = createLogger;
