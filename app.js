var express = require('express');
var errorHandler = require('errorhandler');
var serveStatic = require('serve-static');
var objectify = require('through2-objectify');
var app = express();

var nconf = require('nconf');
nconf.argv().env().file({ file: 'config.json' });

var pub = __dirname + '/public';
var env = process.env.NODE_ENV || 'development';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use('/public', serveStatic(pub));
if (env != 'production') {
  app.use(errorHandler());
}
app.disable('x-powered-by'); // Don't say we're using Express

app.listen(nconf.get('http:port'));
console.log('Listening on port', nconf.get('http:port'));

var socketClient = require('socket.io-client');
var briefify = require('./briefify');
var db = require('./db');
var socketOptions = { 'max reconnection attempts': 1000 };
var socket = socketClient('https://chat.meatspac.es', socketOptions);
var concat = require('concat-stream');
var robots = require('robots.txt');

function getYesterday() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

// WARNING: dumb hacks ahead. Since the DB has no locks or transactions per
// fingerprint, the initial flood of messages tends to cause duplicate messages
// to be inserted for people. This dumb hack "fixes" this by ignoring the initial
// stream of messages. TODO(tec27): add locking/queuing of actions by fingerprints
var connectTime = 0
socket.on('connect', function() {
  console.log('socket connected')
  connectTime = Date.now() + 1000 // add a second to account for clock skew
  socket.emit('join', 'webm');
}).on('message', function(chat) {
  if (chat.created < connectTime) return

  briefify(chat, db, function(err) {
    if (err) {
      console.error('error processing meat: ' + err);
      return;
    }
  });
}).on('connect_error', function(err) {
  console.error('Error connecting', err);
}).on('connect_timeout', function() {
  console.error('Websocket connection timed out.');
});

// robots.txt
app.use(robots(__dirname + '/public/robots.txt'));

app.get('/moar/:lastEntryKey', function(req, res) {
  // get the next 20 messages using the key of the last message present on the page
  var summary = db.getSummary(getYesterday(), 1, 20, req.params.lastEntryKey);
  res.writeHead(200, { 'Content-Type': 'text/plain' });

  var jsonify = objectify.deobj(function(chunk, enc, cb) {
    this.push(JSON.stringify(chunk) + '\n');
    cb();
  });

  summary.pipe(jsonify).pipe(res);
});

app.get('/', function(req, res){
  var summary = db.getSummary(getYesterday(), 1, 20);

  var write = concat(function(streamdata) {
    res.render('index', { data: streamdata });
  });

  summary.pipe(write);
});
