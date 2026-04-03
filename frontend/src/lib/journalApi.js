const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE.replace(/\/$/, '')
    : 'http://127.0.0.1:5000/api/v1';

const BACKEND_HINT =
  'Start the API server from the Murmur project root: python run.py (leave that terminal open). It should listen on port 5000.';

/** Optional shared secret for the Murmur API (must match server MURMUR_API_SECRET). Never commit real values. */
function murmurServiceHeaders() {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MURMUR_API_KEY
      ? String(import.meta.env.VITE_MURMUR_API_KEY).trim()
      : '';
  if (!raw) return {};
  return { Authorization: `Bearer ${raw}` };
}

function mergeApiHeaders(base = {}) {
  return { ...base, ...murmurServiceHeaders() };
}

/** Parse JSON error body from API; falls back to raw text. */
async function readApiError(response) {
  const text = await response.text();
  try {
    const j = JSON.parse(text);
    if (j && typeof j.message === 'string') {
      return { message: j.message, errorCode: j.error_code, raw: text };
    }
  } catch {
    /* ignore */
  }
  return { message: text || `Request failed (${response.status})`, errorCode: undefined, raw: text };
}

function throwFromFailedResponse(response, { message, errorCode }, fallbackLabel) {
  if (errorCode === 'INVALID_GEMINI_API_KEY') {
    throw new Error(
      message || 'Wrong API key. Check that you copied the full key from Google AI Studio and try again.'
    );
  }
  throw new Error(message || `${fallbackLabel} (${response.status})`);
}

async function fetchBackend(url, options = {}) {
  const next = {
    ...options,
    headers: mergeApiHeaders(options.headers || {}),
  };
  try {
    return await fetch(url, next);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error(`Cannot reach the Murmur backend (${API_BASE}). ${BACKEND_HINT}`);
    }
    throw e;
  }
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');

  const response = await fetchBackend(`${API_BASE}/journal/transcript-only`, {
    method: 'POST',
    body: formData,
    mode: 'cors',
  });

  if (!response.ok) {
    const err = await readApiError(response);
    throwFromFailedResponse(response, err, 'Transcription failed');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Backend returned unsuccessful response');
  }
  return result.data.transcript;
}

export async function analyzeText(text, geminiApiKey) {
  const headers = mergeApiHeaders({ 'Content-Type': 'application/json' });
  if (geminiApiKey?.trim()) {
    headers['X-Gemini-Api-Key'] = geminiApiKey.trim();
  }
  const response = await fetchBackend(`${API_BASE}/journal/analyze-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await readApiError(response);
    throwFromFailedResponse(response, err, 'Failed to analyze text');
  }

  const result = await response.json();
  if (!result.success) {
    if (result.error_code === 'INVALID_GEMINI_API_KEY') {
      throw new Error(
        result.message ||
          'Wrong API key. Check that you copied the full key from Google AI Studio and try again.'
      );
    }
    throw new Error(result.message || 'Analysis failed');
  }
  return result.data.analysis;
}

export async function askJournalQuestion(question, journalContext, geminiApiKey) {
  const headers = mergeApiHeaders({ 'Content-Type': 'application/json' });
  if (geminiApiKey?.trim()) {
    headers['X-Gemini-Api-Key'] = geminiApiKey.trim();
  }
  const response = await fetchBackend(`${API_BASE}/journal/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question,
      journal_context: journalContext,
    }),
    mode: 'cors',
  });

  if (!response.ok) {
    const err = await readApiError(response);
    throwFromFailedResponse(response, err, 'Ask Murmur failed');
  }

  const result = await response.json();
  if (!result.success) {
    if (result.error_code === 'INVALID_GEMINI_API_KEY') {
      throw new Error(
        result.message ||
          'Wrong API key. Check that you copied the full key from Google AI Studio and try again.'
      );
    }
    throw new Error(result.message || 'Could not get an answer');
  }
  return result.data.answer;
}

/**
 * Calls the backend to verify the key works before saving locally.
 */
export async function verifyGeminiApiKey(geminiApiKey) {
  const headers = mergeApiHeaders({ 'Content-Type': 'application/json' });
  if (geminiApiKey?.trim()) {
    headers['X-Gemini-Api-Key'] = geminiApiKey.trim();
  }
  const response = await fetchBackend(`${API_BASE}/journal/verify-gemini-key`, {
    method: 'POST',
    headers,
    body: '{}',
    mode: 'cors',
  });
  if (!response.ok) {
    const err = await readApiError(response);
    throwFromFailedResponse(response, err, 'Could not verify API key');
  }
  const result = await response.json();
  if (!result.success) {
    if (result.error_code === 'INVALID_GEMINI_API_KEY') {
      throw new Error(
        result.message ||
          'Wrong API key. Check that you copied the full key from Google AI Studio and try again.'
      );
    }
    throw new Error(result.message || 'Could not verify API key');
  }
}
