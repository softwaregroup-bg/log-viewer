var fs    = require('fs');
var lazy  = require('lazy');

var analyzer = function (logPath) {
  this.path = logPath;
  this.logs = {};

  this.getLogs = function () {
    var self = this;

    this.path.forEach(function (path) {
      fs.readdirSync(path).forEach(function (file) {
        if(file != 'log_db')
          self.analyze(file,path);
      });
    });
    return this.logs;
  };

  this.analyze = function (fn,pn) {
    var rx = /^([a-z\-]+)[\-]*([0-9\-]*)/i
    var matches = fn.match(rx);
    var name = matches[1].replace(/\-$/i,'');
    if(!this.logs[name])
      this.logs[name] = [];
    this.logs[name].push({"name":name,"date":matches[2].replace(/\-/ig,''),"file":{"name":fn,"path":pn}});
  };
};

var parser = function (logs) {
  var self    = this;
  this.logs   = logs || [];
  this.logPath = 'log_db/';

  this.templates = {
    "undertree":function (data) {
      data = data
        .replace(/\&lt\;/ig,'<')
        .replace(/\&quot\;/ig,'"')
        .replace(/\&#39\;/ig,'\'');
      var partial = data.match(/([^\t]+)/ig);
      var eventTime = partial[1];
      var detailsData = [];

      for (var i = 2 ; i < partial.length; i++) {
        if(partial[i]){
          var tmp = partial[i]
            .replace(/\\t/ig,"\t")
            .replace(/\\r/ig,'')
            .replace(/\\n/ig,"\n");
          detailsData.push(tmp);
        }
      };
      return {
        "eventTime":eventTime,
        "detailsData":detailsData
      };
    }
  };

  this.parse = function () {
    for(list in this.logs){
      this.logs[list].forEach(function (file) {
        self.parseFile.apply(file);
      })
    }
  };
  this.getLastReadLine = function (fileInfo) {
    var logPath = fileInfo.path+self.logPath;
    var logFile = fileInfo.path+self.logPath+fileInfo.name;
    var lastLinrRead = 0;
    if(!fs.existsSync(logPath)){
      fs.mkdirSync(logPath, '0777');
    }
    if(!fs.existsSync(logFile)){
      fs.open(logFile, 'w', 0777, function (err,fd) {
        fs.close(fd);
      });
    } else {
      lastLinrRead = parseInt(fs.readFileSync(logFile).toString().trim());
    }
    return lastLinrRead;
  };
  this.parseFile = function () {
    var _file = this;
    var template = self.templates[this.name];
    var getLastReadLine = self.getLastReadLine(this.file);

    if(template){
      var lastLine = 0;
      var Lazy = new lazy(fs.createReadStream(this.file.path+this.file.name))
      .lines
      .forEach(function (line) {
        lastLine++;
        if(getLastReadLine-- <= 0){
          var templateRes = template(line.toString());
          templateRes.file = _file;
        }
        console.log(templateRes);
      });
      Lazy.on('pipe',function () {
        fs.writeFileSync(_file.file.path+self.logPath+_file.file.name,lastLine,{'flag':'w'});
        setTimeout(function () {
          logParserStart();
        },2000);
      })
    }
  }
};
function logParserStart(req, res, next){
  console.log('Starting');

  var Analyzer = new analyzer(['./logs/']);
  var Parser = new parser(Analyzer.getLogs());
  Parser.parse();
  if(res)
    res.json({"result":"OK"});
};

exports.create = function (req, res, next) {
  logParserStart(req, res, next);
};