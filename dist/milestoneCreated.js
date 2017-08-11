'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = milestoneCreated;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function milestoneCreated(_ref) {
  var _this = this;

  var data = _ref.data;

  return new _bluebird2.default(function (resolve, reject) {
    console.log('milestoneCreated::data', data);
    var createdBy = data.createdBy,
        title = data.title,
        description = data.description,
        createdOn = data.createdOn,
        updatedOn = data.updatedOn,
        dueOn = data.dueOn,
        repository = data.repository,
        id = data.id;


    _this.query({
      queryString: '\n        CREATE TABLE IF NOT EXISTS milestones (\n          id              BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,\n          createdBy       TEXT,\n          createdOn       BIGINT NOT NULL DEFAULT 0,\n          updatedOn       BIGINT NOT NULL DEFAULT 0,\n          dueOn           BIGINT NOT NULL DEFAULT 0,\n          repository      TEXT,\n          description     TEXT,\n          title           TEXT\n        ) ENGINE = INNODB;\n      '
    }).then(function () {
      return _this.query({
        queryString: '\n          INSERT INTO milestones (\n            id,\n            createdBy,\n            createdOn,\n            updatedOn,\n            dueOn,\n            repository,\n            description,\n            title\n          ) VALUES (\n            ' + id + ',\n            "' + createdBy + '",\n            ' + createdOn + ',\n            ' + updatedOn + ',\n            ' + dueOn + ',\n            "' + repository + '",\n            "' + description + '",\n            "' + title + '"\n          );\n        '
      });
    }).then(function () {
      return _this.query({
        queryString: '\n          SELECT * FROM milestones;\n        '
      });
    }).then(function (result) {
      resolve(result);
    }).catch(function (error) {
      _this.handleError({ error: error, method: 'milestoneCreated' });
    });
  });
}