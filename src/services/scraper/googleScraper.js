const axios = require('axios');
const cheerio = require('cheerio');

const NOISY_HOST_BLOCKLIST = [
  'ibm.com', 'digitalspy.com', 'zhihu.com', 'baidu.com', 'bilibili.com',
  'wikipedia.org', 'youtube.com', 'facebook.com', 'instagram.com',
  'linkedin.com', 'x.com', 'twitter.com', 'reddit.com', 'quora.com',
  'medium.com', 'forbes.com', 'microsoft.com', 'amazon.com', 'apple.com'
];

function toAbsoluteWebsite(rawHref) {
  if (!rawHref) return '';
  try {
    const h = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
    const u = new URL(h.startsWith('http') ? h : `https://${h}`);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
    return '';
  } catch { return ''; }
}

function isNoisyHost(website) {
  try {
    const host = new URL(website).hostname.toLowerCase();
    return NOISY_HOST_BLOCKLIST.some((b) => host === b || host.endsWith(`.${b}`));
  } catch { return true; }
}

function dedupeCandidates(candidates, maxResults) {
  const out = [];
  const seen = new Set();
  for (const c of candidates) {
    if (!c.website) continue;
    if (isNoisyHost(c.website)) continue;
    if (seen.has(c.website)) continue;
    seen.add(c.website);
    out.push({ name: c.name || c.website, website: c.website, location: c.location || '' });
    if (out.length >= maxResults) break;
  }
  return out;
}

// PRIMARY: Serper.dev - Free Google Search API (2500 free/month, no credit card)
// Get key at https://serper.dev → add SERPER_API_KEY=yourkey to .env
async function searchWithSerper(query, maxResults = 10) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.log('[scraper] SERPER_API_KEY not set — skipping Serper');
    return [];
  }
  try {
    console.log(`[scraper] Serper: "${query}"`);
    const res = await axios.post(
      'https://google.serper.dev/search',
      { q: query, gl: 'in', hl: 'en', num: maxResults * 2 },
      { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const results = res.data?.organic || [];
    console.log(`[scraper] Serper returned ${results.length} results`);
    const candidates = results.map((r) => ({
      name: r.title || '',
      website: toAbsoluteWebsite(r.link || ''),
      location: r.snippet || ''
    }));
    return dedupeCandidates(candidates, maxResults);
  } catch (err) {
    console.warn(`[scraper] Serper failed: ${err.message}`);
    return [];
  }
}

// FALLBACK 1: DuckDuckGo via POST
async function searchWithDDG(query, maxResults = 10) {
  try {
    console.log(`[scraper] DuckDuckGo POST: "${query}"`);
    const res = await axios.post(
      'https://html.duckduckgo.com/html/',
      new URLSearchParams({ q: query, kl: 'in-en' }).toString(),
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.5',
          'Origin': 'https://duckduckgo.com',
          'Referer': 'https://duckduckgo.com/'
        }
      }
    );

    const $ = cheerio.load(res.data);
    const candidates = [];

    $('.result__body, .result, .web-result').each((_, el) => {
      if (candidates.length >= maxResults * 3) return false;
      const titleEl = $(el).find('a.result__a, h2 a, .result__title a').first();
      const snippetEl = $(el).find('.result__snippet').first();
      const name = titleEl.text().trim();
      let href = titleEl.attr('href') || '';
      if (href.includes('/l/?')) {
        try {
          const u = new URL('https://duckduckgo.com' + href);
          href = decodeURIComponent(u.searchParams.get('uddg') || href);
        } catch {}
      }
      const website = toAbsoluteWebsite(href);
      if (name && website) candidates.push({ name, website, location: snippetEl.text().trim() });
    });

    console.log(`[scraper] DDG found ${candidates.length} raw candidates`);
    if (candidates.length === 0) {
      console.warn('[scraper] DDG HTML preview:', res.data?.substring(0, 400));
    }
    return dedupeCandidates(candidates, maxResults);
  } catch (err) {
    console.warn(`[scraper] DDG failed: ${err.message}`);
    return [];
  }
}

// FALLBACK 2: Bing HTML
async function searchWithBing(query, maxResults = 10) {
  try {
    console.log(`[scraper] Bing: "${query}"`);
    const res = await axios.get('https://www.bing.com/search', {
      params: { q: query, cc: 'IN' },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const $ = cheerio.load(res.data);
    const candidates = [];

    $('#b_results .b_algo, .b_algo').each((_, el) => {
      if (candidates.length >= maxResults * 3) return false;
      const titleEl = $(el).find('h2 a').first();
      const snippetEl = $(el).find('.b_caption p, .b_snippet').first();
      const name = titleEl.text().trim();
      const href = titleEl.attr('href') || '';
      const website = toAbsoluteWebsite(href);
      if (name && website) candidates.push({ name, website, location: snippetEl.text().trim() });
    });

    console.log(`[scraper] Bing found ${candidates.length} raw candidates`);
    if (candidates.length === 0) {
      console.warn('[scraper] Bing HTML preview:', res.data?.substring(0, 400));
    }
    return dedupeCandidates(candidates, maxResults);
  } catch (err) {
    console.warn(`[scraper] Bing failed: ${err.message}`);
    return [];
  }
}

async function searchBusinesses(query, maxResults = 10) {
  const serper = await searchWithSerper(query, maxResults);
  if (serper.length > 0) return serper.slice(0, maxResults);

  const ddg = await searchWithDDG(query, maxResults);
  if (ddg.length > 0) return ddg.slice(0, maxResults);

  const bing = await searchWithBing(query, maxResults);
  if (bing.length > 0) return bing.slice(0, maxResults);

  console.warn('[scraper] ALL engines returned 0 results.');
  console.warn('[scraper] FIX: Add SERPER_API_KEY to your .env file');
  console.warn('[scraper] FREE signup (no credit card): https://serper.dev');
  return [];
}

module.exports = { searchBusinesses };