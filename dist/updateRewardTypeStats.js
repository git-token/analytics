'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateRewardTypeStats;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateRewardTypeStats(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue,
        date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS reward_type_stats (\n          rewardType           CHARACTER(66) PRIMARY KEY,\n          count                BIGINT NOT NULL DEFAULT 0,\n          tokenCreated         BIGINT NOT NULL DEFAULT 0,\n          valuePerCount        BIGINT NOT NULL DEFAULT 0,\n          frequency            REAL,\n          percentOfTokenSupply REAL\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO reward_type_stats (\n            rewardType,\n            count,\n            tokenCreated,\n            valuePerCount,\n            frequency,\n            percentOfTokenSupply\n          ) SELECT\n            rewardType,\n            count(rewardType) AS count,\n            sum(value+reservedValue) AS tokensCreated,\n            sum(value+reservedValue)/count(rewardType) AS valuePerCount,\n            count(rewardType)/(SELECT count(*) FROM contributions) AS frequency,\n            sum(value+reservedValue)/(SELECT sum(value+reservedValue) FROM contributions) AS percentOfTokenSupply\n            FROM contributions\n            GROUP BY rewardType\n            ON DUPLICATE KEY UPDATE\n            rewardType=VALUES(rewardType),\n            count=VALUES(count),\n            tokenCreated=VALUES(tokenCreated),\n            valuePerCount=VALUES(valuePerCount),\n            frequency=VALUES(frequency),\n            percentOfTokenSupply=VALUES(percentOfTokenSupply)\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM reward_type_stats;\n        '
      });
    }).then(function (data) {
      resolve(data[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateRewardTypeStats' });
    });
  });
}