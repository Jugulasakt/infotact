const express = require('express');
const leadRoutes = require('./api/routes/lead.routes');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'prospectminer-ai' });
});

app.use('/api', leadRoutes);

app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(500).json({ message: 'internal server error' });
});

module.exports = app;
