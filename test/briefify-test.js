var briefify = require('../briefify');

var expect = require('chai').expect;

function getTestDb() {
  var added = [];
  var incremented = [];
  var countGetter = function(fingerprint, date, cb) {
    process.nextTick(function() {
      cb(0);
    });
  };
  return {
    addMeat: function(meat, cb) {
      added.push(meat);
      process.nextTick(function() {
        cb();
      });
    },
    incrementCount: function(fingerprint, date, cb) {
      incremented.push({ fingerprint: fingerprint, date: date });
      process.nextTick(function() {
        cb();
      });
    },
    getCount: function(fingerprint, date, cb) {
      countGetter(fingerprint, date, cb);
    },
    _getAdded: function() {
      return added;
    },
    _getIncremented: function() {
      return incremented;
    },
    _setCountGetter: function(fn) {
      countGetter = function(fingerprint, date, cb) {
        process.nextTick(function() {
          fn(fingerprint, date, cb);
        });
      }
    }
  };
}

// stub out Math.random so that tests are predictable
var RANDOM_RESULT = 0;
Math.random = function() {
  return RANDOM_RESULT;
};

describe('briefify', function() {
  var testDb;

  beforeEach(function() {
    RANDOM_RESULT = 0;
    testDb = getTestDb();
  });

  it('should add a message from a new fingerprint', function(done) {
    var meat = {
      fingerprint: 'asdf',
      created: Date.now()
    };
    briefify(meat, testDb, function() {
      var added = testDb._getAdded();
      expect(added).to.have.length(1);
      expect(added[0]).to.deep.equal(meat);

      done();
    });
  });

  it('should replace a message if probability decides to', function(done) {
    var meat = {
      fingerprint: 'asdf',
      created: Date.now()
    };
    testDb._setCountGetter(function(fingerprint, date, cb) {
      expect(fingerprint).to.equal('asdf');
      expect(date).to.eql(new Date(meat.created));
      cb(null, 1);
    });

    briefify(meat, testDb, function() {
      var added = testDb._getAdded();
      expect(added).to.have.length(1);
      expect(added[0]).to.deep.equal(meat);

      done();
    });
  });

  it('should increment the count if not replacing', function(done) {
    var meat = {
      fingerprint: 'asdf',
      created: Date.now()
    };
    testDb._setCountGetter(function(fingerprint, date, cb) {
      expect(fingerprint).to.equal('asdf');
      expect(date).to.eql(new Date(meat.created));
      cb(null, 1);
    });
    RANDOM_RESULT = 0.75;

    briefify(meat, testDb, function() {
      var added = testDb._getAdded();
      var incremented = testDb._getIncremented();

      expect(added).to.have.length(0);
      expect(incremented).to.have.length(1);
      expect(incremented[0].fingerprint).to.equal('asdf');
      expect(incremented[0].date).to.eql(new Date(meat.created));

      done();
    });
  });
});
