'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateTokenInflationRate;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateTokenInflationRate(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue,
        date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS token_inflation (\n          date          BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,\n          periodicRate  REAL\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO token_inflation (\n            date,\n            periodicRate\n          ) VALUES (\n            ' + date + ',\n            (SELECT (sum(value+reservedValue))/(sum(value+reservedValue)-(1.0*' + (value + reservedValue) + '))-1.0 FROM contributions WHERE date <= ' + date + ')\n          );\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM token_inflation ORDER BY date DESC LIMIT 1;\n        '
      });
    }).then(function (inflation) {
      resolve(inflation[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateTokenInflationRate' });
    });
  });
}