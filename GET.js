var Hapi = require('hapi')

// create new server instance
var server = new Hapi.Server({  
  host: 'localhost',
  port: 3000
})


// add “hello world” route
server.route({  
  method: 'GET',
  path: '/',
  handler: (request, h) => {
    return 'Hello World!'
  }
})

async function start () {  
  // start your server
  try {
    await server.start()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  console.log('Server running at: ', server.info.uri)
}

start()  