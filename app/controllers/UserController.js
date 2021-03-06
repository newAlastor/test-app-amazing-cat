/* eslint-disable no-underscore-dangle */
const express = require('express');

const router = express.Router();

const redis = require('./../connectors/RedisConnector');

const verifyToken = require('../middleware/verifyToken');

const User = require('../models/User');

const Post = require('../models/Post');

const logger = require('../logger');

router.delete('/:username', verifyToken, (req, res) => {
  logger.info(`delete user:  ${req.params.username}`);
  User.findByIdAndRemove(req.userId)
    .then(() => Post.remove({ author: req.userId }))
    .then(() => {
      redis.set(req.token.jti, req.userId, 'EX', req.token.timeToDelete, (err, resp) => {
        if (err) {
          return res.status(500).send({
            code: 500,
            message: err.message,
          });
        }
        return resp;
      });
    })
    .then(() => res.status(200).send({
      code: 200,
      message: 'User deleted with his posts',
    }))
    .catch((error) => {
      logger.error(`Delete user: ${req.params.username} - error find by id and remove`, error);
      return res.status(500).send({ code: 500, message: 'There was a problem deleting the user.' });
    });
});

router.get('/:username/posts', (req, res) => {
  User.findOne({ username: req.params.username })
    .then(user => Post.find({ author: user._id }, '_id'))
    .then((posts) => {
      if (posts.length > 0) {
        res.status(200).send({
          code: 200,
          message: 'Success',
          posts,
        });
      } else {
        res.status(404).send({
          code: 404,
          message: 'This user has no posts.',
        });
      }
    })
    .catch(() => {
      logger.error(`Posts user: ${req.params.username} - error user posts find`);
      return res.status(500).send({
        code: 500,
        message: 'There was a problem read posts',
      });
    });
});


module.exports = router;
