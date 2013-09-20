
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var error = require('./routes/error');
// var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(error.all);
}

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  var env = (app.get('env')?app.get('env'):'live')
  console.log('Express server{'+env+'} listening on port ' + app.get('port'));
});
