#!/usr/bin/env python3
"""
Murmur AI Voice Journaling App - Application Entry Point
"""
import os
from app import create_app
from config.settings import Config

def main():
    """Main application entry point"""
    # Create Flask app
    app = create_app()
    
    # Get configuration
    host = Config.HOST
    port = Config.PORT
    debug = app.config.get('DEBUG', False)
    
    print(f"""
[MURMUR] AI Voice Journaling App
[SERVER] Starting on http://{host}:{port}
[ENV] Environment: {os.environ.get('FLASK_ENV', 'development')}
[DEBUG] Debug mode: {debug}

[ENDPOINTS] Available endpoints:
   GET  /api/v1/health          - Health check
   GET  /api/v1/info            - API information
   POST /api/v1/journal/analyze - Full voice journal analysis
   POST /api/v1/journal/transcript-only - Transcription only

[READY] Ready to process voice journals!
    """)
    
    # Run the application
    app.run(
        host=host,
        port=port,
        debug=debug,
        threaded=True
    )

if __name__ == '__main__':
    main()