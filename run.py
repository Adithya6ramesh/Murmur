#!/usr/bin/env python3
"""
Murmur AI Voice Journaling App - Application Entry Point

For production deployments use a proper WSGI server:
  Linux/macOS:  gunicorn -w 4 -b 0.0.0.0:5001 "app:create_app('production')"
  Windows:      waitress-serve --host=0.0.0.0 --port=5001 --call "app:create_app"
"""
import os
import sys
from app import create_app
from config.settings import Config


def main():
    app = create_app()

    host = Config.HOST
    port = Config.PORT
    debug = app.config.get('DEBUG', False)
    env = os.environ.get('FLASK_ENV', 'development')

    print(f"""
[MURMUR] AI Voice Journaling App
[SERVER] Starting on http://{host}:{port}
[ENV]    {env}  |  DEBUG={debug}

[ENDPOINTS]
   GET  /api/v1/health               Health check
   GET  /api/v1/info                  API information
   POST /api/v1/journal/analyze       Full voice journal analysis
   POST /api/v1/journal/analyze-text  Text-only analysis
   POST /api/v1/journal/ask           Ask over journal context
   POST /api/v1/journal/transcript-only  Transcription only
    """)

    if env == 'production' or not debug:
        print(
            "[WARNING] You are using the Flask development server.\n"
            "          For production, use gunicorn (Linux/macOS) or waitress (Windows):\n"
            '          gunicorn -w 4 -b 0.0.0.0:5001 "app:create_app(\'production\')"\n'
            '          waitress-serve --host=0.0.0.0 --port=5001 --call "app:create_app"\n',
            file=sys.stderr,
        )

    app.run(
        host=host,
        port=port,
        debug=debug,
        threaded=True,
    )


if __name__ == '__main__':
    main()