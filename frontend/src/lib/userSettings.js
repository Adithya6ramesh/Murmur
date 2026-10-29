import { decryptApiKeyBlob, encryptApiKeyPlaintext } from './keyVault.js';

const STORAGE_KEY = 'murmur-user-settings';

const DEFAULTS = {
  displayName: '',
  email: '',
  apiKeyEnc: '',
  apiKeyHint: '',
  llmModel: '',
};

function readStoredObject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const stored = JSON.parse(raw);
    // Settings saved when Murmur was Gemini-only used geminiKey* / geminiApiKey field names.
    if (stored.geminiKeyEnc && !stored.apiKeyEnc) {
      stored.apiKeyEnc = stored.geminiKeyEnc;
      stored.apiKeyHint = stored.apiKeyHint || stored.geminiKeyHint || '';
      stored.llmModel = stored.llmModel || 'gemini-2.5-flash';
    }
    if (stored.geminiApiKey && !stored.apiKey) {
      stored.apiKey = stored.geminiApiKey;
      stored.llmModel = stored.llmModel || 'gemini-2.5-flash';
    }
    delete stored.geminiKeyEnc;
    delete stored.geminiKeyHint;
    delete stored.geminiApiKey;
    return stored;
  } catch {
    return {};
  }
}

/**
 * Plaintext API key must never be returned to React — only presence + optional last-4 hint.
 */
export function loadUserSettings() {
  const stored = readStoredObject();
  const { apiKey: _legacyDrop, apiKeyEnc: _encDrop, ...rest } = stored;
  const legacyPlain = typeof stored.apiKey === 'string' ? stored.apiKey.trim() : '';
  const apiKeyPresent = Boolean(stored.apiKeyEnc) || Boolean(legacyPlain);

  return {
    ...DEFAULTS,
    ...rest,
    apiKey: undefined,
    apiKeyEnc: undefined,
    apiKeyPresent,
    apiKeyHint: stored.apiKeyHint || '',
  };
}

export function saveUserSettings(updates) {
  const stored = readStoredObject();
  const next = { ...DEFAULTS, ...stored, ...updates };
  delete next.apiKey;
  delete next.apiKeyPresent;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return loadUserSettings();
}

export async function migrateLegacyApiKeyToEncrypted() {
  const stored = readStoredObject();
  const legacy = typeof stored.apiKey === 'string' ? stored.apiKey.trim() : '';
  if (!legacy || stored.apiKeyEnc) {
    if (stored.apiKey !== undefined) {
      const cleaned = { ...stored };
      delete cleaned.apiKey;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...cleaned }));
    }
    return;
  }
  const enc = await encryptApiKeyPlaintext(legacy);
  const cleaned = { ...stored, apiKeyEnc: enc, apiKeyHint: legacy.slice(-4) };
  delete cleaned.apiKey;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...cleaned }));
}

/** Sync check for gating navigation (no decryption). */
export function hasApiKeySync() {
  const s = readStoredObject();
  const legacy = typeof s.apiKey === 'string' ? s.apiKey.trim() : '';
  return Boolean(s.apiKeyEnc) || Boolean(legacy);
}

/**
 * Decrypt key only when sending to the backend. Never log or place in React state.
 */
export async function getApiKeyForRequest() {
  await migrateLegacyApiKeyToEncrypted();
  const s = readStoredObject();
  if (s.apiKeyEnc) {
    return decryptApiKeyBlob(s.apiKeyEnc);
  }
  const legacy = typeof s.apiKey === 'string' ? s.apiKey.trim() : '';
  return legacy;
}

export async function persistApiKey(plaintext) {
  const t = String(plaintext || '').trim();
  if (!t) {
    const stored = readStoredObject();
    const next = { ...stored };
    delete next.apiKeyEnc;
    delete next.apiKeyHint;
    delete next.apiKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...next }));
    return loadUserSettings();
  }
  const enc = await encryptApiKeyPlaintext(t);
  const next = {
    ...readStoredObject(),
    apiKeyEnc: enc,
    apiKeyHint: t.slice(-4),
  };
  delete next.apiKey;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...next }));
  return loadUserSettings();
}

/** Model name the user picked (not secret, so it lives in plain settings). */
export function getModelForRequest() {
  return String(readStoredObject().llmModel || '').trim();
}
