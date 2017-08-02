'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateContributionFrequency;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateContributionFrequency(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    _this.query({ queryString: '\n      CREATE TABLE IF NOT EXISTS contribution_frequency (\n        rewardType     CHARACTER(66) PRIMARY KEY,\n        count          BIGINT NOT NULL DEFAULT 0,\n        percentOfTotal REAL\n      );\n    ' }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO contribution_frequency (\n            rewardType,\n            count,\n            percentOfTotal\n          ) SELECT\n          rewardType, count(rewardType),\n          count(rewardType)/(SELECT count(*)*1.0 FROM contributions)*100.0\n          FROM contributions GROUP BY rewardType\n          ON DUPLICATE KEY UPDATE\n          rewardType=VALUES(rewardType),\n          count=VALUES(count),\n          percentOfTotal=VALUES(percentOfTotal);\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM contribution_frequency;\n        '
      });
    }).then(function (contributionFrequency) {
      resolve(contributionFrequency);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateContributionFrequency' });
    });
  });
}