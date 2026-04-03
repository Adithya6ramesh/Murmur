"""
API hardening: optional Murmur service token, safe comparisons, security headers,
and no secret leakage in logs or responses.
"""
import hashlib
import hmac
import logging
import re

from flask import current_app, request

from utils.responses import error_response

logger = logging.getLogger(__name__)

_SENSITIVE_HEADERS = (
    "x-gemini-api-key",
    "authorization",
    "x-murmur-api-key",
)


def _get_client_murmur_token() -> str:
    auth = request.headers.get("Authorization", "") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return (request.headers.get("X-Murmur-Api-Key") or "").strip()


def _verify_murmur_token(token: str) -> bool:
    """Constant-time compare; supports plain secret or SHA-256 of secret in env."""
    if not token:
        return False

    sha_hex = (current_app.config.get("MURMUR_API_SECRET_SHA256") or "").strip().lower()
    if sha_hex:
        if len(sha_hex) != 64 or not re.match(r"^[0-9a-f]+$", sha_hex):
            logger.error("MURMUR_API_SECRET_SHA256 must be 64 hex characters")
            return False
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return hmac.compare_digest(digest.encode("ascii"), sha_hex.encode("ascii"))

    secret = (current_app.config.get("MURMUR_API_SECRET") or "").strip()
    if not secret:
        return False
    if len(token) != len(secret):
        return False
    return hmac.compare_digest(token.encode("utf-8"), secret.encode("utf-8"))


def murmur_auth_configured() -> bool:
    return bool(
        (current_app.config.get("MURMUR_API_SECRET") or "").strip()
        or (current_app.config.get("MURMUR_API_SECRET_SHA256") or "").strip()
    )


def enforce_murmur_api_guard():
    """
    When MURMUR_API_SECRET or MURMUR_API_SECRET_SHA256 is set, require a matching
    Bearer / X-Murmur-Api-Key on API routes (except OPTIONS and optionally /health).
    """
    if request.method == "OPTIONS":
        return None
    if not murmur_auth_configured():
        return None

    path = request.path or ""
    if path.endswith("/health") and not current_app.config.get("MURMUR_PROTECT_HEALTH"):
        return None

    token = _get_client_murmur_token()
    if not _verify_murmur_token(token):
        logger.warning("Murmur API rejected request (missing or invalid service token)")
        return error_response("Unauthorized", 401, "UNAUTHORIZED")

    return None


def add_security_headers(response):
    """Defence-in-depth response headers for XSS, clickjacking, MIME sniffing, and transport."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )

    if not current_app.debug:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def redact_sensitive_text(text: str, max_len: int = 200) -> str:
    """Truncate for logs; never use for crypto."""
    if not text:
        return ""
    t = str(text).replace("\n", " ")
    if len(t) > max_len:
        return t[:max_len] + "…"
    return t


def install_request_log_filter():
    """Strip sensitive headers from Werkzeug access log lines if they appear."""
    class _RedactFilter(logging.Filter):
        def filter(self, record):
            try:
                msg = record.getMessage()
                for h in _SENSITIVE_HEADERS:
                    if h.lower() in msg.lower():
                        record.msg = "[REDACTED: request contained sensitive header]"
                        record.args = ()
                        break
            except Exception:
                pass
            return True

    for name in ("werkzeug", "werkzeug.serving"):
        logging.getLogger(name).addFilter(_RedactFilter())
