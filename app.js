var express = require('express');
var app = express();

var pub = __dirname + '/public';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(app.router);
app.use(express.static(pub));
app.use(express.errorHandler());

app.listen(4444);
console.log('Listening on port 4444');

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
  var today = new Date();
  var summary = db.getSummary(today);

  var write = concat(function(streamdata) {
    res.render('index', { data:streamdata });
  });

  summary.pipe(write);

});
