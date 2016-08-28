'use strict';
const redis = require('redis');
const client = redis.createClient();

let knex;
let dbKey = process.env.TEST_DB_KEY;

if (dbKey === undefined) {
  require('dotenv').config();

  knex = require('knex')({
    client: 'pg',
    connection: process.env.TEST_DB_LOCAL,
    pool: {
      min: 1,
      max: 7
    }
  });
} else {
  knex = require('knex')({
    client: 'pg',
    connection: dbKey,
    pool: {
      min: 1,
      max: 7
    }
  });
}

const bookshelf = require('bookshelf')(knex);

module.exports = {
  knex,
  bookshelf,
  client
};
