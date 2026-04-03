# Security posture & threat notes

This document describes **what Murmur does not guarantee**, known **residual risks**, and **how to harden** deployments. It is not a certification or audit report.

## What is *not* fully "safe"

1. **Gemini API key on the client**  
   The browser sends `X-Gemini-Api-Key` to your backend so Google can be called. Anyone who can read **network traffic** (no TLS), **browser DevTools → Network**, **malicious extensions**, or **malware on the device** can see that header. **Mitigation:** use **HTTPS** in production; prefer **server-only** `GEMINI_API_KEY` and **do not** send client keys (requires product changes).

2. **Secrets in the frontend bundle**  
   Any `VITE_*` variable is **embedded in built JavaScript**. Treat **`VITE_MURMUR_API_KEY`** as **public** if someone can download your static assets. The optional Murmur gate is mainly for **casual abuse** and **same-origin** scenarios, not hiding a secret from a determined attacker with your JS.

3. **AES "encryption" of the Gemini key in the browser**  
   The key used for AES-GCM is stored in **localStorage** (`murmur-aes-device-v1`). **Same-origin code** (including **XSS**) can read it and decrypt the stored key. This protects **casual inspection** of `localStorage`, not a compromised renderer.

4. **IndexedDB / localStorage**  
   Journal analysis data is **local** to the browser profile. It is not encrypted at rest by default. **Physical access** or **backup theft** can expose it.

## Controls in place

### Network & transport
- **Strict-Transport-Security** (HSTS) header sent when `DEBUG` is off, enforcing HTTPS for 1 year.
- **CORS** configurable via `MURMUR_CORS_ORIGINS`. Defaults to `http://localhost:5173` for dev; production config warns if wildcard `*` is detected.

### Authentication
- Optional **Murmur service token** (`MURMUR_API_SECRET` or `MURMUR_API_SECRET_SHA256`) with **constant-time** comparison.
- Health endpoint optionally gated via `MURMUR_PROTECT_HEALTH`.

### Headers (defence-in-depth)
- `Content-Security-Policy` — restricts script/style/font/img/connect sources, blocks framing.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` — disables camera, microphone, geolocation on API responses.
- `Cache-Control: no-store` on all `/api/` paths.

### Input validation
- Audio uploads validated by **file extension** and **magic-byte** header inspection.
- File names sanitised via Werkzeug `secure_filename` and truncated to 255 chars.
- JSON text endpoints enforce **`MAX_TEXT_LENGTH`** (default 50 000 chars) and **`MAX_JOURNAL_CONTEXT_LENGTH`** (default 120 000 chars).
- `MAX_CONTENT_LENGTH` (16 MB) caps multipart uploads at the Flask level.

### Rate limiting
- **Flask-Limiter** integration (120 requests/minute per IP, in-memory). Falls back gracefully if the package is not installed.

### Error handling
- Client-facing error responses use **generic messages**; raw exception details are logged server-side only.
- Gemini SDK exceptions are classified and mapped to safe user messages.
- Fallback analysis no longer leaks raw model output.

### Logging
- Werkzeug access log filter **redacts** lines mentioning sensitive headers (`X-Gemini-Api-Key`, `Authorization`, `X-Murmur-Api-Key`).
- Transcript content is **not logged** at INFO level; only lengths are recorded.
- Health endpoint avoids leaking Gemini exception strings when `DEBUG` is off.

### Configuration safety
- `SECRET_KEY` auto-generates a random value in dev; **required** in production config (app refuses to start without it).
- `HOST` defaults to `127.0.0.1` (loopback only), not `0.0.0.0`.
- Production source maps are disabled in Vite builds.

## Production checklist

- [ ] **HTTPS** everywhere (TLS termination at reverse proxy or host).
- [ ] **`FLASK_ENV=production`** — this enforces `SECRET_KEY` and disables debug.
- [ ] Set a **strong `SECRET_KEY`**: `python -c "import secrets; print(secrets.token_hex(32))"`.
- [ ] Set **`MURMUR_CORS_ORIGINS`** to your frontend origin(s), not `*`.
- [ ] Set **`MURMUR_API_SECRET`** or **`MURMUR_API_SECRET_SHA256`** and matching client config.
- [ ] Prefer **`GEMINI_API_KEY`** server-side only; stop sending client keys if possible.
- [ ] Use a **production WSGI server** — `gunicorn` (Linux/macOS) or `waitress` (Windows).
- [ ] Install **`Flask-Limiter`** (`pip install Flask-Limiter`). Adjust limits via env vars or code.
- [ ] Run behind a **reverse proxy** (nginx, Caddy) with TLS; do not expose Flask directly.
- [ ] Review and tighten the **Content-Security-Policy** header for your deployment.
- [ ] Enable **monitoring** (4xx/5xx rates, latency, Gemini quota) and **alerting**.
