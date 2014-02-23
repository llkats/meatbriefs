var express = require('express');
var app = express();

var pub = __dirname + '/public';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(app.router);
app.use(express.static(pub));
app.use(express.errorHandler());

app.get('/', function(req, res){
  res.render('index');
});

app.listen(4444);
console.log('Listening on port 4444');


var socketClient = require('socket.io-client');
var socket = socketClient.connect('https://chat.meatspac.es');

socket.on('message', function(data) {
  // io.sockets.emit('newmeat', { meat: data });
  console.log('hey it\'s a new meat', data);
});
