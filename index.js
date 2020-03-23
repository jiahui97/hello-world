const Hapi = require('hapi')
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const Joi = require('@hapi/joi');

(async () => {
  const server = await new Hapi.Server({
      host: 'localhost',
      port: 3000,
  });


  
const swaggerOptions = {
  info: {
          title: 'Test API Documentation',
          version: Pack.version,
      },
  };

await server.register([
  Inert,
  Vision,
  {
      plugin: HapiSwagger,
      options: swaggerOptions
  }
]);


// add GET method
server.route({  
  method: 'GET',
  path: '/',
  handler: (request, h) => {
    return 'Hello World!'
  }
});

// add POST method
server.route({
  method : 'POST',
  path : '/hello',
  handler : function (request, reply) {

    const payload = request.payload;
      return `Welcome ${payload.username}!`;

  },options:{
    tags:['api']
  }
});

try {
  await server.start();
  console.log('Server running at:', server.info.uri);
} catch(err) {
  console.log(err);
}

server.route(Routes);
})();