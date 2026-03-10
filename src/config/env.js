const dotenv = require('dotenv');
dotenv.config();

const required = ['MONGO_URI', 'REDIS_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  puppeteerHeadless: String(process.env.PUPPETEER_HEADLESS || 'true') === 'true',
  maxScrapeResults: Number(process.env.MAX_SCRAPE_RESULTS || 10),
  crawlConcurrency: Number(process.env.CRAWL_CONCURRENCY || 4)
};
