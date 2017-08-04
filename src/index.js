import GitTokenContract from 'gittoken-contracts/build/contracts/GitToken.json'
import Promise, { join, promisifyAll } from 'bluebird'
import Web3 from 'web3'
import mysql from 'mysql'

import updateTokenInflationRate from './updateTokenInflationRate'
import updateInflationRateAverage from './updateInflationRateAverage'
import updateLeaderboard from './updateLeaderboard'
import updateTotalSupply from './updateTotalSupply'
import updateContributionFrequency from './updateContributionFrequency'
import updateSummaryStatistics from './updateSummaryStatistics'
import saveContributionEvent from './saveContributionEvent'
import updateRewardTypeStats from './updateRewardTypeStats'
import updateUserTokenCreation from './updateUserTokenCreation'

// const { abi } = JSON.parse(GitTokenContract)

export default class GitTokenAnalytics {
  /**
   * GitToken Analytics Constructor Options
   * @param  {Object} options { mysql: { ...} }
   */
  constructor(options) {
    this.listen()
    const { web3Provider, mysqlOpts, contractAddress } = options

    this.saveContributionEvent = saveContributionEvent.bind(this)
    this.updateLeaderboard = updateLeaderboard.bind(this)
    this.updateTotalSupply = updateTotalSupply.bind(this)
    this.updateContributionFrequency = updateContributionFrequency.bind(this)
    this.updateSummaryStatistics = updateSummaryStatistics.bind(this)
    this.updateTokenInflationRate = updateTokenInflationRate.bind(this)
    this.updateInflationRateAverage = updateInflationRateAverage.bind(this)
    this.updateRewardTypeStats = updateRewardTypeStats.bind(this)
    this.updateUserTokenCreation = updateUserTokenCreation.bind(this)

    this.contractDetails = {}


    if (web3Provider && mysqlOpts && contractAddress && abi) {
      this.configure({ web3Provider, mysqlOpts, contractAddress, abi }).then((configured) => {
        console.log('GitToken Analytics Processor Configured')
        console.log(JSON.stringify(configured, null, 2))
        this._watchContributionEvents()
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
        console.log('configure::abi, contractAddress')
        return this.configureContract({ abi, contractAddress })
      }).then(() => {
        return this.getContractDetails()
      }).then(() => {
        console.log('this.contractDetails', this.contractDetails)
        resolve({
          contractDetails: this.contractDetails
        })
      }).catch((error) => {
        console.log('error', error)
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

  _watchContributionEvents() {
    const events = this.contract.Contribution({}, { fromBlock: 0, toBlock: 'latest' })

    events.watch((error, result) => {
      if (error) { this.handleError({ error, method: '_watchContributionEvents' }) }
      console.log('_watchContributionEvents::result', result)
      this.saveContributionEvent({ event: result }).then((contribution) => {
        process.send(JSON.stringify({
          event: 'new_contribution',
          data: contribution,
          message: `New contribution received and saved.`
        }))
        return join(
          this.updateLeaderboard({ contribution }),
          this.updateTotalSupply({ contribution }),
          this.updateContributionFrequency({ contribution }),
          this.updateTokenInflationRate({ contribution }),
          this.updateInflationRateAverage({ contribution }),
          this.updateSummaryStatistics({ contribution }),
          this.updateRewardTypeStats({ contribution }),
          this.updateUserTokenCreation({ contribution }),
          contribution
        )
      }).then((data) => {
        console.log(JSON.stringify(data, null, 2))
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
        console.log('getContractDetails::data', data)
        try {
          this.contractDetails = {
            name: data[0],
            symbol: data[1],
            decimals: data[2].toNumber(),
            organization: data[3],
            address: this.contract.address
          }
          resolve({ contractDetails: this.contractDetails })
        } catch (error) {
          throw error
        }
      }).catch((error) => {
        console.log('contractDetails::error', error)
        this.handleError({ error, method: 'getContractDetails' })
      })
    })
  }

  listen() {
    console.log('GitToken Analytics Listening on Separate Process: ', process.pid)
    process.on('message', (msg) => {
      console.log('msg', msg)
      const { event, data } = JSON.parse(msg)
      switch(event) {
        case 'configure':
          const { web3Provider, mysqlOpts, contractAddress, abi } = data
          this.configure({ web3Provider, mysqlOpts, contractAddress, abi }).then((configured) => {
            process.send(JSON.stringify({ event, data: configured, message: 'GitToken Analytics Processor Configured' }))
            this._watchContributionEvents()
          })
          break;
        case 'contract_details':
          this.getContractDetails().then((result) => {
            process.send(JSON.stringify({ event, data: result, message: 'Contract details retrieved.' }))
          })
          break;
        case 'get_contributions':
          this.query({ queryString: `SELECT * FROM contributions;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_total_supply':
          this.query({ queryString: `SELECT * FROM total_supply;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_leaderboard':
          this.query({ queryString: `SELECT * FROM leaderboard;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_contribution_frequency':
          this.query({ queryString: `SELECT * FROM contribution_frequency;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_token_inflation':
          this.query({ queryString: `SELECT * FROM token_inflation;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_token_inflation_mean':
          this.query({ queryString: `SELECT * FROM token_inflation_mean;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_user_token_creation':
          this.query({ queryString: `SELECT * FROM user_token_creation;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_reward_type_stats':
          this.query({ queryString: `SELECT * FROM reward_type_stats;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
          })
          break;
        case 'get_summary_statistics':
          this.query({ queryString: `SELECT * FROM summary_statistics;` }).then((result) => {
            process.send(JSON.stringify({ event, data: result, message: `${event} data retrieved.` }))
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
