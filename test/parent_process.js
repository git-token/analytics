const fork = require('child_process').fork

const processor = fork('./child_process')



setTimeout(() => {
  processor.send(JSON.stringify({ event: 'contract_details' }))

  processor.on('message', (msg) => {
    console.log('msg', msg)
    const { event, message, data } = JSON.parse(msg)

    console.log('Received Message', message)
    console.log('event', event)
    console.log('data', data)
  })
}, 5000)
