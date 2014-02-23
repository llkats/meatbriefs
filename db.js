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

function getExistenceKey(fingerprint, date) {
  return getDateString(date) + '!' + fingerprint;
}

// Add a message to the db, and update the fingerprint's existence entry with
// the new count
module.exports.addMeat = function(meat, count, cb) {
  var created = new Date(meat.created);
  var dbKey = meat.created + '!' + uuid.v1();

  // store two entries in the DB: one mapping timestamp => message, and another
  // mapping day+fingerprint => the first DB entry. This allows us to quickly
  // check if someone is already in the summary for a day
  var operations = [
    // message
    {
      type: 'put',
      key: dbKey,
      value: meat
    },
    // existence
    {
      type: 'put',
      key: getExistenceKey(meat.fingerprint, created),
      value: {
        message: dbKey,
        count: count
      }
    }
  ];
  db.batch(operations, cb);
}

// Updates the message count for a particular fingerprint/day, without replacing
// the message currently stored for them
module.exports.incrementCount = function(fingerprint, date, cb) {
  var key = getExistenceKey(fingerprint, date);
  db.get(key, function(err, value) {
    if (err) {
      cb(err);
      return;
    }

    value.count++;
    db.put(key, value, function(err) {
      cb(err);
    });
  });
};

// Retrieves the number of messages that have been seen for a fingerprint during
// a specific day
module.exports.getCount = function(fingerprint, date, cb) {
  var key = getExistenceKey(fingerprint, date);
  db.get(key, function(err, value) {
    if (err) {
      if (err.notFound) {
        cb(null, 0);
      } else {
        cb(err);
      }
      return;
    }

    cb(null, value.count);
  });
}
