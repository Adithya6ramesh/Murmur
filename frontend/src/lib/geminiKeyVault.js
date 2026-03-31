/**
 * Stores the Gemini API key encrypted at rest (AES-GCM).
 * The key is never written to localStorage in plaintext and is not exposed via loadUserSettings().
 * A device-bound secret protects the ciphertext (same threat model as any local-only secret).
 */

const DEVICE_KEY_STORAGE = 'murmur-aes-device-v1';

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

async function getDeviceAesKey() {
  let b64 = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_KEY_STORAGE) : null;
  if (!b64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    b64 = toB64(raw.buffer);
    localStorage.setItem(DEVICE_KEY_STORAGE, b64);
  }
  const rawKey = fromB64(b64);
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * @param {string} plaintext
 * @returns {Promise<string>} v1:ivB64:cipherB64 (single string, no secrets in structure alone)
 */
export async function encryptGeminiKeyPlaintext(plaintext) {
  const key = await getDeviceAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return `v1:${toB64(iv.buffer)}:${toB64(ct)}`;
}

/**
 * @param {string} blob
 * @returns {Promise<string>}
 */
export async function decryptGeminiKeyBlob(blob) {
  if (!blob || typeof blob !== 'string') return '';
  const parts = blob.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') return '';
  const iv = fromB64(parts[1]);
  const ct = fromB64(parts[2]);
  const key = await getDeviceAesKey();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
