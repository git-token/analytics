'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateUserTokenCreation;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateUserTokenCreation(_ref) {
  var _this = this;

  var contribution = _ref.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var date = contribution.date;

    _this.query({ queryString: '\n      CREATE TABLE IF NOT EXISTS user_token_creation (\n        date                  BIGINT NOT NULL DEFAULT 0,\n        username              CHARACTER(42),\n        tokensCreated         BIGINT NOT NULL DEFAULT 0,\n        percentOfTokenSupply  REAL\n      );\n    ' }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO user_token_creation (\n            date,\n            username,\n            tokensCreated,\n            percentOfTokenSupply\n          ) SELECT\n            ' + date + ',\n            username,\n            sum(value+reservedValue) AS tokensCreated,\n            sum(value+reservedValue)/(SELECT sum(value+reservedValue) FROM contributions WHERE date <= ' + date + ') AS percentOfTokenSupply\n          FROM contributions\n          WHERE date <= ' + date + '\n          GROUP BY username;\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM user_token_creation;\n        '
      });
    }).then(function (userTokenCreation) {
      resolve(userTokenCreation);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'updateUserTokenCreation' });
    });
  });
}