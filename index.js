'use strict'
require('env2')('env.json')
const Hapi = require('@hapi/hapi')
const Pack = require('./package.json')

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: 'localhost',
    debug: { request: ['error'] }
  })

  await server.register(require('hapi-auth-jwt2'))
  server.auth.strategy('jwt', 'jwt', {
    key: process.env.JWT_SECRET,
    validate: require('./util/jwtValidate')
  })
  server.auth.default('jwt')

  const swaggerOptions = {
    info: {
      title: 'Todo API Documentation',
      version: Pack.version
    }
  }
  await server.register([
    {
      plugin: require('@hapi/inert')
    }, {
      plugin: require('@hapi/vision')
    }, {
      plugin: require('hapi-pgsql'),
      options: {
        database_url: process.env.DATABASE_URL
      }
    }, {
      plugin: require('hapi-router'),
      options: {
        routes: 'routes/*.js'
      }
    }, {
      plugin: require('hapi-swagger'),
      options: swaggerOptions
    }, {
      plugin: require('hapi-redis2'),
      options: {
        settings: 'redis://127.0.0.1:6379/2',
        decorate: true
      }
    }
  ])

  await server.start()
  console.log('Server running on %s', server.info.uri)

  server.events.on('log', (event, tags) => {
    console.log(event)
  });
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()