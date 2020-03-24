const Hapi = require('@hapi/hapi')
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
      description: 'This is a sample example of API documentation.',
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
    path: '/get',
    handler: (request, h) => {

      return `Hello ${request.params.name}!`;

    },
    options: {
      tags: ['api'],
      validate: {
        headers: Joi.object({
          cookie: Joi.string().required()
        }),
        options: {
          allowUnknown: true
        }
      },
      description: 'swagger UI uses tags to group the display operations'
    } 
  });

  // add POST method
  server.route({
    method: 'POST',
    path: '/post',
    handler: function (request, h) {

      return 'Blog post added';

    }, options: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          post: Joi.string().min(1).max(140),
          date: Joi.date().required()
        })
      }, description: 'tags to API operation can be handled differently by tools & libraries'
    }
  });

  try {
    await server.start();
    console.log('Server running at:', server.info.uri);
  } catch (err) {
    console.log(err);
  }

  server.route(Routes);
})();