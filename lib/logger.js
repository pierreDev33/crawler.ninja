var winston =  require("winston");


var Logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
          name : "full-log",
          filename : "./logs/crawler.log",
          maxsize: 2000000, // 2MB
          maxFiles : 100
      }),
      new (winston.transports.File)({
          name: 'error-file',
          filename: './logs/error.log',
          level: 'error'//,
          //handleExceptions: true
      })

    ]
  });


var UrlLogger = new (winston.Logger)({
      transports: [
        new (winston.transports.File)({
          json : false,
          name : "urls",
          filename : "./logs/urls.log",
          maxsize: 2000000, // 2MB
          maxFiles : 100,
          formatter: function(options) {
            return options.message;
          }
        })
      ]
    });


var createLogger = function(name, file, json) {
  return new (winston.Logger)({
            transports: [
              new (winston.transports.File)({
                json : false,
                name : name,
                filename : file,
                maxsize: 2000000, // 2MB
                maxFiles : 100
              })
            ]
          });
}

module.exports.Logger = Logger;
module.exports.UrlLogger = UrlLogger;
module.exports.createLogger = createLogger;
