const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const env = require('../config/env');

const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const leadQueue = new Queue('lead-scrape', { connection });

module.exports = { connection, leadQueue };
