'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _sqlite = require('sqlite');

var _sqlite2 = _interopRequireDefault(_sqlite);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectDestructuringEmpty(obj) { if (obj == null) throw new TypeError("Cannot destructure undefined"); }

var web3 = void 0;
var eth = void 0;
var contract = void 0;
var contractDetails = {};

var dbPath = process.cwd() + '/analytics.sqlite';

_bluebird2.default.resolve().then(function () {
  return _sqlite2.default.open(dbPath, { Promise: _bluebird2.default });
}).then(function () {
  return _sqlite2.default.migrate({ force: 'last ' });
}).catch(function (error) {
  console.log('SQLite DB Error', error);
});

function SendError(error) {
  console.log('SendError::error', error);
  process.send(JSON.stringify({
    event: 'error',
    message: error.msg,
    data: error
  }));
}

process.on('message', function (msg) {
  var _JSON$parse = JSON.parse(msg),
      event = _JSON$parse.event,
      data = _JSON$parse.data;

  switch (event) {
    case 'configure':
      return configure(_extends({}, data));
      break;
    case 'get_leaderboard':
      query({
        queryString: 'SELECT * FROM leaderboard ORDER BY value DESC;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    case 'get_contribution_frequency':
      query({
        queryString: 'SELECT * FROM contribution_frequency ORDER BY percentOfTotal ASC;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    case 'get_totalSupply':
      query({
        queryString: 'SELECT * FROM total_supply ORDER BY date ASC;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    case 'get_contributions':
      query({
        queryString: 'SELECT * FROM contribution ORDER BY date DESC;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    case 'get_token_inflation':
      query({
        queryString: 'SELECT * FROM token_inflation ORDER BY date DESC;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    case 'get_summary_statistics':
      query({
        queryString: 'SELECT * FROM summary_statistics;',
        queryObject: []
      }).then(function (data) {
        process.send(JSON.stringify({ event: event, data: data[0] }));
      }).catch(function (error) {
        console.log('error', error);
        SendError(error);
      });
      break;
    default:
      return null;
  }
});

function saveContributionEvent(_ref) {
  var event = _ref.event;

  return new _bluebird2.default(function (resolve, reject) {
    var transactionHash = event.transactionHash,
        args = event.args;

    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS contribution (\n        txHash          CHAR(66),\n        contributor     CHAR(42),\n        username        TEXT,\n        value           INTEGER DEFAULT 0,\n        reservedValue   INTEGER DEFAULT 0,\n        date            TIMESTAMP DEFAULT \'1970-01-01 00:00:01.001\',\n        rewardType      TEXT,\n        CONSTRAINT contribution_pk PRIMARY KEY (txHash)\n      );\n    ')).then(function () {
      var queryString = '\n        INSERT INTO contribution (\n          txHash,\n          contributor,\n          username,\n          value,\n          reservedValue,\n          date,\n          rewardType\n        ) VALUES (\n          $txHash,\n          $contributor,\n          $username,\n          $value,\n          $reservedValue,\n          $date,\n          $rewardType\n        );\n      ';
      var queryObject = {
        $txHash: transactionHash,
        $contributor: args['contributor'],
        $username: args['username'],
        $value: args['value'].toNumber(),
        $reservedValue: args['reservedValue'].toNumber(),
        $date: args['date'].toNumber(),
        $rewardType: args['rewardType']
      };
      return _bluebird2.default.resolve(_sqlite2.default.all(queryString, queryObject));
    }).then(function (saved) {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM contribution WHERE txHash = "' + transactionHash + '"\n      '));
    }).then(function (contribution) {
      resolve(contribution[0]);
    }).catch(function (error) {
      console.log('saveContributionEvent::error', error);
      reject(error);
    });
  });
}

function updateContributionFrequency(_ref2) {
  var contribution = _ref2.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS contribution_frequency (\n        rewardType     TEXT,\n        count          INTEGER,\n        percentOfTotal REAL,\n        CONSTRAINT contribution_frequency_pk PRIMARY KEY (rewardType)\n      );\n    ')).then(function () {
      var rewardType = contribution.rewardType;

      return _bluebird2.default.resolve(_sqlite2.default.all('\n        INSERT OR REPLACE INTO contribution_frequency (\n          rewardType,\n          count,\n          percentOfTotal\n        ) VALUES (\n          (SELECT rewardType, count(rewardType), count(rewardType)/(SELECT count(*)*1.0 from contribution)*100.0 from contribution GROUP BY rewardType)\n        );\n      '));
    }).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM contribution_frequency;\n      '));
    }).then(function (contributionFrequency) {
      resolve(contributionFrequency);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function updateTotalSupply(_ref3) {
  var contribution = _ref3.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var date = contribution.date,
        value = contribution.value,
        reservedValue = contribution.reservedValue;

    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS total_supply (\n        totalSupply    INTEGER,\n        date           TIMESTAMP DEFAULT \'1970-01-01 00:00:01.001\',\n        CONSTRAINT total_supply_pk PRIMARY KEY (date)\n      );\n    ')).then(function () {
      var contributionValue = value + reservedValue;
      // console.log('contributionValue', contributionValue)
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        INSERT OR REPLACE INTO total_supply (\n          totalSupply,\n          date\n        ) VALUES (\n          (SELECT (sum(value)+sum(reservedValue)) FROM contribution WHERE date <= ' + date + '),\n          ' + date + '\n        );\n      '));
    }).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM total_supply ORDER BY date DESC LIMIT 1;\n      '));
    }).then(function (totalSupply) {
      resolve(totalSupply[0]);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function updateTokenInflationRate(_ref4) {
  var contribution = _ref4.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue,
        date = contribution.date;

    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS token_inflation (\n        date        TIMESTAMP DEFAULT \'1970-01-01 00:00:01.001\',\n        tokenSupply INTEGER,\n        rate        REAL,\n        avgRate     REAL,\n        CONSTRAINT token_inflation_pk PRIMARY KEY (date)\n      );\n    ')).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        INSERT OR REPLACE INTO token_inflation (\n          date,\n          tokenSupply,\n          rate,\n          avgRate\n        ) VALUES (\n          ' + date + ',\n          (SELECT (sum(value) + sum(reservedValue)) FROM contribution WHERE date <= ' + date + '),\n          (SELECT (sum(value)+sum(reservedValue))/(sum(value)+sum(reservedValue)-(1.0*' + (value + reservedValue) + '))-1.0 FROM contribution WHERE date <= ' + date + '),\n          (SELECT sum(rate)/count(date) FROM token_inflation WHERE date <= ' + date + ')\n        );\n      '));
    }).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM token_inflation ORDER BY date DESC LIMIT 1;\n      '));
    }).then(function (inflation) {
      resolve(inflation[0]);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function getContractDetails(_ref5) {
  _objectDestructuringEmpty(_ref5);

  return new _bluebird2.default(function (resolve, reject) {
    (0, _bluebird.join)(contract.name.callAsync(), contract.organization.callAsync(), contract.symbol.callAsync(), contract.decimals.callAsync()).then(function (data) {
      contractDetails = {
        name: data[0],
        organization: data[1],
        symbol: data[2],
        decimals: data[3]
      };
      resolve(contractDetails);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function updateSummaryStatistics(_ref6) {
  var contribution = _ref6.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var value = contribution.value,
        reservedValue = contribution.reservedValue;

    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS summary_statistics (\n        githubOrganization   TEXT,\n        contractAddress      CHAR(42),\n        tokenName            TEXT,\n        tokenSymbol          TEXT,\n        latestContribution   TIMESTAMP DEFAULT \'1970-01-01 00:00:01.001\',\n        tokenSupply          INTEGER,\n        reservedSupply       INTEGER,\n        percentReserved      REAL,\n        tokenInflation       REAL,\n        totalContributions   INTEGER,\n        uniqueContributions  INTEGER,\n        CONSTRAINT summary_statistics_pk PRIMARY KEY (contractAddress)\n      );\n    ')).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        INSERT OR REPLACE INTO summary_statistics (\n          githubOrganization,\n          contractAddress,\n          tokenName,\n          tokenSymbol,\n          latestContribution,\n          tokenSupply,\n          reservedSupply,\n          percentReserved,\n          tokenInflation,\n          totalContributions,\n          uniqueContributions\n        ) VALUES (\n          "' + contractDetails['organization'] + '",\n          "' + contract.address + '",\n          "' + contractDetails['name'] + '",\n          "' + contractDetails['symbol'] + '",\n          (SELECT date FROM contribution ORDER BY date DESC limit 1),\n          (SELECT sum(value)+sum(reservedValue) FROM contribution),\n          (SELECT sum(reservedValue) FROM contribution),\n          (SELECT 1.0*sum(reservedValue)/(sum(value)+sum(reservedValue)) FROM contribution),\n          (SELECT (sum(value)+sum(reservedValue))/(sum(value)+sum(reservedValue)-(1.0*' + (value + reservedValue) + '))-1.0 FROM contribution),\n          (SELECT count(txHash) FROM contribution),\n          (SELECT count(distinct username) FROM contribution)\n        );\n      '));
    }).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM summary_statistics;\n      '));
    }).then(function (summary) {
      resolve(summary[0]);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function updateLeaderboard(_ref7) {
  var contribution = _ref7.contribution;

  return new _bluebird2.default(function (resolve, reject) {
    var username = contribution.username,
        contributor = contribution.contributor;

    _bluebird2.default.resolve(_sqlite2.default.all('\n      CREATE TABLE IF NOT EXISTS leaderboard (\n        username             TEXT,\n        contributorAddress   CHAR(42),\n        value                INTEGER,\n        latestContribution   TIMESTAMP DEFAULT \'1970-01-01 00:00:01.001\',\n        numContributions     INTEGER,\n        valuePerContribution REAL,\n        CONSTRAINT leaderboard_pk PRIMARY KEY (username)\n      );\n    ')).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n          INSERT OR REPLACE INTO leaderboard (\n            username,\n            contributorAddress,\n            value,\n            latestContribution,\n            numContributions,\n            valuePerContribution\n          ) VALUES (\n            "' + username + '",\n            "' + contribution['contributor'] + '",\n            (SELECT sum(value) FROM contribution WHERE username = "' + username + '"),\n            (SELECT max(date) FROM contribution WHERE username = "' + username + '"),\n            (SELECT count(*) FROM contribution WHERE username = "' + username + '"),\n            (SELECT sum(value)/count(*) FROM contribution WHERE username = "' + username + '")\n          );\n        '));
    }).then(function () {
      // Replace "0x0" with contract address;
      return _bluebird2.default.resolve(_sqlite2.default.all('\n          INSERT OR REPLACE INTO leaderboard (\n            username,\n            contributorAddress,\n            value,\n            latestContribution,\n            numContributions,\n            valuePerContribution\n          ) VALUES (\n            "Total",\n            "0x0",\n            (SELECT sum(value)+sum(reservedValue) FROM contribution),\n            (SELECT max(date) FROM contribution),\n            (SELECT count(*) FROM contribution),\n            (SELECT (sum(value)+sum(reservedValue))/count(*) FROM contribution)\n          );\n        '));
    }).then(function () {
      return _bluebird2.default.resolve(_sqlite2.default.all('\n        SELECT * FROM leaderboard;\n      '));
    }).then(function (leaderboard) {
      resolve(leaderboard);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function query(_ref8) {
  var queryString = _ref8.queryString,
      queryObject = _ref8.queryObject;

  return new _bluebird2.default(function (resolve, reject) {
    _bluebird2.default.resolve(_sqlite2.default.all(queryString, queryObject)).then(function (result) {
      resolve(result);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function watchContractContributionEvents() {
  var events = contract.Contribution({}, { fromBlock: 0, toBlock: 'latest' });
  events.watch(function (error, result) {
    if (error) {
      console.log('watchContractContributionEvents::error', error);
    } else {
      saveContributionEvent({ event: result }).then(function (contribution) {
        return (0, _bluebird.join)(updateLeaderboard({ contribution: contribution }), updateTotalSupply({ contribution: contribution }), updateContributionFrequency({ contribution: contribution }), updateSummaryStatistics({ contribution: contribution }), updateTokenInflationRate({ contribution: contribution }), contribution);
      }).then(function (data) {
        console.log('watchContractContributionEvents::data', data);
        process.send(JSON.stringify({
          event: 'broadcast_contribution_data',
          data: {
            leaderboard: data[0],
            totalSupply: data[1],
            contributionFrequency: data[2],
            summaryStatistics: data[3],
            tokenInflation: data[4],
            contributionHistory: data[5]
          }
        }));
      }).catch(function (error) {
        console.log('error', error);
      });
    }
  });
}

function promisifyContract(_ref9) {
  var abi = _ref9.abi,
      contractAddress = _ref9.contractAddress;

  return new _bluebird2.default(function (resolve, reject) {
    var _contract = web3.eth.contract(abi).at(contractAddress);
    _bluebird2.default.resolve(Object.keys(_contract)).map(function (method) {
      if (_contract[method] && _contract[method]['request']) {
        _contract[method] = (0, _bluebird.promisifyAll)(_contract[method]);
      }
    }).then(function () {
      resolve(_contract);
    }).catch(function (error) {
      reject(error);
    });
  });
}

function configure(_ref10) {
  var web3Provider = _ref10.web3Provider,
      contractAddress = _ref10.contractAddress,
      abi = _ref10.abi;

  web3 = new _web2.default(new _web2.default.providers.HttpProvider(web3Provider));
  eth = (0, _bluebird.promisifyAll)(web3.eth);
  promisifyContract({ abi: abi, contractAddress: contractAddress }).then(function (_contract) {
    contract = _contract;
    return getContractDetails({});
  }).then(function (details) {
    watchContractContributionEvents();
    process.send(JSON.stringify({ event: 'configured' }));
  }).catch(function (error) {
    console.log('configure::error', error);
  });
}