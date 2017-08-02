'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateSummaryStatistics;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateSummaryStatistics(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue,
        date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS summary_statistics (\n          githubOrganization   CHARACTER(66),\n          contractAddress      CHARACTER(42) PRIMARY KEY,\n          tokenName            CHARACTER(66),\n          tokenSymbol          CHARACTER(66),\n          latestContribution   BIGINT NOT NULL DEFAULT 0,\n          tokenSupply          BIGINT NOT NULL DEFAULT 0,\n          reservedSupply       BIGINT NOT NULL DEFAULT 0,\n          percentReserved      REAL,\n          tokenInflation       REAL,\n          totalContributions   BIGINT NOT NULL DEFAULT 0,\n          uniqueContributions  BIGINT NOT NULL DEFAULT 0,\n          averageTokensPerContribution REAL\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO summary_statistics (\n            githubOrganization,\n            contractAddress,\n            tokenName,\n            tokenSymbol,\n            latestContribution,\n            tokenSupply,\n            reservedSupply,\n            percentReserved,\n            tokenInflation,\n            totalContributions,\n            uniqueContributions,\n            averageTokensPerContribution\n          ) VALUES (\n            "' + _this.contractDetails['organization'] + '",\n            "' + _this.contractDetails['address'] + '",\n            "' + _this.contractDetails['name'] + '",\n            "' + _this.contractDetails['symbol'] + '",\n            (SELECT date FROM contributions ORDER BY date DESC limit 1),\n            (SELECT sum(value)+sum(reservedValue) FROM contributions),\n            (SELECT sum(reservedValue) FROM contributions),\n            (SELECT 1.0*sum(reservedValue)/(sum(value)+sum(reservedValue)) FROM contributions),\n            (SELECT ROUND(EXP(SUM(LOG(POW(1+periodicRate, (SELECT 1/count(*) FROM token_inflation WHERE date <= ' + date + '))))), 6)-1.0 FROM token_inflation WHERE date <= ' + date + '),\n            (SELECT count(txHash) FROM contributions),\n            (SELECT count(distinct username) FROM contributions),\n            (SELECT sum(value+reservedValue)/count(*) FROM contributions)\n          ) ON DUPLICATE KEY UPDATE\n            latestContribution=VALUES(latestContribution),\n            tokenSupply=VALUES(tokenSupply),\n            reservedSupply=VALUES(reservedSupply),\n            percentReserved=VALUES(percentReserved),\n            tokenInflation=VALUES(tokenInflation),\n            totalContributions=VALUES(totalContributions),\n            uniqueContributions=VALUES(uniqueContributions),\n            averageTokensPerContribution=VALUES(averageTokensPerContribution);\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM summary_statistics;\n        '
      });
    }).then(function (summary) {
      resolve(summary[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateSummaryStatistics' });
    });
  });
}