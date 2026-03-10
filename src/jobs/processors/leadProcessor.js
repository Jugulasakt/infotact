const Lead = require('../../models/Lead');
const { searchBusinesses } = require('../../services/scraper/googleScraper');
const { scrapeContactData } = require('../../services/scraper/contactExtractor');
const { enrichLead } = require('../../services/enrichment/enrichmentService');
const env = require('../../config/env');

const GENERIC_HOST_BLOCKLIST = [
  'wikipedia.org',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'forbes.com',
  'ibm.com',
  'microsoft.com',
  'amazon.com',
  'apple.com',
  'digitalspy.com',
  'zhihu.com'
];

const STOP_WORDS = new Set([
  'in',
  'for',
  'near',
  'the',
  'and',
  'or',
  'of',
  'to',
  'a',
  'an'
]);

function extractQuerySignals(query) {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));

  const location = tokens.length > 0 ? tokens[tokens.length - 1] : '';
  const intentTokens = tokens.filter((t) => t.length > 2 && t !== location);
  return { location, intentTokens };
}

function isBlockedHost(website) {
  try {
    const host = new URL(website).hostname.toLowerCase();
    return GENERIC_HOST_BLOCKLIST.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

function isRelevantCandidate(business, querySignals) {
  if (!business?.website) return false;
  if (isBlockedHost(business.website)) return false;

  const hay = `${business.name || ''} ${business.location || ''} ${business.website}`.toLowerCase();
  const { location, intentTokens } = querySignals;

  const intentHits = intentTokens.filter((t) => hay.includes(t)).length;
  const hasLocationHit = location ? hay.includes(location) || business.website.endsWith('.in') : true;

  return intentHits >= 1 && hasLocationHit;
}

async function processLeadScrapeJob(data) {
  const { query } = data;
  const businesses = await searchBusinesses(query, env.maxScrapeResults * 3);
  const querySignals = extractQuerySignals(query);
  const relevantBusinesses = businesses.filter((b) => isRelevantCandidate(b, querySignals));
  const nonBlockedBusinesses = businesses.filter((b) => !isBlockedHost(b.website));
  const selectedBusinesses =
    relevantBusinesses.length > 0
      ? relevantBusinesses
      : nonBlockedBusinesses.slice(0, env.maxScrapeResults);

  let created = 0;
  let updated = 0;
  let skippedIrrelevant = 0;

  for (const business of businesses) {
    if (!selectedBusinesses.includes(business)) {
      skippedIrrelevant += 1;
      continue;
    }

    try {
      const contact = await scrapeContactData(business.website);
      const enriched = await enrichLead({
        searchQuery: query,
        companyName: business.name,
        website: business.website,
        location: business.location || '',
        emails: contact.emails,
        phones: contact.phones,
        source: 'search-engine',
        raw: { business }
      });

      if (enriched.targetRelevanceScore < 40) {
        skippedIrrelevant += 1;
        continue;
      }

      const upsert = await Lead.updateOne(
        { website: enriched.website, searchQuery: query },
        { $set: enriched },
        { upsert: true }
      );

      if (upsert.upsertedCount > 0) created += 1;
      else updated += 1;
    } catch (err) {
      console.warn(`[leadProcessor] skipped ${business.website}: ${err.message}`);
    }
  }

  return {
    query,
    scanned: businesses.length,
    considered: selectedBusinesses.length,
    skippedIrrelevant,
    created,
    updated
  };
}

module.exports = { processLeadScrapeJob };
