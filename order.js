"use strict";

const dotenv = require("dotenv");
const Hapi = require('@hapi/hapi');
const sql = require("./sql");
const Joi = require('@hapi/joi');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Pack = require('./package');

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
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ]);
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
      tags: ['api']
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
      tags: ['api']
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
            (${order_id},${ start_date},${end_date}) `;
        return addOrder;
      } catch (err) {
        console.log(err, sql);
        return "Add order fail";
      }
    }, options: {
      description: 'Add Order',
      tags: ['api']
    }
  });

  // update existing order
  server.route({
    method: "POST",
    path: "/updateOrder",
    handler: async (request, h) => {
      try {
        const {start_date, end_date, order_id} = request.payload;
        const updateOrder = await h.sql`UPDATE public.account
          SET start_date = ${ start_date} , end_date = ${end_date}
          WHERE order_id = ${ order_id}`;
        return updateOrder;
      } catch (err) {
        console.log(err);
        return "update order fail";
      }
    }, options: {
      description: 'Update Order',
      tags: ['api']
    }
  });

  // delete existing order
  server.route({
    method: "DELETE",
    path: "/deleteOrder/{order_id}",
    handler: async (request, h) => {
      try {
        const deleteOrder = await h.sql`DELETE FROM public.account 
          WHERE order_id = ${ request.params.order_id} `;
        return deleteOrder;
      } catch (err) {
        console.log(err);
        return "delete order fail";
      }
    }, options: {
      description: 'Delete Order',
      tags: ['api']
    }
  });

}
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();