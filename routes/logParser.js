var fs    = require('fs');
var lazy  = require('lazy');

var analyzer = function (logPath) {
  this.path = logPath;
  this.logs = {};

  this.getLogs = function () {
    var self = this;

    this.path.forEach(function (path) {
      fs.readdirSync(path).forEach(function (file) {
        if(file != 'log.txt')
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
  this.logs   = logs || [];
  var self    = this;
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
  this.getLastReadLine = function (file) {
    if(!fs.existsSync(file))
  };
  this.parseFile = function () {
    var template = self.templates[this.name];
    var getLastReadLine = self.getLastReadLine(this.file.path+this.file.name);

    if(template){
      var Lazy = new lazy(fs.createReadStream(this.file.path+this.file.name))
      .lines
      .forEach(function (line) {
        template(line.toString());
      });
    }
  }
};

exports.create = function (req, res, next) {
  var Analyzer = new analyzer(['./logs/']);
  var Parser = new parser(Analyzer.getLogs());
  Parser.parse();

  res.render('index', { title: 'Express' });
};