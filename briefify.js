// Takes a meat message and decides whether it should be inserted in the DB
// (and if so, does so).
module.exports = function briefify(meat, db, cb) {
  var meatDate = new Date(meat.created);
  db.getCount(meat.fingerprint, meatDate, function(err, count) {
    if (err) {
      return cb(err);
    }

    if (!count) {
      // If this is the user's first message, always insert it
      return db.addMeat(meat, 1, cb);
    } else if (shouldReplace(count + 1)) {
      // What a lucky message! Replace the previous one we were storing.
      return db.addMeat(meat, count + 1, cb);
    } else {
      // Poor, unlucky message :( Tally its existence so the probability
      // calculations for later messages will be correct.
      return db.incrementCount(meat.fingerprint, meatDate, cb);
    }
  });
};

// Flip a coin to decide whether a new message should replace the old one.
// Since these are successive coin flips, the probability of a replacement is
// actually 1 / messageCount, rather than 1/2.
function shouldReplace(count) {
  return Math.random() < (1 / count);
}
