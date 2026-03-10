const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    searchQuery: { type: String, index: true },
    companyName: { type: String, required: true },
    website: { type: String, required: true, index: true },
    emails: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    location: { type: String, default: '' },
    industry: { type: String, default: '' },
    employeeRange: { type: String, default: '' },
    summary: { type: String, default: '' },
    targetRelevanceScore: { type: Number, min: 0, max: 100, default: 0 },
    source: { type: String, default: 'google-search' },
    raw: { type: Object, default: {} }
  },
  { timestamps: true }
);

LeadSchema.index({ website: 1, searchQuery: 1 }, { unique: true });

module.exports = mongoose.model('Lead', LeadSchema);
