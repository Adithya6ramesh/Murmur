"""
Configuration settings for Murmur AI Voice Journaling App
"""
import logging
import os
import secrets

from dotenv import load_dotenv

load_dotenv()

_log = logging.getLogger(__name__)


class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16777216))  # 16MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')

    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

    MURMUR_API_SECRET = os.environ.get('MURMUR_API_SECRET') or ''
    MURMUR_API_SECRET_SHA256 = os.environ.get('MURMUR_API_SECRET_SHA256') or ''
    MURMUR_PROTECT_HEALTH = os.environ.get('MURMUR_PROTECT_HEALTH', '').lower() in ('1', 'true', 'yes')
    MURMUR_CORS_ORIGINS = os.environ.get('MURMUR_CORS_ORIGINS', '*')

    WHISPER_MODEL_PATH = os.environ.get('WHISPER_MODEL_PATH', './models/ggml-base.bin')
    WHISPER_EXECUTABLE_PATH = os.environ.get('WHISPER_EXECUTABLE_PATH', './whisper.cpp/main')

    MAX_TEXT_LENGTH = int(os.environ.get('MAX_TEXT_LENGTH', 50_000))
    MAX_JOURNAL_CONTEXT_LENGTH = int(os.environ.get('MAX_JOURNAL_CONTEXT_LENGTH', 120_000))

    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', 5000))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration — enforces secure defaults at startup."""
    DEBUG = False
    MURMUR_CORS_ORIGINS = os.environ.get('MURMUR_CORS_ORIGINS', '')

    @classmethod
    def validate(cls):
        if not os.environ.get('SECRET_KEY', '').strip():
            raise RuntimeError(
                "SECRET_KEY is required in production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if cls.MURMUR_CORS_ORIGINS.strip() in ('*', ''):
            _log.warning(
                "MURMUR_CORS_ORIGINS is wildcard or empty in production. "
                "Set it to your frontend origin(s) to prevent cross-origin abuse."
            )


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}