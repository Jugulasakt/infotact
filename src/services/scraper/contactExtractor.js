const puppeteer = require('puppeteer');
const validator = require('validator');

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches Indian phone numbers only:
// +91 9876543210 | +919876543210 | 9876543210 | 09876543210
// Must start with 6,7,8,9 (valid Indian mobile prefixes)
const PHONE_REGEX = /(?<!\d)(?:\+91[\s\-]?|0)?[6-9]\d{9}(?!\d)/g;

function normalizePhone(phone) {
  // Remove all spaces and dashes for deduplication, then reformat
  const digits = phone.replace(/[\s\-]/g, '');
  // Remove leading 0 or +91 to get 10-digit number
  const core = digits.replace(/^(\+91|0)/, '');
  // Only return if exactly 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(core)) {
    return '+91' + core;
  }
  return null;
}

async function scrapeContactData(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();

    const emailCandidates = content.match(EMAIL_REGEX) || [];
    const phoneCandidates = content.match(PHONE_REGEX) || [];

    const emails = Array.from(
      new Set(emailCandidates.map((e) => e.toLowerCase()).filter((e) => validator.isEmail(e)))
    );

    const phones = Array.from(
      new Set(phoneCandidates.map(normalizePhone).filter((p) => p !== null))
    );

    return { emails, phones };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeContactData };
