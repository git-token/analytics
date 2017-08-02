'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateContributorStats;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateContributorStats(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue,
        date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS contributor_stats (\n          date                 BIGINT NOT NULL DEFAULT 0,\n          username             CHARACTER(66),\n          tokensCreated        BIGINT NOT NULL DEFAULT 0,\n          percentOfTokenSupply REAL,\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO contributor_stats (\n            username,\n            tokensCreated,\n            percentOfTokenSupply\n          ) VALUES (\n          ) ON DUPLICATE KEY UPDATE\n            username=VALUES(username),\n            tokensCreated=VALUES(tokensCreated),\n            percentOfTokenSupply=VALUES(percentOfTokenSupply);\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM contributor_stats;\n        '
      });
    }).then(function (summary) {
      resolve(summary[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateSummaryStatistics' });
    });
  });
}