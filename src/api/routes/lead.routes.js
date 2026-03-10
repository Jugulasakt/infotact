const express = require('express');
const { enqueueLeadScrape, listLeads, getQueueStats } = require('../controllers/lead.controller');

const router = express.Router();

router.post('/scrape', enqueueLeadScrape);
router.get('/leads', listLeads);
router.get('/stats', getQueueStats);

module.exports = router;
