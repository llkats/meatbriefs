// Takes a meat message and decides whether it should be inserted in the DB
// (and if so, does so).
module.exports = function briefify(meat, db, cb) {
  // TODO(tec27): write an actual implementation for this
  db.addMeat(meat, cb);
};
