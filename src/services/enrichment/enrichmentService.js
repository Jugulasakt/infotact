const { generateLeadSummary } = require('../ai/geminiService');

function inferIndustry(searchQuery, fallback = '') {
  if (fallback) return fallback;
  const q = searchQuery.toLowerCase();

  if (q.includes('marketing')) return 'Digital Marketing';
  if (q.includes('software') || q.includes('saas')) return 'Software / SaaS';
  if (q.includes('agency')) return 'Agency Services';
  return 'Unknown';
}

function heuristicRelevance(lead, searchQuery) {
  let score = 40;

  if (lead.emails.length > 0) score += 20;
  if (lead.phones.length > 0) score += 15;

  const tokens = searchQuery.toLowerCase().split(/\s+/);
  const hay = `${lead.companyName} ${lead.website}`.toLowerCase();
  const tokenHits = tokens.filter((t) => hay.includes(t)).length;
  score += Math.min(25, tokenHits * 5);

  return Math.max(0, Math.min(100, score));
}

async function enrichLead(lead) {
  const industry = inferIndustry(lead.searchQuery, lead.industry);
  const employeeRange = lead.employeeRange || '11-50';
  const targetRelevanceScore = heuristicRelevance(lead, lead.searchQuery);

  const aiSummary = await generateLeadSummary({
    ...lead,
    industry,
    employeeRange,
    targetRelevanceScore
  });

  return {
    ...lead,
    industry,
    employeeRange,
    summary: aiSummary,
    targetRelevanceScore
  };
}

module.exports = { enrichLead };
