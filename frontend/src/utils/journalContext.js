import { entryToSearchableText } from './analysisDisplay.js';

/** Build a single text block from stored journal entries for the ask API. */
export function buildJournalContext(journalEntries) {
  if (!journalEntries || typeof journalEntries !== 'object') return '';
  return Object.entries(journalEntries)
    .map(([date, e]) => {
      const text = entryToSearchableText(e).trim();
      return text ? { date, text } : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(({ date, text }) => `### ${date}\n${text}`)
    .join('\n\n');
}
