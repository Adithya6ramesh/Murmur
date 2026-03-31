"""
Murmur AI Voice Journaling App - Flask Application Factory
"""
import os
import logging
from flask import Flask
from flask_cors import CORS
from config.settings import config

def create_app(config_name=None):
    """
    Application factory pattern for creating Flask app instances
    
    Args:
        config_name (str): Configuration environment name
        
    Returns:
        Flask: Configured Flask application instance
    """
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    
    # CORS: default * for dev; set MURMUR_CORS_ORIGINS=https://yourapp.com,http://localhost:5173 in production
    _cors = app.config.get("MURMUR_CORS_ORIGINS", "*")
    if isinstance(_cors, str) and _cors.strip() == "*":
        _cors_origins = "*"
    elif isinstance(_cors, str):
        _cors_origins = [o.strip() for o in _cors.split(",") if o.strip()]
    else:
        _cors_origins = "*"

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
    
    # Configure logging
    setup_logging(app)

    from app.security import add_security_headers, install_request_log_filter

    install_request_log_filter()
    app.after_request(add_security_headers)
    
    # Create upload directory
    upload_dir = app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    
    # Add root route
    @app.route('/')
    def index():
        """Root endpoint with API information"""
        from utils.responses import success_response
        return success_response({
            "name": "Murmur AI Voice Journaling API",
            "version": "1.0.0",
            "description": "AI-powered voice journaling with emotional analysis",
            "status": "running",
            "endpoints": {
                "GET /api/v1/health": "Health check",
                "GET /api/v1/info": "API information",
                "POST /api/v1/journal/analyze": "Full voice journal analysis",
                "POST /api/v1/journal/transcript-only": "Audio transcription only"
            },
            "documentation": "Visit /api/v1/info for detailed API information"
        }, "Murmur API is running successfully")
    
    # Register error handlers
    register_error_handlers(app)
    
    return app

def setup_logging(app):
    """Configure application logging"""
    if not app.debug and not app.testing:
        # Production logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )
    else:
        # Development logging
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )

def register_error_handlers(app):
    """Register global error handlers"""
    from utils.responses import error_response
    
    @app.errorhandler(404)
    def not_found(error):
        return error_response("Endpoint not found", 404, "NOT_FOUND")
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return error_response("Method not allowed", 405, "METHOD_NOT_ALLOWED")
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return error_response("File too large", 413, "FILE_TOO_LARGE")
    
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f"Internal server error: {str(error)}")
        return error_response("Internal server error", 500, "INTERNAL_ERROR")