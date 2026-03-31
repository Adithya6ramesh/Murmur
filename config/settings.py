"""
Configuration settings for Murmur AI Voice Journaling App
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16777216))  # 16MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Gemini API Configuration (server-side only; never log or return to clients)
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

    # Optional Murmur API service token — if set, clients must send
    # Authorization: Bearer <token> or X-Murmur-Api-Key: <token>
    # Prefer MURMUR_API_SECRET_SHA256 (sha256 hex of the token) so the env file need not hold the raw token.
    MURMUR_API_SECRET = os.environ.get('MURMUR_API_SECRET') or ''
    MURMUR_API_SECRET_SHA256 = os.environ.get('MURMUR_API_SECRET_SHA256') or ''
    MURMUR_PROTECT_HEALTH = os.environ.get('MURMUR_PROTECT_HEALTH', '').lower() in ('1', 'true', 'yes')
    # Comma-separated list of allowed browser origins for CORS (e.g. https://app.example.com).
    # Use * only for local dev; in production set explicit origins.
    MURMUR_CORS_ORIGINS = os.environ.get('MURMUR_CORS_ORIGINS', '*')
    
    # Whisper Configuration
    WHISPER_MODEL_PATH = os.environ.get('WHISPER_MODEL_PATH', './models/ggml-base.bin')
    WHISPER_EXECUTABLE_PATH = os.environ.get('WHISPER_EXECUTABLE_PATH', './whisper.cpp/main')
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = 'production'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}