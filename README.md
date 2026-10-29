# Murmur — AI voice journaling (Flask backend + React frontend)

Flask API that transcribes voice with **OpenAI Whisper** (Python package) and analyzes journal text with the LLM you choose (**Gemini, Claude, or OpenAI**). A Vite/React app in `frontend/` talks to this server.

## Features

- **Audio**: Common formats (WAV, MP3, FLAC, M4A, OGG, WebM) with validation and size limits
- **Speech-to-text**: Local transcription via `openai-whisper` (model name from env, e.g. `small.en`)
- **AI analysis**: Structured summaries, feelings, key thoughts, and **murmurings** (warm, human follow-up) via your chosen model
- **Health & errors**: Health check, logging, configurable LLM HTTP timeouts

## Architecture

```
Murmur/
├── app/                    # Flask app (routes, CORS)
├── config/settings.py      # Environment-based config
├── services/
│   ├── audio_service.py    # Whisper transcription
│   └── llm_service.py      # LLM analysis / ask / key verify
├── utils/                  # Validators, API response helpers
├── frontend/               # Vite + React UI
├── run.py                  # Entry point
├── requirements.txt
└── .env.example            # Copy to .env
```

## Quick start

### Prerequisites

- **Python 3.11+**
- **FFmpeg** (required by Whisper for decoding many audio formats)
- **An API key** from Google (Gemini), Anthropic (Claude) or OpenAI, plus a model name — entered in the app's Settings

### Backend

```bash
git clone <repository-url>
cd Murmur
python -m venv venv
# Windows: venv\Scripts\activate
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — optionally set LLM_API_KEY and LLM_MODEL (otherwise users enter them in Settings)
python run.py
```

API base URL defaults to `http://127.0.0.1:5001`.

### Frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Point the UI at the same host/port as the API, or set `MURMUR_CORS_ORIGINS` in `.env` to your dev origin (e.g. `http://localhost:5173`).

## Environment variables

Copy `.env.example` to `.env`. Common options:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_KEY` | Server-side key. Optional if the client sends `X-Llm-Api-Key` | — |
| `LLM_MODEL` | Server-side default model (e.g. `claude-sonnet-5-5`). Optional if the client sends `X-Llm-Model` | — |
| `LLM_HTTP_TIMEOUT` | Per-request LLM HTTP timeout (seconds) | `120` |
| `WHISPER_MODEL_NAME` | Whisper checkpoint (`tiny`, `base`, `small.en`, etc.) | `small.en` |
| `MAX_TEXT_LENGTH` | Max characters for text analysis / ask | `50000` |
| `MAX_JOURNAL_CONTEXT_LENGTH` | Max chars for journal context in ask | `120000` |
| `HOST` | Bind address | `127.0.0.1` |
| `PORT` | Port | `5001` |
| `MURMUR_CORS_ORIGINS` | Comma-separated allowed origins | `*` (dev) |

See `.env.example` for optional API gate (`MURMUR_API_SECRET`), upload limits, and production notes.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health` | Health and Gemini status |
| `GET` | `/api/v1/info` | API metadata |
| `POST` | `/api/v1/journal/transcript-only` | Multipart audio → transcript only |
| `POST` | `/api/v1/journal/analyze` | Multipart audio → transcript + Gemini analysis |
| `POST` | `/api/v1/journal/analyze-text` | JSON `{ "text": "..." }` → analysis (no audio) |
| `POST` | `/api/v1/journal/ask` | Question over journal context (JSON) |
| `POST` | `/api/v1/journal/verify-key` | Verify key + model (headers `X-Llm-Api-Key`, `X-Llm-Model`) |

For `analyze-text`, `analyze`, `ask`, and `verify-key`, the client may send **`X-Llm-Api-Key`** and **`X-Llm-Model`** when no server `LLM_API_KEY`/`LLM_MODEL` is configured.

### Example: analysis shape (truncated)

```json
{
  "success": true,
  "data": {
    "transcript": "…",
    "analysis": {
      "summary": {
        "key_points": [
          "First-person bullet about what I shared…",
          "…"
        ]
      },
      "emotional_feedback": {
        "key_thoughts": "Second-person reflection grounded in my words…",
        "feelings": "Short paragraph acknowledging how I seem to feel…",
        "murmurings": "2–3 short paragraphs; warm, specific, human follow-up…",
        "mood": "ease | calm | tension"
      },
      "keywords": ["…", "…"]
    }
  }
}
```

## Manual checks

```bash
curl http://127.0.0.1:5001/api/v1/health

curl -X POST http://127.0.0.1:5001/api/v1/journal/analyze \
  -H "X-Llm-Api-Key: YOUR_KEY" \
  -F "audio=@recording.wav"
```

## Troubleshooting

**Gemini “not initialized” or 401 on analysis**  
Set `LLM_API_KEY` in `.env` or send a valid `X-Llm-Api-Key` from the client.

**Analysis never finishes or times out**  
The server enforces **`LLM_HTTP_TIMEOUT`** (default 120s) on each Gemini call. Slow networks, VPNs, or firewalls blocking Google APIs can cause timeouts—increase the value (e.g. `240`) or fix connectivity.

**Harmless stderr lines (ALTS / absl)**  
Messages such as `ALTS creds ignored` or absl logging warnings come from Google’s gRPC stack when not running on Google Cloud. They are not Murmur errors.

**Transcription fails**  
Install **FFmpeg** and ensure `openai-whisper` loaded the model (see server logs on startup).

**Whisper model load errors**  
Use a valid `WHISPER_MODEL_NAME` and enough RAM/VRAM for that checkpoint.

## Development

- Add routes in `app/routes.py`, logic in `services/`, config in `config/settings.py`.
- The `google-generativeai` package is deprecated by Google in favor of `google-genai`; migration is optional for now but planned upstream.

## License

MIT. See `LICENSE` if present.

## Contributing

Fork, branch, open a PR with a clear description of behavior and any new env vars.

---

Built for thoughtful voice journaling.
