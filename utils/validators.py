"""
Validation utilities for Murmur API
"""
import os
from werkzeug.utils import secure_filename

ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm'}

MAX_FILENAME_LENGTH = 255


def allowed_audio_file(filename):
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS


def validate_file_size(file, max_size_mb=16):
    if file:
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        return file_size <= max_size_mb * 1024 * 1024
    return False


def sanitize_filename(filename):
    safe = secure_filename(filename or "upload")
    if not safe:
        safe = "upload"
    if len(safe) > MAX_FILENAME_LENGTH:
        name, ext = os.path.splitext(safe)
        safe = name[:MAX_FILENAME_LENGTH - len(ext)] + ext
    return safe


def validate_audio_upload(file):
    """Comprehensive validation for audio file uploads."""
    if not file:
        return False, "No file provided"

    if not file.filename or file.filename.strip() == '':
        return False, "No file selected"

    if not allowed_audio_file(file.filename):
        return False, f"File type not allowed. Supported formats: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}"

    if not validate_file_size(file):
        return False, "File size exceeds 16 MB limit"

    return True, None