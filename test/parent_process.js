const fork = require('child_process').fork

const processor = fork('./child_process')

processor.on('message', (msg) => {
  console.log(JSON.stringify(JSON.parse(msg), null, 2))
})
