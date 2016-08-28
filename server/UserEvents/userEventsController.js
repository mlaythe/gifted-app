'use strict';
const bookshelf = require('../../test/fixtures/DB-fixture').bookshelf;
const knex = require('../../test/fixtures/DB-fixture').knex;
const UserEvents = require('./userEventsModel');
const User = require('../Users/userModel.js');
const tokenController = require('../Utils/tokenController');
const _ = require('lodash');
const Event = require('../Events/eventModel.js');
const client = require('../../test/fixtures/DB-fixture').client;

const userEventsController = {};

userEventsController.createTable = () => {
  return knex.schema.createTableIfNotExists('user-events', userEvent => {
    userEvent.increments();
    userEvent.string('email');
    userEvent.integer('eventID');
    userEvent.string('rsvpStatus');
  });
};  

userEventsController.createUserEventConnection = (req, res, next) => {
  const isCreatingEvent = req.url.indexOf('invite-user');
  
  if (isCreatingEvent === -1) {
    userEventsController.createTable()
    .then( () => {
      UserEvents.forge({ email: req.user.email, eventID: req.body.eventID, rsvpStatus: 'attending' }).save().then( result => {
        return res.status(201).send({
          eventID: req.body.eventID
        });
      });
    })
    .catch( err => {
      return res.status(400).send('Error adding user-event connection.');
    });
  } else {
    userEventsController.createTable()
    .then( () => {
      UserEvents
        .query({where: {email: req.body.inviteUser}, andWhere: {eventID: req.params.eventID}})
        .fetch()
        .then( model => {
          if (model) {
            return res.status(400).send('User has already been invited to event.');
          } 
          
          UserEvents.forge({ email: req.body.inviteUser, eventID: req.params.eventID, rsvpStatus: 'pending' }).save().then( result => {
            next();
          });
        });
    })
    .catch( err => {
      return res.status(400).send('Error inviting user-event connection.');
    });
  }
};

userEventsController.getEvents = (req, res, next) => {
  client.hgetall(req.body.email, (err, reply) => {
    if (err) console.log('Error fetching events in redis', err.message);
    
    if (!reply) {
      knex
        .select()
        .from('events')
        .innerJoin('user-events', 'user-events.eventID', 'events.eventID')
        .innerJoin('users', 'user-events.email', 'users.email')
        .where('users.email', req.body.email)
        .then( result => {
          client.hset(req.body.email, 'events', JSON.stringify(result));
          return res.status(201).send({
            id_token: tokenController.createToken(req.body, req.body.email),
            events: result
          });
        })
        .catch( err => {
          return res.status(400).send('Error querying for all events associated with user.');
        });
    } else {
      client.hgetall(req.body.email, (err, obj) => {
        if (err) return res.status(400).send('Error fetching events from cache.');

        return res.status(201).send({
          events: obj.events
        });
      });
    }
  });
};

userEventsController.updateUserEventConnection = (req, res, next) => {
  knex('user-events')
    .where('user-events.email', req.params.email).andWhere('user-events.eventID', '=', req.params.eventID)
    .update({
      rsvpStatus: req.body.response
    })
    .then( result => {
      return res.status(200).send('Response for event was successfully saved!');
    })
    .catch( err => {
      return res.status(400).send('Error responding to event invite.');
    });
};

module.exports = userEventsController;
