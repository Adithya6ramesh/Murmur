"""
Murmur AI Voice Journaling App - Flask Application Factory
"""
import os
import logging
from flask import Flask
from flask_cors import CORS
from config.settings import config

logger = logging.getLogger(__name__)


def create_app(config_name=None):
    """Application factory pattern for creating Flask app instances."""
    app = Flask(__name__)

    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    cfg_cls = config[config_name]
    app.config.from_object(cfg_cls)

    if hasattr(cfg_cls, 'validate'):
        cfg_cls.validate()

    _cors = app.config.get("MURMUR_CORS_ORIGINS", "*")
    if isinstance(_cors, str) and _cors.strip() in ("*", ""):
        _cors_origins = "*"
    elif isinstance(_cors, str):
        _cors_origins = [o.strip() for o in _cors.split(",") if o.strip()]
    else:
        _cors_origins = "*"

    if _cors_origins == "*" and not app.debug:
        logger.warning(
            "CORS is set to wildcard (*) in a non-debug environment. "
            "Set MURMUR_CORS_ORIGINS to your frontend origin(s)."
        )

    CORS(
        app,
        origins=_cors_origins,
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "X-Gemini-Api-Key",
            "Authorization",
            "X-Murmur-Api-Key",
        ],
    )

    setup_logging(app)

    from app.security import add_security_headers, install_request_log_filter

    install_request_log_filter()
    app.after_request(add_security_headers)

    upload_dir = app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    _setup_rate_limiter(app)

    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')

    @app.route('/')
    def index():
        from utils.responses import success_response
        return success_response({
            "name": "Murmur AI Voice Journaling API",
            "version": "1.0.0",
            "status": "running",
            "documentation": "Visit /api/v1/info for detailed API information"
        }, "Murmur API is running")

    register_error_handlers(app)

    return app


def _setup_rate_limiter(app):
    """Attach Flask-Limiter if installed; silently skip otherwise."""
    try:
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address

        limiter = Limiter(
            get_remote_address,
            app=app,
            default_limits=["120 per minute"],
            storage_uri="memory://",
        )
        app.extensions["limiter"] = limiter
        logger.info("Rate limiter active (120 req/min default)")
    except ImportError:
        logger.warning(
            "flask-limiter not installed — no rate limiting active. "
            "Install it for production: pip install Flask-Limiter"
        )


def setup_logging(app):
    """Configure application logging."""
    fmt = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    if not app.debug and not app.testing:
        logging.basicConfig(level=logging.INFO, format=fmt)
    else:
        logging.basicConfig(level=logging.DEBUG, format=fmt)


def register_error_handlers(app):
    """Register global error handlers — never expose internals in production."""
    from utils.responses import error_response

    @app.errorhandler(400)
    def bad_request(error):
        return error_response("Bad request", 400, "BAD_REQUEST")

    @app.errorhandler(404)
    def not_found(error):
        return error_response("Endpoint not found", 404, "NOT_FOUND")

    @app.errorhandler(405)
    def method_not_allowed(error):
        return error_response("Method not allowed", 405, "METHOD_NOT_ALLOWED")

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return error_response("File too large", 413, "FILE_TOO_LARGE")

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return error_response("Too many requests. Please slow down.", 429, "RATE_LIMITED")

    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error("Internal server error: %s", error)
        return error_response("Internal server error", 500, "INTERNAL_ERROR")