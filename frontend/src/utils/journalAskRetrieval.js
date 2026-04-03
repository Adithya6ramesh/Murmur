import Fuse from 'fuse.js';
import { normalizeKeywordList } from './analysisDisplay.js';

/** Filler words removed from the user question before keyword-style matching (per product spec). */
export const QUERY_STOP_WORDS = new Set([
  'when',
  'did',
  'i',
  'the',
  'a',
  'is',
  'was',
  'my',
  'do',
  'does',
  'have',
  'has',
  'had',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'by',
  'from',
  'as',
  'an',
  'are',
  'were',
  'be',
  'been',
  'being',
  'this',
  'that',
  'these',
  'those',
  'it',
  'we',
  'you',
  'they',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'where',
  'why',
  'how',
  'if',
  'or',
  'and',
  'but',
  'not',
  'no',
  'so',
  'just',
  'about',
  'into',
  'than',
  'then',
  'too',
  'very',
  'can',
  'could',
  'would',
  'should',
  'may',
  'might',
  'must',
  'will',
  'shall',
]);

/**
 * Step 1–2: lowercase, strip punctuation, drop filler words.
 * @returns {string[]} content words (e.g. ["fight", "boyfriend"])
 */
export function extractQueryKeywords(query) {
  const lower = String(query || '')
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ');
  const words = lower.split(/\s+/).filter(Boolean);
  return words.filter((w) => w.length > 1 && !QUERY_STOP_WORDS.has(w));
}

function buildEntrySearchText(entry) {
  const parts = [];
  const kw = normalizeKeywordList(entry?.keywords, entry?.analysis);
  if (kw.length) parts.push(kw.join(' '));
  const a = entry?.analysis;
  if (a?.summary?.key_points?.length) {
    parts.push(
      a.summary.key_points.map((x) => String(x).replace(/^•\s*/, '')).join(' ')
    );
  }
  const ef = a?.emotional_feedback;
  if (ef) {
    if (ef.key_thoughts) parts.push(String(ef.key_thoughts));
    if (ef.feelings) parts.push(String(ef.feelings));
  }
  return parts.join(' ').trim();
}

/** One journal block for the Gemini prompt (summaries + structured fields). */
export function formatEntryBlockForPrompt(date, entry) {
  const lines = [];
  const kw = normalizeKeywordList(entry?.keywords, entry?.analysis);
  if (kw.length) lines.push(`Keywords: ${kw.join(', ')}`);
  const a = entry?.analysis;
  if (a?.summary?.key_points?.length) {
    lines.push('Summary:');
    a.summary.key_points.forEach((kp) =>
      lines.push(`- ${String(kp).replace(/^•\s*/, '')}`)
    );
  }
  const ef = a?.emotional_feedback;
  if (ef) {
    lines.push(`Mood: ${ef.mood || 'calm'}`);
    if (ef.feelings) lines.push(`Feelings: ${ef.feelings}`);
    if (ef.key_thoughts) lines.push(`Key thoughts: ${ef.key_thoughts}`);
  }
  return [`### ${date}`, lines.filter(Boolean).join('\n')].join('\n');
}

export function buildIndexedEntryRecords(journalEntries) {
  if (!journalEntries || typeof journalEntries !== 'object') return [];
  return Object.entries(journalEntries)
    .map(([date, entry]) => {
      const searchText = buildEntrySearchText(entry);
      if (!searchText) return null;
      return { date, entry, searchText };
    })
    .filter(Boolean);
}

/**
 * Fuse.js fuzzy retrieval over keywords + summaries + feelings/thoughts, then optional top-up by recency.
 */
export function retrieveEntriesForQuestion(question, journalEntries, options = {}) {
  const { limit = 12, minResults = 4 } = options;
  const records = buildIndexedEntryRecords(journalEntries);
  if (!records.length) return [];

  const q = String(question || '').trim();
  if (!q) {
    return [...records]
      .sort((a, b) => {
        const ta = Date.parse(a.date);
        const tb = Date.parse(b.date);
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      })
      .slice(0, limit);
  }

  const fuse = new Fuse(records, {
    keys: ['searchText'],
    includeScore: true,
    threshold: 0.42,
    ignoreLocation: true,
    minMatchCharLength: 2,
    distance: 220,
  });

  const combinedQuery = [q, ...extractQueryKeywords(q)].filter(Boolean).join(' ');
  const ranked = fuse.search(combinedQuery);
  let picked = ranked.slice(0, limit).map((r) => r.item);

  if (picked.length < minResults) {
    const seen = new Set(picked.map((p) => p.date));
    const rest = [...records]
      .sort((a, b) => {
        const ta = Date.parse(a.date);
        const tb = Date.parse(b.date);
        const na = Number.isNaN(ta) ? 0 : ta;
        const nb = Number.isNaN(tb) ? 0 : tb;
        return nb - na;
      })
      .filter((r) => !seen.has(r.date));
    for (const r of rest) {
      if (picked.length >= Math.max(minResults, limit)) break;
      picked.push(r);
      seen.add(r.date);
    }
  }

  return picked.slice(0, limit);
}

/**
 * Context string for POST /journal/ask: only retrieved entries, formatted for the model.
 */
export function buildJournalContextForAsk(question, journalEntries) {
  const items = retrieveEntriesForQuestion(question, journalEntries);
  if (!items.length) return '';
  return items.map(({ date, entry }) => formatEntryBlockForPrompt(date, entry)).join('\n\n---\n\n');
}

/**
 * Parse Gemini reply with Answer: / Relevant Insights: sections.
 */
export function parseAskResponse(text) {
  const raw = (text || '').trim();
  if (!raw) return { answer: '', insights: '' };

  const relIdx = raw.search(/\n\s*Relevant Insights:\s*/i);
  if (relIdx === -1) {
    const without = raw.replace(/^Answer:\s*/i, '').trim();
    return { answer: without || raw, insights: '' };
  }

  let answer = raw.slice(0, relIdx).replace(/^Answer:\s*/i, '').trim();
  let insights = raw.slice(relIdx).replace(/^\s*Relevant Insights:\s*/i, '').trim();
  const toneIdx = insights.search(/\n\s*Tone:\s*/i);
  if (toneIdx !== -1) insights = insights.slice(0, toneIdx).trim();

  return { answer: answer || raw, insights };
}
