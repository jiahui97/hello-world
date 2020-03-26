"use strict";

const dotenv = require("dotenv");
const Hapi = require('@hapi/hapi');
const sql = require("./sql");
const Joi = require('@hapi/joi');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Pack = require('./package');
const JWT = require('jsonwebtoken');
const lib = require('./hapi-auth-jwt2/lib');
const secret = 'NeverShareYourSecret';
const people = { // our "users database"
  1: {
    id: 1,
    name: 'Jane',
    scope: 'admin'
  },
  2: {
    id: 2,
    name: 'Daniel',
    scope: 'superadmin'
  }
};

const token1 = JWT.sign(people[1], secret);
const token2 = JWT.sign(people[2], secret);
console.log(token1, people[1]);
console.log(token2, people[2]);

// validation function
const validate = async function (decoded, request, h) {

  console.log("decoded token:",decoded);
  console.log("request info:",request.info);
  console.log("user agent:",request.headers['user-agent']);
 
  // do your checks to see if the person is valid
  if (!people[decoded.id]) {
    return { isValid: false };
  }
  else {
    return { isValid: true };
  }
};


const createServer = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: process.env.HOST || "localhost"
  });
  return server;
};

const init = async () => {
  dotenv.config();
  const server = await createServer();
  const swaggerOptions = {
    info: {
      title: 'Test API Documentation',
      version: Pack.version,
    },
  };

  await server.register([
    sql,
    Inert,
    Vision,
    lib,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('jwt', 'jwt',
    {
      key: 'NeverShareYourSecret', // Never Share your secret key
      validate,  // validate function defined above
      verifyOptions: {
        ignoreExpiration: true,
        algorithms: ['HS256']
      }
    });

  server.auth.default('jwt');

  await server.start();
  console.log("Server running on %s", server.info.uri);


  // get all order list
  server.route({
    method: "GET",
    path: "/Order",
    handler: async (request, h) => {
      let select = `SELECT * FROM public.account`;
      try {
        const allOrder = await h.sql`SELECT * FROM public.account`;
        return allOrder;
      } catch (err) {
        console.log(err);
        return "fail";
      }
    }, options: {
      description: 'Display All Orders',
      tags: ['api'],
      auth: {
          scope: 'superadmin', //this allow superadmin to access only
      }
  });

  // get order by orderId
  server.route({
    method: "GET",
    path: "/Order/{order_id}",
    handler: async (request, h) => {
      try {
        const orderByID = await h.sql`SELECT * FROM public.account 
        where order_id = ${request.params.order_id}`;
        return orderByID;
      } catch (err) {
        console.log(err);
        return "order not found";
      }
    }, options: {
      description: 'Display Specific Order',
      tags: ['api'],
      auth: {
          scope: [`superadmin`, `admin`] //allow superadmin and admin access
        }
    }
  });

  //add new order
  server.route({
    method: "PUT",
    path: "/addOrder",
    handler: async (request, h) => {
      try {
        const { order_id, start_date, end_date } = request.payload;
        const addOrder = await h.sql`INSERT INTO public.account 
            (order_id, start_date, end_date) 
            VALUES 
            (${order_id},${start_date},${end_date}) `;
        return addOrder;
      } catch (err) {
        console.log(err, sql);
        return "Add order fail";
      }
    }, options: {
      description: 'Add Order',
      tags: ['api'],
      auth:{
        mode:'optional' // allow public 
    }
    }
  });

}
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();