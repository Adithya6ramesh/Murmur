"""
Validation utilities for Murmur API
"""
import os
from werkzeug.utils import secure_filename

ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm'}

def allowed_audio_file(filename):
    """
    Check if the uploaded file has an allowed audio extension
    
    Args:
        filename (str): The filename to check
        
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

def validate_file_size(file, max_size_mb=16):
    """
    Validate file size
    
    Args:
        file: The uploaded file object
        max_size_mb (int): Maximum file size in MB
        
    Returns:
        bool: True if file size is within limits
    """
    if file:
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        return file_size <= max_size_mb * 1024 * 1024
    return False

def sanitize_filename(filename):
    """
    Sanitize filename for safe storage
    
    Args:
        filename (str): Original filename
        
    Returns:
        str: Sanitized filename
    """
    return secure_filename(filename)

def validate_audio_upload(file):
    """
    Comprehensive validation for audio file uploads
    
    Args:
        file: The uploaded file object
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    if not allowed_audio_file(file.filename):
        return False, f"File type not allowed. Supported formats: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
    
    if not validate_file_size(file):
        return False, "File size exceeds 16MB limit"
    
    return True, None