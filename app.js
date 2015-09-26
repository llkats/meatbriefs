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


// A queue for messages to be processed in, such that only one message is ever being processed at
// once. In theory we can process messages at the same time so long as they don't concern the same
// fingerprint, but messages on meatspace are generally infrequent enough that this isn't a
// necessary optimization at this point.
function BriefingQueue(db) {
  this._db = db;
  this._queue = [];
  this._running = false;
}

BriefingQueue.prototype.enqueue = function(chat, cb) {
  this._queue.push({ chat: chat, cb: cb });
  this._run();
}

BriefingQueue.prototype._run = function() {
  if (this._running) return;

  var self = this;
  function innerRun() {
    if (!self._queue.length) {
      self._running = false;
      return;
    }

    var task = self._queue.shift();
    briefify(task.chat, self._db, function(err) {
      task.cb(err);
      innerRun();
    });
  }

  this._running = true;
  innerRun();
}


function getYesterday() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

var briefer = new BriefingQueue(db)
socket.on('connect', function() {
  console.log('socket connected')
  socket.emit('join', 'jpg');
}).on('chat', function(chat) {
  briefer.enqueue(chat, function(err) {
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
