var express = require('express');
var objectify = require('through2-objectify');
var app = express();

var nconf = require('nconf');
nconf.argv().env().file({ file: 'config.json' });

var pub = __dirname + '/public';
var env = process.env.NODE_ENV || 'development';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(app.router);
app.use('/public', express.static(pub));
if (env != 'production') {
  app.use(express.errorHandler());
}
app.disable('x-powered-by'); // Don't say we're using Express

app.listen(nconf.get('http:port'));
console.log('Listening on port', nconf.get('http:port'));

var socketClient = require('socket.io-client');
var briefify = require('./briefify');
var db = require('./db');
var socketOptions = { 'max reconnection attempts': 1000 };
var socket = socketClient.connect('https://chat.meatspac.es', socketOptions);
var concat = require('concat-stream');
var robots = require('robots.txt');

function getYesterday() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

// WARNING: dumb hacks ahead. Since the DB has no locks or transactions per
// fingerprint, the initial flood of messages tends to cause duplicate messages
// to be inserted for people (especially with webm, since it transfers way
// faster). This dumb hack "fixes" this by ignoring the initial stream of
// messages. TODO(tec27): add locking/queuing of actions by fingerprints
var initMessages = false
socket.on('connect', function() {
  initMessages = true
  setTimeout(function() {
    initMessages = false
  }, 20000)
}).on('message', function(chat) {
  if (initMessages) return

  briefify(chat, db, function(err) {
    if (err) {
      console.log('error processing meat: ' + err);
      return;
    }
  });
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
