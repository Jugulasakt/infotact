const { Worker } = require('bullmq');
const { connection } = require('./queue');
const env = require('../config/env');
const { processLeadScrapeJob } = require('./processors/leadProcessor');
const { connectMongo } = require('../db/mongo');

async function startWorker() {
  // ✅ Connect to MongoDB BEFORE processing any jobs
  await connectMongo();

  const worker = new Worker(
    'lead-scrape',
    async (job) => processLeadScrapeJob(job.data),
    {
      connection,
      concurrency: env.crawlConcurrency
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[worker] job ${job.id} completed`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed`, err.message);
  });

  console.log('[worker] started');
}

startWorker().catch((err) => {
  console.error('[worker] fatal error', err);
  process.exit(1);
});