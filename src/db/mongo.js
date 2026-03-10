const mongoose = require('mongoose');
const env = require('../config/env');

async function connectMongo() {
  await mongoose.connect(env.mongoUri);
  console.log('[mongo] connected');
}

module.exports = { connectMongo };
