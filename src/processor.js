import sqlite from 'sqlite'
import Promise, { delay, join, promisifyAll } from 'bluebird'
import Web3 from 'web3'

let web3;
let eth;
let contract;
let contractDetails = {}

const dbPath = `${process.cwd()}/analytics.sqlite`

Promise.resolve().then(() => {
    return sqlite.open(dbPath, { Promise })
}).then(() => {
    return sqlite.migrate({ force: 'last '})
}).catch((error) => {
    console.log('SQLite DB Error', error)
})

function SendError(error) {
  process.send(JSON.stringify({
    event: 'error',
    message: error.msg,
    data: error
  }))
}

process.on('message', (msg) => {
  const { event, data } = JSON.parse(msg)
  switch(event) {
    case 'configure':
      return configure({ ...data });
      break;
    case 'get_leaderboard':
      query({
        queryString: `SELECT * FROM leaderboard ORDER BY value DESC;`,
        queryObject: []
      }).then((data) => {
        process.send(JSON.stringify({ event, data }))
      }).catch((error) => {
        console.log('error', error)
        SendError(error)
      });
      break;
    case 'get_contribution_frequency':
    query({
      queryString: `SELECT * FROM contribution_frequency ORDER BY percentOfTotal ASC;`,
      queryObject: []
    }).then((data) => {
      process.send(JSON.stringify({ event, data }))
    }).catch((error) => {
      console.log('error', error)
      SendError(error)
    });
    break;
    case 'get_totalSupply':
      query({
        queryString: `SELECT * FROM total_supply ORDER BY date ASC;`,
        queryObject: []
      }).then((data) => {
        process.send(JSON.stringify({ event, data }))
      }).catch((error) => {
        console.log('error', error)
        SendError(error)
      });
      break;
    case 'get_contributions':
      query({
        queryString: `SELECT * FROM contribution ORDER BY date DESC;`,
        queryObject: []
      }).then((data) => {
        process.send(JSON.stringify({ event, data }))
      }).catch((error) => {
        console.log('error', error)
        SendError(error)
      });
      break;
    case 'get_token_inflation':
      query({
        queryString: `SELECT * FROM token_inflation ORDER BY date DESC;`,
        queryObject: []
      }).then((data) => {
        process.send(JSON.stringify({ event, data }))
      }).catch((error) => {
        console.log('error', error)
        SendError(error)
      });
      break;
    case 'get_summary_statistics':
      query({
        queryString: `SELECT * FROM summary_statistics;`,
        queryObject: []
      }).then((data) => {
        process.send(JSON.stringify({ event, data: data[0] }))
      }).catch((error) => {
        console.log('error', error)
        SendError(error)
      });
      break;
    default:
      return null;
  }
})

function saveContributionEvent({ event }) {
  return new Promise((resolve, reject) => {
    const { transactionHash, args } = event
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS contribution (
        txHash          CHAR(66),
        contributor     CHAR(42),
        username        TEXT,
        value           INTEGER DEFAULT 0,
        reservedValue   INTEGER DEFAULT 0,
        date            TIMESTAMP DEFAULT '1970-01-01 00:00:01.001',
        rewardType      TEXT,
        CONSTRAINT contribution_pk PRIMARY KEY (txHash)
      );
    `)).then(() => {
      const queryString = `
        INSERT INTO contribution (
          txHash,
          contributor,
          username,
          value,
          reservedValue,
          date,
          rewardType
        ) VALUES (
          $txHash,
          $contributor,
          $username,
          $value,
          $reservedValue,
          $date,
          $rewardType
        );
      `
      const queryObject = {
        $txHash: transactionHash,
        $contributor: args['contributor'],
        $username: args['username'],
        $value: args['value'].toNumber(),
        $reservedValue: args['reservedValue'].toNumber(),
        $date: args['date'].toNumber(),
        $rewardType: args['rewardType']
      }
      return Promise.resolve(sqlite.all(queryString, queryObject))
    }).then((saved) => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM contribution WHERE txHash = "${transactionHash}"
      `))
    }).then((contribution) => {
      resolve(contribution[0])
    }).catch((error) => {
      console.log('saveContributionEvent::error', error)
      reject(error)
    })
  })
}

function updateContributionFrequency({ contribution }) {
  return new Promise((resolve, reject) => {
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS contribution_frequency (
        rewardType     TEXT,
        count          INTEGER,
        percentOfTotal REAL,
        CONSTRAINT contribution_frequency_pk PRIMARY KEY (rewardType)
      );
    `)).then(() => {
      const { rewardType } = contribution
      return Promise.resolve(sqlite.all(`
        INSERT OR REPLACE INTO contribution_frequency (
          rewardType,
          count,
          percentOfTotal
        ) VALUES (
          "${rewardType}",
          (SELECT count(*) FROM contribution WHERE rewardType = "${rewardType}"),
          (SELECT 100.0 * count(*) / (SELECT count(*) FROM contribution) AS PERCENTAGE FROM contribution WHERE rewardType = "${rewardType}")
        );
      `))
    }).then(() => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM contribution_frequency;
      `))
    }).then((contributionFrequency) => {
      resolve(contributionFrequency)
    }).catch((error) => {
      reject(error)
    })
  })
}

function updateTotalSupply({ contribution }) {
  return new Promise((resolve, reject) => {
    const { date, value, reservedValue } = contribution
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS total_supply (
        totalSupply    INTEGER,
        date           TIMESTAMP DEFAULT '1970-01-01 00:00:01.001',
        CONSTRAINT total_supply_pk PRIMARY KEY (date)
      );
    `)).then(() => {
      const contributionValue = value + reservedValue;
      // console.log('contributionValue', contributionValue)
      return Promise.resolve(sqlite.all(`
        INSERT OR REPLACE INTO total_supply (
          totalSupply,
          date
        ) VALUES (
          (SELECT (sum(value)+sum(reservedValue)) FROM contribution WHERE date <= ${date}),
          ${date}
        );
      `))
    }).then(() => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM total_supply ORDER BY date DESC LIMIT 1;
      `))
    }).then((totalSupply) => {
      resolve(totalSupply[0])
    }).catch((error) => {
      reject(error)
    })
  })
}

function updateTokenInflationRate({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue, date } = contribution
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS token_inflation (
        date        TIMESTAMP DEFAULT '1970-01-01 00:00:01.001',
        tokenSupply INTEGER,
        rate        REAL,
        avgRate     REAL,
        CONSTRAINT token_inflation_pk PRIMARY KEY (date)
      );
    `)).then(() => {
      return Promise.resolve(sqlite.all(`
        INSERT OR REPLACE INTO token_inflation (
          date,
          tokenSupply,
          rate,
          avgRate
        ) VALUES (
          ${date},
          (SELECT (sum(value) + sum(reservedValue)) FROM contribution WHERE date <= ${date}),
          (SELECT (sum(value)+sum(reservedValue))/(sum(value)+sum(reservedValue)-(1.0*${value + reservedValue}))-1.0 FROM contribution WHERE date <= ${date}),
          (SELECT sum(rate)/count(date) FROM token_inflation WHERE date <= ${date})
        );
      `))
    }).then(() => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM token_inflation ORDER BY date DESC LIMIT 1;
      `))
    }).then((inflation) => {
      resolve(inflation[0])
    }).catch((error) => {
      reject(error)
    })
  })
}

function getContractDetails({}) {
  return new Promise((resolve, reject) => {
    join(
      contract.name.callAsync(),
      contract.organization.callAsync(),
      contract.symbol.callAsync(),
      contract.decimals.callAsync()
    ).then((data) => {
      contractDetails = {
        name: data[0],
        organization: data[1],
        symbol: data[2],
        decimals: data[3],
      }
      resolve(contractDetails)
    }).catch((error) => {
      reject(error)
    })
  })
}

function updateSummaryStatistics({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue } = contribution
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS summary_statistics (
        githubOrganization   TEXT,
        contractAddress      CHAR(42),
        tokenName            TEXT,
        tokenSymbol          TEXT,
        latestContribution   TIMESTAMP DEFAULT '1970-01-01 00:00:01.001',
        tokenSupply          INTEGER,
        reservedSupply       INTEGER,
        percentReserved      REAL,
        tokenInflation       REAL,
        totalContributions   INTEGER,
        uniqueContributions  INTEGER,
        CONSTRAINT summary_statistics_pk PRIMARY KEY (contractAddress)
      );
    `)).then(() => {
      return Promise.resolve(sqlite.all(`
        INSERT OR REPLACE INTO summary_statistics (
          githubOrganization,
          contractAddress,
          tokenName,
          tokenSymbol,
          latestContribution,
          tokenSupply,
          reservedSupply,
          percentReserved,
          tokenInflation,
          totalContributions,
          uniqueContributions
        ) VALUES (
          "${contractDetails['organization']}",
          "${contract.address}",
          "${contractDetails['name']}",
          "${contractDetails['symbol']}",
          (SELECT date FROM contribution ORDER BY date DESC limit 1),
          (SELECT sum(value)+sum(reservedValue) FROM contribution),
          (SELECT sum(reservedValue) FROM contribution),
          (SELECT 1.0*sum(reservedValue)/(sum(value)+sum(reservedValue)) FROM contribution),
          (SELECT (sum(value)+sum(reservedValue))/(sum(value)+sum(reservedValue)-(1.0*${value + reservedValue}))-1.0 FROM contribution),
          (SELECT count(txHash) FROM contribution),
          (SELECT count(distinct username) FROM contribution)
        );
      `))
    }).then(() => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM summary_statistics;
      `))
    }).then((summary) => {
      resolve(summary[0])
    }).catch((error) => {
      reject(error)
    })
  })
}

function updateLeaderboard({ contribution }) {
  return new Promise((resolve, reject) => {
    const { username, contributor } = contribution
    Promise.resolve(sqlite.all(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        username             TEXT,
        contributorAddress   CHAR(42),
        value                INTEGER,
        latestContribution   TIMESTAMP DEFAULT '1970-01-01 00:00:01.001',
        numContributions     INTEGER,
        valuePerContribution REAL,
        CONSTRAINT leaderboard_pk PRIMARY KEY (username)
      );
    `)).then(() => {
      return Promise.resolve(sqlite.all(`
          INSERT OR REPLACE INTO leaderboard (
            username,
            contributorAddress,
            value,
            latestContribution,
            numContributions,
            valuePerContribution
          ) VALUES (
            "${username}",
            "${contribution['contributor']}",
            (SELECT sum(value) FROM contribution WHERE username = "${username}"),
            (SELECT max(date) FROM contribution WHERE username = "${username}"),
            (SELECT count(*) FROM contribution WHERE username = "${username}"),
            (SELECT sum(value)/count(*) FROM contribution WHERE username = "${username}")
          );
        `))
     }).then(() => {
      // Replace "0x0" with contract address;
      return Promise.resolve(sqlite.all(`
          INSERT OR REPLACE INTO leaderboard (
            username,
            contributorAddress,
            value,
            latestContribution,
            numContributions,
            valuePerContribution
          ) VALUES (
            "Total",
            "0x0",
            (SELECT sum(value)+sum(reservedValue) FROM contribution),
            (SELECT max(date) FROM contribution),
            (SELECT count(*) FROM contribution),
            (SELECT (sum(value)+sum(reservedValue))/count(*) FROM contribution)
          );
        `
      ))
    }).then(() => {
      return Promise.resolve(sqlite.all(`
        SELECT * FROM leaderboard;
      `))
    }).then((leaderboard) => {
      resolve(leaderboard)
    }).catch((error) => {
      reject(error)
    })
  })
}

function query({ queryString, queryObject }) {
  return new Promise((resolve, reject) => {
    Promise.resolve(sqlite.all(queryString, queryObject)).then((result) => {
      resolve(result)
    }).catch((error) => {
      reject(error)
    })
  })
}

function watchContractContributionEvents() {
  let events = contract.Contribution({}, { fromBlock: 0, toBlock: 'latest' })
  events.watch((error, result) => {
    if (error) {
      console.log('watchContractContributionEvents::error', error)
    } else {
      saveContributionEvent({ event: result }).then((contribution) => {
        return join(
          updateLeaderboard({ contribution }),
          updateTotalSupply({ contribution }),
          updateContributionFrequency({ contribution }),
          updateSummaryStatistics({ contribution }),
          updateTokenInflationRate({ contribution }),
          contribution
        )
      }).then((data) => {
        console.log('watchContractContributionEvents::data', data)
        process.send(JSON.stringify({
          event: 'broadcast_contribution_data',
          data: {
            leaderboard: data[0],
            totalSuppply: data[1],
            contributionFrequency: data[2],
            summaryStatistics: data[3],
            tokenInflation: data[4],
            contributionHistory: data[5]
          }
        }))
      }).catch((error) => {
        console.log('error', error)
      })
    }
  })
}

function promisifyContract ({ abi, contractAddress }) {
  return new Promise((resolve, reject) => {
    let _contract = web3.eth.contract(abi).at(contractAddress)
    Promise.resolve(Object.keys(_contract)).map((method) => {
      if (_contract[method] && _contract[method]['request']) {
        _contract[method] = promisifyAll(_contract[method])
      }
    }).then(() => {
      resolve(_contract)
    }).catch((error) => {
      reject(error)
    })
  })
}

function configure({ web3Provider, contractAddress, abi }) {
  web3 = new Web3(new Web3.providers.HttpProvider(web3Provider))
  eth = promisifyAll(web3.eth)
  promisifyContract({ abi, contractAddress }).then((_contract) => {
    contract = _contract;
    return getContractDetails({})
  }).then((details) => {
    watchContractContributionEvents()
    process.send(JSON.stringify({ event: 'configured' }))
  }).catch((error) => {
    console.log('configure::error', error)
  })
}
