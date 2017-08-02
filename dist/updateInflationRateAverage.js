'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateInflationRateAverage;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateInflationRateAverage(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS token_inflation_mean (\n          date          BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,\n          geometricMean REAL\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO token_inflation_mean (\n            date,\n            geometricMean\n          ) VALUES (\n            ' + date + ',\n            (SELECT ROUND(EXP(SUM(LOG(POW(1+periodicRate, (SELECT 1/count(*) FROM token_inflation WHERE date <= ' + date + '))))), 8)-1.0 FROM token_inflation WHERE date <= ' + date + ')\n          );\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM token_inflation_mean ORDER BY date DESC LIMIT 1;\n        '
      });
    }).then(function (inflation) {
      resolve(inflation[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateInflationRateAverage' });
    });
  });
}