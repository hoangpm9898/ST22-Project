const { createClient } = require('redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD || undefined
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect();

module.exports = client;