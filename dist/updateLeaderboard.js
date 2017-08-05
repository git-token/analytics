'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateLeaderboard;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateLeaderboard(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var username = contribution.username,
        contributor = contribution.contributor,
        date = contribution.date;

    _this.query({ queryString: '\n      CREATE TABLE IF NOT EXISTS leaderboard (\n        username             CHARACTER(42) PRIMARY KEY,\n        contributorAddress   CHARACTER(42),\n        value                BIGINT NOT NULL DEFAULT 0,\n        latestContribution   BIGINT NOT NULL DEFAULT 0,\n        numContributions     BIGINT NOT NULL DEFAULT 0,\n        valuePerContribution REAL,\n        percentTokenCreation REAL\n      );\n    ' }).then(function () {
      return _this.query({ queryString: '\n          INSERT INTO leaderboard (\n            username,\n            contributorAddress,\n            value,\n            latestContribution,\n            numContributions,\n            valuePerContribution,\n            percentTokenCreation\n          ) VALUES (\n            "' + username + '",\n            "' + contribution['contributor'] + '",\n            (SELECT sum(value+reservedValue) FROM contributions WHERE username = "' + username + '"),\n            (SELECT max(date) FROM contributions WHERE username = "' + username + '"),\n            (SELECT count(*) FROM contributions WHERE username = "' + username + '"),\n            (SELECT sum(value+reservedValue)/count(*) FROM contributions WHERE username = "' + username + '"),\n            (SELECT 1.0*sum(value+reservedValue)/(select sum(value+reservedValue) from contributions WHERE date <= ' + date + ') FROM contributions WHERE username = "' + username + '")\n          ) ON DUPLICATE KEY UPDATE\n            value=VALUES(value),\n            latestContribution=VALUES(latestContribution),\n            numContributions=VALUES(numContributions),\n            valuePerContribution=VALUES(valuePerContribution),\n            percentTokenCreation=VALUES(percentTokenCreation)\n          ;\n        ' });
    }).then(function () {
      // Replace "0x0" with contract address;
      return _this.query({ queryString: '\n          INSERT INTO leaderboard (\n            username,\n            contributorAddress,\n            value,\n            latestContribution,\n            numContributions,\n            valuePerContribution,\n            percentTokenCreation\n          ) VALUES (\n            "Total",\n            "' + _this.contractDetails['address'] + '",\n            (SELECT sum(value+reservedValue) FROM contributions),\n            (SELECT max(date) FROM contributions),\n            (SELECT count(*) FROM contributions),\n            (SELECT (sum(value+reservedValue))/count(*) FROM contributions),\n            (SELECT 1.0*(sum(value+reservedValue))/(sum(value+reservedValue)) FROM contributions)\n          ) ON DUPLICATE KEY UPDATE\n            value=VALUES(value),\n            latestContribution=VALUES(latestContribution),\n            numContributions=VALUES(numContributions),\n            valuePerContribution=VALUES(valuePerContribution),\n            percentTokenCreation=VALUES(percentTokenCreation)\n          ;\n        '
      });
    }).then(function () {
      return _this.query({ queryString: '\n        SELECT * FROM leaderboard;\n      ' });
    }).then(function (leaderboard) {
      resolve(leaderboard);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateLeaderboard' });
    });
  });
}