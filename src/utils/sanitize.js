function sanitizeQuery(input) {
  return String(input || '').trim().replace(/\s+/g, ' ');
}

module.exports = { sanitizeQuery };
