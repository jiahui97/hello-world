"use strict";

const dotenv = require("dotenv");
const Hapi = require('@hapi/hapi');
const sql = require("./sql");
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Pack = require('./package');
const JWT = require('jsonwebtoken');
const lib = require('./hapi-auth-jwt2/lib');
const bcrypt = require('bcrypt');
const Uuid = require('./hapi-auth-jwt2/node_modules/uuid');
const redisClient = require('redis-connection')();

// validation function
const validate = async function (decoded, request, h) {

  const redisReturn = await redisClient.get(decoded.session_id);
  console.log(redisReturn);
  if (redisReturn == true) {
    redisClient.get(decoded.session_id, function (error, result) {
      if (error) {
        console.log(error);
        throw error;
      }
      console.log('GET result ->' + result);
    });

    return { isValid: true }
  } else {
    console.log(false);
    return { isValid: false }
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


  // register user
  server.route({
    method: 'POST',
    path: '/register',
    handler: async (request, h) => {
      try {
        const { user_id, email, password, role } = request.payload;
        const saltRounds = 12;
        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(password, salt);
        const insert = await h.sql`INSERT INTO public.users 
            (user_id,email,password,role)
             VALUES 
            (${ user_id},${email},${hash}, ${role})`;
        escape(insert);
        return insert;
      } catch (err) {
        console.log(err);
        return "register fail";
      }
    }, options: {
      auth: {
        strategy: 'jwt',
        mode: 'optional'
      }
    }
  });

  // user login
  server.route({
    method: 'POST',
    path: '/login',
    handler: async (request, h) => {
      try {
        const { email, pw } = request.payload;
        const e_mail = escape(`${ email }`);
        const getPW = await h.sql`SELECT password 
        FROM public.users where email = ${email}`;
        escape(getPW);
        if (getPW == false) {
          return "Invalid Combination of Email and Password";
        } else {
          const password = escape`${pw}`;
          const hash = getPW[0].password;
          const checkPW = bcrypt.compareSync(password, hash);
          if (checkPW == true) {
            const getQuery = await h.sql`SELECT user_id,role 
          FROM public.users where email = ${email}`;
            const uid = getQuery[0].user_id;
            const role = getQuery[0].role;
            const sid = Uuid.v4();
            console.log("sid= " + sid + ",uid=" + uid + ",role=" + role);
            let sessionRedisObj = {
              session_id: `${sid}`,
              uid: `${uid}`,
              role: `${role}`,
              expiy: "1"
            };
            let sessionObj = {
              session_id: `${sid}`,
              expiry: `100s`
            };
            const insert = await h.sql`INSERT INTO public.sessions 
        (session_id,user_id,roles,expire)
        VALUES 
        (${ sid},${uid},${role},${uid})`;
            const session = JSON.stringify(sessionRedisObj);
            const JWTSession = JSON.stringify(sessionObj);
            const JWTSign = JWT.sign(JWTSession, secret);
            console.log("JWTSign =" + JWTSign);
            try {
              const redisIn = await redisClient.set(sid, session);
              console.log("Redis" + redisIn);
              return "loginSuccesful";
            } catch (err) {
              console.log(err);
              return err;
            }
          } else {
            loginMsg = "Invalid Combination of Email and Password";
          }
          return loginMsg;
        }
      } catch (err) {
        console.log(err);
        return "login function error";
      }

    }, options: {
      auth: {
        mode: 'optional'
      }
    }
  });
  server.route({
    method: 'GET',
    path: '/loginVerify',
    handler: async (request, h) => {
      if (redis == true) {
        return "HI";
      }
      return "bye";
    }, options: {
      auth: {
        strategy: 'jwt'
      }
    }
  });
};
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();