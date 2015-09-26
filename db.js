var level = require('levelup');
var uuid = require('uuid');
var ttl = require('level-ttl');

var TTL_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days, just to be safe :)

var db = level('./data/', {
  createIfMissing: true,
  valueEncoding: 'json'
});
db = ttl(db, { checkFrequency: 60 * 60 * 1000 /* 1 hour */ });

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
module.exports.addMeat = function(meat, cb) {
  var created = new Date(meat.sent);
  var id = uuid.v1();
  var dbKey = 'meat\xff' + meat.sent + '\xff' + id;
  var existenceKey = getExistenceKey(meat.userId, created);

  meat.video = 'data:' + meat.videoMime + ';base64,' + meat.video.toString('base64')

  // store two entries in the DB: one mapping timestamp => message, and another
  // mapping day+fingerprint => the first DB entry. This allows us to quickly
  // check if someone is already in the summary for a day
  var messagePut = {
    type: 'put',
    key: dbKey,
    value: meat
  };
  var existencePut = {
    type: 'put',
    key: existenceKey,
    value: {
      message: dbKey,
      count: 1,
    }
  };
  var operations = [
    messagePut,
    existencePut
  ];
  db.get(existenceKey, function(err, value) {
    if (err && !err.notFound) {
      return cb(err);
    }

    if (!err) {
      // the key already existed, so increment the count in it
      existencePut.value.count = value.count + 1;
      // queue up the deletion of the previous message
      operations.push({
        type: 'del',
        key: value.message
      });
    }

    db.batch(operations, { ttl: TTL_TIME }, cb);
  });
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
    db.put(key, value, { ttl: TTL_TIME }, function(err) {
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

var dayMs = 24*60*60*1000;
/* Returns a stream that reads up to pageSize messages for a specific range of days. Messages will
 * start being read from lastEntryKey if it is specified, allowing you to read subsequent pageSize'd
 * pages.
 *
 * Example usage:
 *    // return a stream of up to 20 messages from the last 2 days
 *    db.getSummary(new Date(), 2, 20);
 *    // return a stream of up to 20 message from the last 2 days, starting at a specific message
 *    db.getSummary(new Date(), 2, 20, '1234567890!deadbeef-cafe-d00d-1337-baadf00d');
 */
module.exports.getSummary = function(date, range, pageSize, lastEntryKey) {
  var startDate =
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  var endDate = startDate + dayMs * range;
  var startKey = 'meat\xff' + startDate + '\xff';
  var endKey = 'meat\xff' + endDate + '\xff';

  if (lastEntryKey && lastEntryKey.indexOf('meat\xff') != -1 &&
      lastEntryKey.indexOf('\xff', 6) != -1) {
    var lastEntryDate = +lastEntryKey.substring(5, lastEntryKey.indexOf('\xff', 6));
    if (!isNaN(lastEntryDate) && lastEntryDate >= startDate) {
      startDate = lastEntryDate;
      startKey = lastEntryKey;
      startKey += '\xff'
    }
  }

  if (startDate > endDate) {
    // no more results!
    pageSize = 0;
  }

  return db.createReadStream({
    start: startKey,
    end: endKey,
    limit: pageSize
  });
}
