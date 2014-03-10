var express = require('express');
var app = express();

var nconf = require('nconf');
nconf.argv().env().file({ file: 'config.json' });

var pub = __dirname + '/public';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(app.router);
app.use(express.static(pub));
app.use(express.errorHandler());
app.use("/public", express.static(__dirname + '/public'));

app.listen(nconf.get('http:port'));
console.log('Listening on port ', nconf.get('http:port'));

var socketClient = require('socket.io-client');
var briefify = require('./briefify');
var db = require('./db');
var socket = socketClient.connect('https://chat.meatspac.es');
var concat = require('concat-stream');

socket.on('message', function(data) {
  var meat = data.chat.value;
  briefify(meat, db, function(err) {
    if (err) {
      console.log('error processing meat: ' + err);
      return;
    }
  });
});

app.get('/', function(req, res){
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  var summary = db.getSummary(yesterday, 2);

  var write = concat(function(streamdata) {
    res.render('index', { data:streamdata });
  });

  summary.pipe(write);

});
