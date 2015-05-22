var bunyan = require('bunyan');


console.log("Use log in : " + process.cwd() + '/logs/crawler.log'); 
var Logger = bunyan.createLogger({
  name: 'full-log',
  streams: [
    {
      type: 'rotating-file',
      period : '1h',
      path: process.cwd() + '/logs/crawler.log'
    },
    {
      level: 'error',
      path: process.cwd() + '/logs/errors.log'
    }
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
