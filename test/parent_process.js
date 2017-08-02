const fork = require('child_process').fork

const processor = fork('./child_process')

setTimeout(() => {
  processor.send(JSON.stringify({ event: 'contract_details' }))
  processor.on('message', (msg) => {
    console.log(JSON.stringify(JSON.parse(msg), null, 2))
  })
}, 5000)
