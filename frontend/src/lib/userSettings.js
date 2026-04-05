import { decryptGeminiKeyBlob, encryptGeminiKeyPlaintext } from './geminiKeyVault.js';

const STORAGE_KEY = 'murmur-user-settings';

const DEFAULTS = {
  displayName: '',
  email: '',
  geminiKeyEnc: '',
  geminiKeyHint: '',
};

function readStoredObject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Plaintext Gemini key must never be returned to React — only presence + optional last-4 hint.
 */
export function loadUserSettings() {
  const stored = readStoredObject();
  const { geminiApiKey: _legacyDrop, geminiKeyEnc: _encDrop, ...rest } = stored;
  const legacyPlain = typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey.trim() : '';
  const geminiKeyPresent = Boolean(stored.geminiKeyEnc) || Boolean(legacyPlain);

  return {
    ...DEFAULTS,
    ...rest,
    geminiApiKey: undefined,
    geminiKeyEnc: undefined,
    geminiKeyPresent,
    geminiKeyHint: stored.geminiKeyHint || '',
  };
}

export function saveUserSettings(updates) {
  const stored = readStoredObject();
  const next = { ...DEFAULTS, ...stored, ...updates };
  delete next.geminiApiKey;
  delete next.geminiKeyPresent;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return loadUserSettings();
}

export async function migrateLegacyGeminiKeyToEncrypted() {
  const stored = readStoredObject();
  const legacy = typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey.trim() : '';
  if (!legacy || stored.geminiKeyEnc) {
    if (stored.geminiApiKey !== undefined) {
      const cleaned = { ...stored };
      delete cleaned.geminiApiKey;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...cleaned }));
    }
    return;
  }
  const enc = await encryptGeminiKeyPlaintext(legacy);
  const cleaned = { ...stored, geminiKeyEnc: enc, geminiKeyHint: legacy.slice(-4) };
  delete cleaned.geminiApiKey;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...cleaned }));
}

/** Sync check for gating navigation (no decryption). */
export function hasGeminiKeySync() {
  const s = readStoredObject();
  const legacy = typeof s.geminiApiKey === 'string' ? s.geminiApiKey.trim() : '';
  return Boolean(s.geminiKeyEnc) || Boolean(legacy);
}

/**
 * Decrypt key only when sending to the backend. Never log or place in React state.
 */
export async function getGeminiApiKeyForRequest() {
  await migrateLegacyGeminiKeyToEncrypted();
  const s = readStoredObject();
  if (s.geminiKeyEnc) {
    return decryptGeminiKeyBlob(s.geminiKeyEnc);
  }
  const legacy = typeof s.geminiApiKey === 'string' ? s.geminiApiKey.trim() : '';
  return legacy;
}

export async function persistGeminiApiKey(plaintext) {
  const t = String(plaintext || '').trim();
  if (!t) {
    const stored = readStoredObject();
    const next = { ...stored };
    delete next.geminiKeyEnc;
    delete next.geminiKeyHint;
    delete next.geminiApiKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...next }));
    return loadUserSettings();
  }
  const enc = await encryptGeminiKeyPlaintext(t);
  const next = {
    ...readStoredObject(),
    geminiKeyEnc: enc,
    geminiKeyHint: t.slice(-4),
  };
  delete next.geminiApiKey;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...next }));
  return loadUserSettings();
}
