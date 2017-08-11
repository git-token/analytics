'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = milestoneCompleted;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function milestoneCompleted(_ref) {
  var _this = this;

  var data = _ref.data;

  return new _bluebird2.default(function (resolve, reject) {
    var createdBy = data.createdBy,
        title = data.title,
        description = data.description,
        state = data.state,
        createdOn = data.createdOn,
        updatedOn = data.updatedOn,
        dueOn = data.dueOn,
        closedOn = data.closedOn,
        repository = data.repository,
        id = data.id;


    _this.query({
      queryString: '\n          INSERT INTO milestones (\n            id,\n            createdBy,\n            createdOn,\n            updatedOn,\n            dueOn,\n            closedOn,\n            repository,\n            description,\n            title\n          ) VALUES (\n            ' + id + ',\n            "' + createdBy + '",\n            ' + createdOn + ',\n            ' + updatedOn + ',\n            ' + dueOn + ',\n            ' + closedOn + ',\n            "' + repository + '",\n            "' + description + '",\n            "' + title + '",\n            "' + state + '"\n          ) ON DUPLICATE KEY UPDATE\n            state=VALUES(state),\n            updatedOn=VALUES(updatedOn),\n            closedOn=VALUES(closedOn);\n        '
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM milestones;\n        '
      });
    }).then(function (result) {
      resolve(result);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'milestoneCompleted' });
    });
  });
}