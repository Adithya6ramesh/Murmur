import Dexie from 'dexie';
import { normalizeKeywordList } from '../utils/analysisDisplay.js';

const USER_KEY = 'murmur-user-id';
const LEGACY_STORAGE_KEY = 'murmur-journal-data';
const MIGRATION_FLAG = 'murmur-dexie-migrated-v1';

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function getBrowserUserId() {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

let _dbPromise = null;

/**
 * One IndexedDB per user: name `murmur_journal_<userId>`
 */
export async function getJournalDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = openJournalDb();
  return _dbPromise;
}

async function openJournalDb() {
  const userId = getBrowserUserId();
  const db = new Dexie(`murmur_journal_${sanitizeId(userId)}`);

  db.version(1).stores({
    entries: 'date, savedAt',
  });

  await db.open();
  await migrateFromLocalStorage(db, userId);
  return db;
}

async function migrateFromLocalStorage(db, userId) {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      const userData = all[userId];
      const entries = userData?.entries;
      if (entries && typeof entries === 'object') {
        const rows = Object.entries(entries).map(([date, entry]) => ({
          date,
          savedAt: entry.savedAt || new Date().toISOString(),
          analysis: entry.analysis,
          mood: entry.mood,
          createdAt: entry.createdAt,
          keywords: entry.keywords ?? entry.analysis?.keywords,
        }));
        await db.entries.bulkPut(rows);
      }
    }
  } catch (e) {
    console.warn('Dexie migration skipped or failed:', e);
  } finally {
    localStorage.setItem(MIGRATION_FLAG, '1');
  }
}

function coerceKeywords(entry) {
  if (!entry) return [];
  return normalizeKeywordList(entry.keywords, entry.analysis);
}

function rowToEntry(row) {
  if (!row) return null;
  const keywords = coerceKeywords(row);
  return {
    date: row.date,
    analysis: row.analysis,
    mood: row.mood,
    createdAt: row.createdAt,
    savedAt: row.savedAt,
    keywords,
  };
}

export async function getAllJournalEntries() {
  const db = await getJournalDb();
  const rows = await db.entries.toArray();
  const out = {};
  for (const row of rows) {
    out[row.date] = rowToEntry(row);
  }
  return out;
}

export async function saveJournalEntry(date, entry) {
  const db = await getJournalDb();
  const existing = await db.entries.get(date);
  if (existing) {
    throw new Error('A journal entry already exists for this day.');
  }
  const keywords = coerceKeywords(entry);
  await db.entries.put({
    date,
    savedAt: new Date().toISOString(),
    analysis: entry.analysis,
    mood: entry.mood,
    keywords,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
}

/** Remove a saved journal row for this calendar day (primary key = date string). */
export async function deleteJournalEntry(date) {
  const db = await getJournalDb();
  await db.entries.delete(date);
}

export async function saveMoodEntry(date, mood) {
  const db = await getJournalDb();
  const existing = await db.entries.get(date);
  if (existing) {
    await db.entries.update(date, { mood, savedAt: new Date().toISOString() });
  }
  /* Do not insert mood-only rows — resonance is only stored for real journal entries. */
}

export async function getMoodData() {
  const entries = await getAllJournalEntries();
  const moods = {};
  for (const [date, e] of Object.entries(entries)) {
    if (e?.mood) moods[date] = e.mood;
  }
  return moods;
}
