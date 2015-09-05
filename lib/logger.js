var fs     = require("fs")
var bunyan = require("bunyan");


var infoFile = process.cwd() + "/logs/crawler.log";
var debugFile = process.cwd() + "/logs/debug.log";

console.log("Use info log in : " + infoFile);
console.log("Use debug log in : " + debugFile);

var Logger = bunyan.createLogger({
  name: 'full-log',
  streams: [
    {
      type: 'rotating-file',
      period : '5h',
      path: infoFile,
      level : 'info'
    },
    {
      type: 'rotating-file',
      period : '5h',
      level: 'debug',
      path: debugFile,

    },
  ]
});


var createLogger = function(name, file) {
  return bunyan.createLogger({
    name: name,
    streams: [
      {
        type: 'rotating-file',
        period : '5h',
        path: file
      }
    ]
  });

}

module.exports.Logger = Logger;
module.exports.createLogger = createLogger;
