import GitTokenContract from 'gittoken-contracts/build/contracts/GitToken.json'
import Promise, { join, promisifyAll } from 'bluebird'
import Web3 from 'web3'
import mysql from 'mysql'

const { abi } = JSON.parse(GitTokenContract)

export default class GitTokenAnalytics {
  /**
   * GitToken Analytics Constructor Options
   * @param  {Object} options { mysql: { ...} }
   */
  constructor(options) {
    this.listen()
    const { web3Provider, mysqlOpts, contractAddress } = options
    if (web3Provider && mysqlOpts && contractAddress && abi) {
      this.configure({ web3Provider, mysqlOpts, contractAddress, abi }).then((configured) => {
        console.log('GitToken Analytics Processor Configured')
        console.log(JSON.stringify(configured, null, 2))
      })
    } else {
      console.log(`GitToken Analytics Processor listening for 'configure' event.`)
    }
  }

  configure({ web3Provider, mysqlOpts, contractAddress, abi }) {
    return new Promise((resolve, reject) => {
      this.establishMySqlConnection({ mysqlOpts }).then(() => {
        return this.configureWeb3Provider({ web3Provider })
      }).then(() => {
        return this.configureContract({ abi, contractAddress })
      }).then(() => {
        return this.getContractDetails()
      }).then(() => {
        this.watchContributionEvents()
        return null
      }).then(() => {
        resolve({
          contractDetails: this.contractDetails
        })
      }).catch((error) => {
        this.handleError({ error, method: 'configure' })
      })
    })
  }

  establishMySqlConnection({ mysqlOpts }) {
    return new Promise((resolve, reject) => {
      try {
        this.mysql = mysql.createConnection({ ...mysqlOpts })
        this.mysql.connect()
        resolve({ mysql: this.mysql })
      } catch (error) {
        this.handleError({ error, method: 'establishMySqlConnection' })
      }
    })
  }

  query({ queryString, queryObject=[] }) {
    return new Promise((resolve, reject) => {
      /* TODO: Check mysql docs for second param (queryObject) */
      this.mysql.query(queryString, (error, result) => {
        if (error) { this.handleError({ error, method: 'query' }) }
        resolve(result)
      })
    })
  }

  configureWeb3Provider({ web3Provider }) {
    return new Promise((resolve, reject) => {
      try {
        console.log('web3Provider', web3Provider)
        this.web3 = new Web3(new Web3.providers.HttpProvider(web3Provider))
        this.eth = promisifyAll(this.web3.eth)
        resolve({ web3: this.web3, eth: this.eth })
      } catch (error) {
        this.handleError({ error, method: 'configureWeb3Provider' })
      }
    })
  }

  configureContract({ abi, contractAddress }) {
    return new Promise((resolve, reject) => {
      this.contract = this.web3.eth.contract(abi).at(contractAddress)
      Promise.resolve(Object.keys(this.contract)).map((method) => {
        if (this.contract[method] && this.contract[method]['request']) {
          this.contract[method] = promisifyAll(this.contract[method])
        }
      }).then(() => {
        resolve(this.contract)
      }).catch((error) => {
        this.handleError({ error, method: 'configureContract' })
      })
    })
  }

  watchContributionEvents() {
    const events = this.contract.Contribution({}, { fromBlock: 0, toBlock: 'latest' })

    events.watch((error, result) => {
      if (error) { this.handleError({ error, method: 'watchContributionEvents' }) }
      this.saveContributionEvent({ event: result }).then((contribution) => {
        process.send(JSON.stringify({
          event: 'new_contribution',
          data: contribution,
          message: `New contribution received and saved.`
        }))
        return join(
          this.updateLeaderboard({ contribution }),
          this.updateTotalSupply({ contribution }),
          this.updateContributionFrequency({ contribution })
        )
      }).then((data) => {
        console.log('data', data)
      })
    })
  }

  updateContributionFrequency({ contribution }) {
    return new Promise((resolve, reject) => {
      this.query({ queryString: `
        CREATE TABLE IF NOT EXISTS contribution_frequency (
          rewardType     CHARACTER(66) PRIMARY KEY,
          count          BIGINT NOT NULL DEFAULT 0,
          percentOfTotal REAL
        );
      `}).then(() => {
        return this.query({
          queryString: `
            INSERT INTO contribution_frequency (
              rewardType,
              count,
              percentOfTotal
            ) SELECT rewardType, count(rewardType), count(rewardType)/(SELECT count(*)*1.0 FROM contributions)*100.0 FROM contributions GROUP BY rewardType
            ON DUPLICATE KEY UPDATE
            rewardType=VALUES(rewardType),
            count=VALUES(count),
            percentOfTotal=VALUES(percentOfTotal);
          `
        })
      }).then(() => {
        return this.query({
          queryString: `
            SELECT * FROM contribution_frequency;
          `
        })
      }).then((contributionFrequency) => {
        resolve(contributionFrequency)
      }).catch((error) => {
        reject(error)
      })
    })
  }

  updateTotalSupply({ contribution }) {
    return new Promise((resolve, reject) => {
      const { date } = contribution
      this.query({
        queryString: `
          CREATE TABLE IF NOT EXISTS total_supply (
            totalSupply    BIGINT NOT NULL DEFAULT 0,
            date           BIGINT NOT NULL DEFAULT 0 PRIMARY KEY
          );
        `
      }).then(() => {
        return this.query({
          queryString: `
            INSERT INTO total_supply (
              totalSupply,
              date
            ) VALUES (
              (SELECT (sum(value)+sum(reservedValue)) FROM contributions WHERE date <= ${date}),
              ${date}
            ) ;
          `
        })
      }).then(() => {
        return this.query({
          queryString: `
            SELECT * FROM total_supply ORDER BY date DESC LIMIT 1;
          `
        })
      }).then((totalSupply) => {
        resolve(totalSupply[0])
      }).catch((error) => {
        this.handleError({ error })
      })
    })
  }

  updateLeaderboard({ contribution }) {
    return new Promise((resolve, reject) => {
      const { username, contributor } = contribution
      this.query({ queryString: `
        CREATE TABLE IF NOT EXISTS leaderboard (
          username             CHARACTER(42) PRIMARY KEY,
          contributorAddress   CHARACTER(42),
          value                BIGINT NOT NULL DEFAULT 0,
          latestContribution   BIGINT NOT NULL DEFAULT 0,
          numContributions     BIGINT NOT NULL DEFAULT 0,
          valuePerContribution REAL
        );
      `}).then(() => {
        return this.query({ queryString: `
            INSERT INTO leaderboard (
              username,
              contributorAddress,
              value,
              latestContribution,
              numContributions,
              valuePerContribution
            ) VALUES (
              "${username}",
              "${contribution['contributor']}",
              (SELECT sum(value) FROM contributions WHERE username = "${username}"),
              (SELECT max(date) FROM contributions WHERE username = "${username}"),
              (SELECT count(*) FROM contributions WHERE username = "${username}"),
              (SELECT sum(value)/count(*) FROM contributions WHERE username = "${username}")
            ) ON DUPLICATE KEY UPDATE
              value=VALUES(value),
              latestContribution=VALUES(latestContribution),
              numContributions=VALUES(numContributions),
              valuePerContribution=VALUES(valuePerContribution)
            ;
          ` })
       }).then(() => {
        // Replace "0x0" with contract address;
        return this.query({ queryString: `
            INSERT INTO leaderboard (
              username,
              contributorAddress,
              value,
              latestContribution,
              numContributions,
              valuePerContribution
            ) VALUES (
              "Total",
              "${this.contractDetails['address']}",
              (SELECT sum(value)+sum(reservedValue) FROM contributions),
              (SELECT max(date) FROM contributions),
              (SELECT count(*) FROM contributions),
              (SELECT (sum(value)+sum(reservedValue))/count(*) FROM contributions)
            ) ON DUPLICATE KEY UPDATE
              value=VALUES(value),
              latestContribution=VALUES(latestContribution),
              numContributions=VALUES(numContributions),
              valuePerContribution=VALUES(valuePerContribution)
            ;
          `
        })
      }).then(() => {
        return this.query({ queryString: `
          SELECT * FROM leaderboard;
        ` })
      }).then((leaderboard) => {
        resolve(leaderboard)
      }).catch((error) => {
        this.handleError({ error })
      })
    })
  }

  saveContributionEvent({ event }) {
    return new Promise((resolve, reject) => {
      const { transactionHash, args } = event
      this.query({
        queryString: `
          CREATE TABLE IF NOT EXISTS contributions (
            txHash          CHARACTER(66) PRIMARY KEY,
            contributor     CHARACTER(42),
            username        CHARACTER(42),
            value           BIGINT NOT NULL DEFAULT 0,
            reservedValue   BIGINT NOT NULL DEFAULT 0,
            date            BIGINT NOT NULL DEFAULT 0,
            rewardType      CHARACTER(42)
          ) ENGINE = INNODB;
        `,
      }).then(() => {
        return this.query({
          queryString: `
            INSERT INTO contributions (
              txHash,
              contributor,
              username,
              value,
              reservedValue,
              date,
              rewardType
            ) VALUES (
              "${transactionHash}",
              "${args['contributor']}",
              "${args['username']}",
              ${args['value'].toNumber()},
              ${args['reservedValue'].toNumber()},
              ${args['date'].toNumber()},
              "${args['rewardType']}"
            );
          `
        })
      }).then(() => {
        return this.query({
          queryString: `
            SELECT * FROM contributions WHERE txHash = "${transactionHash}";
          `
        })
      }).then((result) => {
        resolve(result[0])
      }).catch((error) => {
        this.handleError({ error, method: 'saveContributionEvent' })
      })
    })
  }

  getContractDetails() {
    return new Promise((resolve, reject) => {
      join(
        this.contract.name.callAsync(),
        this.contract.symbol.callAsync(),
        this.contract.decimals.callAsync(),
        this.contract.organization.callAsync()
      ).then((data) => {
        this.contractDetails = {
          name: data[0],
          symbol: data[1],
          decimals: data[2],
          organization: data[3],
          address: this.contract.address
        }

        resolve({ contractDetails: this.contractDetails })
      }).catch((error) => {
        this.handleError({ error, method: 'getContractDetails' })
      })
    })
  }

  listen() {
    console.log('GitToken Analytics Listening on Separate Process: ', process.pid)
    process.on('message', (msg) => {
      const { event, data } = JSON.parse(msg)
      switch(event) {
        case 'configure':
          const { web3Provider, mysqlOpts, contractAddress } = data
          this.configure({ web3Provider, mysqlOpts, contractAddress, abi }).then((configured) => {
            process.send(JSON.stringify({ event, data: configured, message: 'GitToken Analytics Processor Configured' }))
          })
          break;
        case 'contract_details':
          this.getContractDetails().then((result) => {
            process.send(JSON.stringify({ event, data: result, message: 'Contract details retrieved.' }))
          })
          break;
        default:
          process.send(JSON.stringify({
            message: 'Unhandled Analytics Event',
            data: [],
            event: 'error'
          }))
      }
    })
  }

  handleError({ error, method }) {
    /**
     * TODO Add switch case handler based on error codes, etc.
     * Determine when to send back message to parent process
     */
    console.log('handleError::method', method)
    console.log(error)
  }
}
