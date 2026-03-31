# Security posture & threat notes

This document describes **what Murmur does not guarantee**, known **residual risks**, and **how to harden** deployments. It is not a certification or audit report.

## What is *not* fully “safe”

1. **Gemini API key on the client**  
   The browser sends `X-Gemini-Api-Key` to your backend so Google can be called. Anyone who can read **network traffic** (no TLS), **browser DevTools → Network**, **malicious extensions**, or **malware on the device** can see that header. **Mitigation:** use **HTTPS** in production; prefer **server-only** `GEMINI_API_KEY` and **do not** send client keys (requires product changes).

2. **Secrets in the frontend bundle**  
   Any `VITE_*` variable is **embedded in built JavaScript**. Treat **`VITE_MURMUR_API_KEY`** as **public** if someone can download your static assets. The optional Murmur gate is mainly for **casual abuse** and **same-origin** scenarios, not hiding a secret from a determined attacker with your JS.

3. **AES “encryption” of the Gemini key in the browser**  
   The key used for AES-GCM is stored in **localStorage** (`murmur-aes-device-v1`). **Same-origin code** (including **XSS**) can read it and decrypt the stored key. This protects **casual inspection** of `localStorage`, not a compromised renderer.

4. **IndexedDB / localStorage**  
   Journal analysis data is **local** to the browser profile. It is not encrypted at rest by default. **Physical access** or **backup theft** can expose it.

5. **CORS `*`**  
   Default `MURMUR_CORS_ORIGINS=*` allows any origin to read API responses from browsers that can reach your API. For **public** deployments, set **`MURMUR_CORS_ORIGINS`** to your real app origins (comma-separated).

6. **No rate limiting**  
   Endpoints can be **abused** for cost (Gemini) or **DoS**. Add a reverse proxy or `Flask-Limiter` in production.

7. **File uploads**  
   Extensions are checked; **content** is not cryptographically verified. Malicious or polyglot files are a **defense-in-depth** concern for the host running Whisper.

8. **Error bodies**  
   Some failures may return **provider error text** to the client. Prefer generic messages in production if you see leakage.

## Controls that *are* in place

- Optional **Murmur service token** (`MURMUR_API_SECRET` or `MURMUR_API_SECRET_SHA256`) with **constant-time** comparison for the plain secret path.
- **Security headers** on responses (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store` on `/api/`).
- **Health** JSON avoids raw Gemini exception strings when `DEBUG` is off.
- **Gemini logs** avoid writing user journal text at INFO; snippets only at DEBUG.
- **Werkzeug** log filter attempts to redact lines that mention sensitive header names.
- **CORS** configurable via **`MURMUR_CORS_ORIGINS`**.

## Production checklist (short)

- [ ] **HTTPS** everywhere (TLS termination at reverse proxy or host).
- [ ] **`FLASK_ENV=production`**, **`DEBUG=False`**, strong **`SECRET_KEY`**.
- [ ] Set **`MURMUR_CORS_ORIGINS`** to your frontend origin(s), not `*`.
- [ ] Set **`MURMUR_API_SECRET`** or **`MURMUR_API_SECRET_SHA256`** and matching client config; understand **`VITE_MURMUR_API_KEY`** is still visible in JS.
- [ ] Prefer **`GEMINI_API_KEY`** only on the server and stop sending client Gemini keys (architecture change).
- [ ] Add **rate limiting** and **monitoring** (4xx/5xx, latency, Gemini quota).
- [ ] Run behind a **firewall**; do not expose the Flask port to the public internet without a reverse proxy and TLS.
