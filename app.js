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
app.disable('x-powered-by'); // Don't say we're using Express

app.listen(nconf.get('http:port'));
console.log('Listening on port ', nconf.get('http:port'));

var socketClient = require('socket.io-client');
var briefify = require('./briefify');
var db = require('./db');
var socket = socketClient.connect('https://chat.meatspac.es');
var concat = require('concat-stream');


var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

socket.on('message', function(data) {
  var meat = data.chat.value;
  briefify(meat, db, function(err) {
    if (err) {
      console.log('error processing meat: ' + err);
      return;
    }
  });
});

app.get('/moar/:lastEntryKey', function(req, res) {

  // get the next 20 messages using the key of the last message present on the page
  var summary = db.getSummary(yesterday, 2, 20, req.params.lastEntryKey);

  // render the partial and send the HTML string to the client
  var write = concat(function(summary) {
    res.render('meat', { data:summary }, function(err, html) {
      res.send(html);
    });
  });

  summary.pipe(write);
});

app.get('/', function(req, res){
  var summary = db.getSummary(yesterday, 1, 20);

  var write = concat(function(streamdata) {
    res.render('index', { data:streamdata });
  });

  summary.pipe(write);

});
