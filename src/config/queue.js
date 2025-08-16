const Queue = require('bull');

const collectionQueue = new Queue('collection-queue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

module.exports = collectionQueue;