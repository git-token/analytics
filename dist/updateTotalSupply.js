'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateTotalSupply;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateTotalSupply(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var date = contribution.date;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS total_supply (\n          totalSupply    BIGINT NOT NULL DEFAULT 0,\n          date           BIGINT NOT NULL DEFAULT 0 PRIMARY KEY\n        );\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO total_supply (\n            totalSupply,\n            date\n          ) VALUES (\n            (SELECT (sum(value)+sum(reservedValue)) FROM contributions WHERE date <= ' + date + '),\n            ' + date + '\n          ) ;\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM total_supply ORDER BY date DESC LIMIT 1;\n        '
      });
    }).then(function (totalSupply) {
      resolve(totalSupply[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateTotalSupply' });
    });
  });
}