var fs    = require('fs'),
  lazy  = require('lazy'),
  util  = require('util'),
  mongo = require('mongodb');

var Server = mongo.Server,//mongodb server
    Db = mongo.Db;//and db

var server = new Server('localhost', 27017, {auto_reconnect: true});//create server conn
db = new Db('utlogdb', server);//to database

var parserFinished = 0;

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
    parserFinished++;
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
        util.log('found file:' + file.file.name)
        self.parseFile.apply(file);
      });
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
      var fd = fs.openSync(logFile, 'w', 0777);
      fs.close(fd);
      fs.writeFileSync(fileInfo.path+self.logPath+fileInfo.name,0,{'flag':'w'});
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
          db.collection('data', function(err, collection) {
              collection.insert(templateRes, {safe:true}, function(err, result) {
                  if (err) {
                      util.log({'error':err});
                  } else {
                      util.log('Success!');
                  }
              });
          });
        }
      });
      Lazy.on('pipe',function () {
        fs.writeFileSync(_file.file.path+self.logPath+_file.file.name,lastLine,{'flag':'w'});
        parserFinished--;
        util.log('Files left(1): ' + parserFinished);
        if(parserFinished==0){return logParserStart();}
      });
    } else {
      parserFinished--;
      util.log('Files left(0): ' + parserFinished);
      if(parserFinished==0){return logParserStart();}
    }
  }
};
function logParserStart(req, res, next){
  util.log('..Waiting');
  setTimeout(function () {
    util.log('>>Starting');
    var Analyzer = new analyzer(['./logs/']);
    var Parser = new parser(Analyzer.getLogs());
    Parser.parse();
    if(res)
      res.json({"result":"OK"});
  },2000);
};

exports.create = function (req, res, next) {
  db.open(function(err,db){//test connection
      if(!err){
          util.log("Connected to '" + db.databaseName + "' database");
          db.collection('data', {safe:true}, function(err, collection) {
              if (err) {
                  util.log("The '" + collection.collectionName + "' collection doesn't exist. Creating it with sample data...");
                  populateDB();
              } else {
                logParserStart(req, res, next);
              }
          });
      }
  });
};