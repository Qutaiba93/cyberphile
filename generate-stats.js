// generate-stats.js — Reads bot-data/stream-segments.json and outputs docs/stream-stats.json
// Run before each git push: node generate-stats.js

const fs = require('fs');
const path = require('path');

const SEGMENT_FILE = path.join(__dirname, 'bot-data', 'stream-segments.json');
const OUTPUT_FILE = path.join(__dirname, 'docs', 'stream-stats.json');

function generate() {
  if (!fs.existsSync(SEGMENT_FILE)) {
    console.log('No segment data found at', SEGMENT_FILE);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SEGMENT_FILE, 'utf8'));
  const sessions = raw.sessions || [];
  const categoryStats = raw.categoryStats || {};
  const hourlyPatterns = raw.hourlyPatterns || {};
  const dailyStats = raw.dailyStats || {};

  // Total segments across all sessions
  const totalSegments = sessions.reduce((sum, s) => sum + (s.segments ? s.segments.length : 0), 0);

  // All-time peak & avg from category stats
  const catEntries = Object.entries(categoryStats);
  let allTimePeak = 0;
  let totalViewersAll = 0;
  let totalSamplesAll = 0;
  let totalMsgsAll = 0;

  for (const [, cs] of catEntries) {
    allTimePeak = Math.max(allTimePeak, cs.peakViewers || 0);
    totalViewersAll += cs.totalViewers || 0;
    totalSamplesAll += cs.sampleCount || 0;
    totalMsgsAll += cs.totalMsgs || 0;
  }

  const allTimeAvg = totalSamplesAll > 0 ? Math.round(totalViewersAll / totalSamplesAll) : 0;

  // Category rankings sorted by avg viewers
  const categories = catEntries
    .map(([name, cs]) => ({
      name,
      avgViewers: cs.avgViewers || 0,
      peakViewers: cs.peakViewers || 0,
      sampleCount: cs.sampleCount || 0,
      totalMsgs: cs.totalMsgs || 0,
    }))
    .sort((a, b) => b.avgViewers - a.avgViewers);

  // Daily history (last 14 days)
  const dailyKeys = Object.keys(dailyStats).sort().slice(-14);
  const dailyHistory = dailyKeys.map(date => ({
    date,
    avgViewers: dailyStats[date].avgViewers || 0,
    peakViewers: dailyStats[date].peakViewers || 0,
    totalMsgs: dailyStats[date].totalMsgs || 0,
    categories: dailyStats[date].categories || [],
  }));

  // Sanitized hourly patterns
  const hourlyOut = {};
  for (const [h, hp] of Object.entries(hourlyPatterns)) {
    hourlyOut[h] = {
      avgViewers: hp.avgViewers || 0,
      sampleCount: hp.sampleCount || 0,
      totalMsgs: hp.totalMsgs || 0,
    };
  }

  const output = {
    totalSessions: sessions.length,
    totalDays: Object.keys(dailyStats).length,
    totalSegments,
    allTimePeak,
    allTimeAvg,
    totalMessages: totalMsgsAll,
    categories,
    hourlyPatterns: hourlyOut,
    dailyHistory,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✅ Stream stats generated → ${OUTPUT_FILE}`);
  console.log(`   ${sessions.length} sessions | ${totalSegments} data points | ${categories.length} categories | ${dailyHistory.length} days`);
  console.log(`   All-time peak: ${allTimePeak} | All-time avg: ${allTimeAvg} | Messages: ${totalMsgsAll}`);
}

generate();
