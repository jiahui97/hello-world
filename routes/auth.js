'use strict';
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const JWT = require('jsonwebtoken');

module.exports = [{
    method: 'POST',
    path: '/login',
    options: {
        description: 'Login with username and password',
        tags: ['api', 'auth'],
        auth: false,
        validate: {
            payload: Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required()
            })
        }
    },
    handler: async (request, h) => {
        const { username, password } = request.payload
        const checkUser = await request.pgsql.query(
            `SELECT * FROM "staff" WHERE "username" = $1 LIMIT 1`,
            [username]
        )
        if (checkUser.rowCount == 0) {
            return new Boom.badRequest('Invalid Username or Password');
        }

        const isPasswordMatched = await bcrypt.compare(password, checkUser.rows[0].password);
        if (!isPasswordMatched) {
            return new Boom.badRequest('Invalid Username or Password');
        }

        const ipAddress = request.headers['x-real-ip'] || request.info.remoteAddress;
        const newSession = await request.pgsql.query(
            `INSERT INTO "session" ("staff_id", "ip_address") VALUES ($1, $2) RETURNING *`,
            [checkUser.rows[0].staff_id, ipAddress]
        )

        await request.redis.client.set(`session_${newSession.rows[0].session_id}`, JSON.stringify({ 
            scope: checkUser.rows[0].user_scope, 
            username: checkUser.rows[0].username,
            staff_id: checkUser.rows[0].staff_id
        }))

        const token = JWT.sign({ session_id: newSession.rows[0].session_id, scope: 'admin' }, process.env.JWT_SECRET);
        return {
            username: checkUser.rows[0].username,
            jwt: token
        }
    }
}, {
    method: 'POST',
    path: '/register',
    options: {
        description: 'Register a new user',
        tags: ['api', 'auth'],
        auth: false,
        validate: {
            payload: Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required()
            })
        }
    },
    handler: async (request, h) => {
        const { username, password } = request.payload
        const checkUser = await request.pgsql.query(
            `SELECT * FROM "staff" WHERE "username" = $1`,
            [username]
        )
        if (checkUser.rowCount != 0) {
            return new Boom.badRequest('Username Exist');
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await request.pgsql.query(
            `INSERT INTO "staff" ("username", "password") VALUES ($1, $2) RETURNING *`,
            [username, hashedPassword]
        )
        return newUser.rows[0]

    }
}];