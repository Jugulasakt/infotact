const Lead = require('../../models/Lead');
const { leadQueue } = require('../../jobs/queue');
const { sanitizeQuery } = require('../../utils/sanitize');

async function enqueueLeadScrape(req, res, next) {
  try {
    const query = sanitizeQuery(req.body.query);
    if (!query) return res.status(400).json({ message: 'query is required' });

    const job = await leadQueue.add(
      'scrape-leads',
      { query },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 }
      }
    );

    return res.status(202).json({ message: 'job queued', jobId: job.id, query });
  } catch (err) {
    next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    const query = sanitizeQuery(req.query.query || '');
    const filter = query ? { searchQuery: query } : {};
    const leads = await Lead.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ count: leads.length, leads });
  } catch (err) {
    next(err);
  }
}

async function getQueueStats(req, res, next) {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      leadQueue.getWaitingCount(),
      leadQueue.getActiveCount(),
      leadQueue.getCompletedCount(),
      leadQueue.getFailedCount()
    ]);

    return res.json({ waiting, active, completed, failed });
  } catch (err) {
    next(err);
  }
}

module.exports = { enqueueLeadScrape, listLeads, getQueueStats };
