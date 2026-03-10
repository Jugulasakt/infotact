const { GoogleGenAI } = require('@google/genai');
const env = require('../../config/env');

let client = null;
function getClient() {
  if (!env.geminiApiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

async function generateLeadSummary(lead) {
  const prompt = [
    'You are a B2B sales analyst.',
    'Create a concise lead summary in max 80 words.',
    'Include: business profile, likely ICP fit, outreach angle.',
    `Company: ${lead.companyName}`,
    `Website: ${lead.website}`,
    `Location context: ${lead.location || 'N/A'}`,
    `Industry: ${lead.industry || 'Unknown'}`,
    `Employee range: ${lead.employeeRange || 'Unknown'}`,
    `Emails: ${lead.emails.join(', ') || 'None'}`,
    `Phones: ${lead.phones.join(', ') || 'None'}`,
    `Relevance score: ${lead.targetRelevanceScore}`
  ].join('\n');

  const api = getClient();
  if (!api) {
    return `Prospect appears to be in ${lead.industry}. Contactability is ${
      lead.emails.length || lead.phones.length ? 'good' : 'low'
    }. Relevance score is ${lead.targetRelevanceScore}/100.`;
  }

  try {
    const res = await api.models.generateContent({
      model: env.geminiModel,
      contents: prompt
    });

    const text = res.text?.trim();
    if (text) return text;
  } catch (err) {
    console.warn('[gemini] summary generation failed:', err.message);
  }

  return `Prospect appears to be in ${lead.industry}. Relevance score is ${lead.targetRelevanceScore}/100.`;
}

module.exports = { generateLeadSummary };
