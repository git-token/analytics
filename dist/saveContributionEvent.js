'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = saveContributionEvent;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function saveContributionEvent(_ref) {
  var _this = this;

  var event = _ref.event;

  return new _bluebird2.default(function (resolve, reject) {
    var transactionHash = event.transactionHash,
        args = event.args;

    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS contributions (\n          txHash          CHARACTER(66) PRIMARY KEY,\n          contributor     CHARACTER(42),\n          username        CHARACTER(42),\n          value           BIGINT NOT NULL DEFAULT 0,\n          reservedValue   BIGINT NOT NULL DEFAULT 0,\n          date            BIGINT NOT NULL DEFAULT 0,\n          rewardType      CHARACTER(42)\n        ) ENGINE = INNODB;\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO contributions (\n            txHash,\n            contributor,\n            username,\n            value,\n            reservedValue,\n            date,\n            rewardType\n          ) VALUES (\n            "' + transactionHash + '",\n            "' + args['contributor'] + '",\n            "' + args['username'] + '",\n            ' + args['value'].toNumber() + ',\n            ' + args['reservedValue'].toNumber() + ',\n            ' + args['date'].toNumber() + ',\n            "' + args['rewardType'] + '"\n          );\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM contributions WHERE txHash = "' + transactionHash + '";\n        '
      });
    }).then(function (result) {
      resolve(result[0]);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'saveContributionEvent' });
    });
  });
}