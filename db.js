var level = require('level');
var uuid = require('uuid');

var db = level('./data/', {
  createIfMissing: true,
  valueEncoding: 'json'
});

function getDateString(date) {
  return date.getFullYear() + '-' +
    (date.getMonth() + 1) + '-' + // WHY JAVA WHY
    date.getDate();
}

module.exports.addMeat = function(meat, cb) {
  var chat = meat.chat.value;
  var created = new Date(chat.created);
  var createdDay = getDateString(created);
  var dbKey = chat.created + '!' + uuid.v1();
  console.log('dbKey = ' + dbKey);

  // store two entries in the DB: one mapping timestamp => chat, and another
  // mapping day+fingerprint => the first DB entry. This allows us to quickly
  // check if someone is already in the summary for a day
  var operations = [
    {
      type: 'put',
      key: dbKey,
      value: chat
    },
    {
      type: 'put',
      key: createdDay + '!' + chat.fingerprint,
      value: dbKey
    }
  ];
  db.batch(operations, cb);
}
