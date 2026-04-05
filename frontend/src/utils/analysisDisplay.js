/** Shared copy + parsing for session analysis UI (Analysis page + entry modal). */

/**
 * Coerce Gemini / stored keywords into a deduped string[] for UI.
 * Handles arrays, comma-separated strings, and common alternate keys.
 */
export function normalizeKeywordList(raw, analysis = null, extraList = null) {
  const candidates = [];
  const push = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      candidates.push(...v);
    } else if (typeof v === 'string' && v.trim()) {
      candidates.push(
        ...v
          .split(/[,;]|\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  };
  push(raw);
  if (analysis && typeof analysis === 'object') {
    push(analysis.keywords);
    push(analysis.context_keywords);
    push(analysis.top_keywords);
    if (analysis.summary && typeof analysis.summary === 'object') {
      push(analysis.summary.keywords);
    }
  }
  push(extraList);

  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const s = String(c).trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= 16) break;
  }
  return out;
}

export function sessionHeadline(mood) {
  const m = (mood || 'calm').toLowerCase();
  if (m === 'ease') return 'Quiet Reflection.';
  if (m === 'tension') return 'Heavy Weather.';
  return 'Steady Ground.';
}

export function sessionSubtitle(analysis) {
  const mood = analysis?.emotional_feedback?.mood || 'calm';
  const feelings = String(analysis?.emotional_feedback?.feelings || '').trim();
  const moodPhrase =
    mood === 'ease'
      ? 'a move toward lightness and clarity'
      : mood === 'tension'
        ? 'weight, worry, or strain in the mix'
        : 'a steady, observant tone';
  const base = `Your murmur reads like ${moodPhrase}. AI processed your words to synthesize this feedback.`;
  if (!feelings) return base;
  const clip = feelings.length > 140 ? `${feelings.slice(0, 140)}…` : feelings;
  return `${base} ${clip}`;
}

/** Gemini mood → single nuance label (insights / feelings card). */
export function resonanceNuanceLabel(mood) {
  const m = (mood || 'calm').toLowerCase();
  if (m === 'ease') return 'Positive tone';
  if (m === 'tension') return 'Heavy';
  return 'Balanced';
}

export function resonanceNuancePills(mood) {
  return [resonanceNuanceLabel(mood).toUpperCase()];
}

export function splitKeyThoughts(text) {
  if (!text || !String(text).trim()) return [];
  const s = String(text).trim();
  const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ')];
  const mid = Math.floor(s.length / 2);
  const cut = s.lastIndexOf(' ', mid);
  if (cut <= 0) return [s];
  return [s.slice(0, cut).trim(), s.slice(cut + 1).trim()];
}

export function splitSentences(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Text block for Ask Murmur when transcript is not stored — uses analysis only. */
export function entryToSearchableText(entry) {
  if (!entry) return '';
  const t = entry.transcript && String(entry.transcript).trim();
  if (t) return t;
  const a = entry.analysis;
  if (!a) return '';
  const bits = [];
  if (a.summary?.key_points?.length) bits.push(a.summary.key_points.join(' '));
  const ef = a.emotional_feedback;
  if (ef) {
    if (ef.key_thoughts) bits.push(ef.key_thoughts);
    if (ef.feelings) bits.push(ef.feelings);
    if (ef.murmurings || ef.whats_next) bits.push(ef.murmurings || ef.whats_next);
  }
  return bits.filter(Boolean).join('\n\n');
}
