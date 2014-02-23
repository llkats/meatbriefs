var briefify = require('../briefify');

var expect = require('chai').expect;

var failDb = {
  addMeat: function() {
    throw new Error('addMeat should not have been called.');
  }
};

function getTestDb() {
  var meats = [];
  return {
    addMeat: function(meat, cb) {
      meats.push(meat);
      process.nextTick(function() {
        cb();
      });
    },
    _getMeats: function() {
      return meats;
    }
  };
}

describe('briefify', function() {
  var testDb;

  beforeEach(function() {
    testDb = getTestDb();
  });

  it('should add a message from a new fingerprint', function(done) {
    var meat = {};
    briefify(meat, testDb, done);

    expect(testDb._getMeats().length).to.equal(1);
    expect(testDb._getMeats()[0]).to.equal(meat);
  });
});
