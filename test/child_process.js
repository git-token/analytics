const GitTokenAnalytics = require('../dist/index').default
const config = require('./test_config')
const { mysqlOpts, web3Provider, contractAddress } = config
const processor = new GitTokenAnalytics({ mysqlOpts, web3Provider, contractAddress })
