"""
Audio processing service using OpenAI Whisper for speech-to-text conversion
"""
import os
import logging
import uuid
from pathlib import Path

from config.settings import Config

logger = logging.getLogger(__name__)

# Magic bytes for supported audio formats
_AUDIO_MAGIC = {
    b'RIFF': 'wav',
    b'\xff\xfb': 'mp3',
    b'\xff\xf3': 'mp3',
    b'\xff\xf2': 'mp3',
    b'ID3': 'mp3',
    b'fLaC': 'flac',
    b'OggS': 'ogg',
    b'\x1aE\xdf\xa3': 'webm',
}


def _looks_like_audio(file_path: str) -> bool:
    """Read first bytes and verify they match a known audio signature."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(12)
        if len(header) < 4:
            return False
        for magic in _AUDIO_MAGIC:
            if header[:len(magic)] == magic:
                return True
        # M4A / MP4 containers: check for 'ftyp' box at offset 4
        if header[4:8] == b'ftyp':
            return True
        return False
    except OSError:
        return False


class AudioService:
    """Service for handling audio file processing and transcription"""

    def __init__(self):
        self.whisper_model = None
        self._initialize_whisper()

    def _initialize_whisper(self):
        try:
            import whisper
            name = (Config.WHISPER_MODEL_NAME or "small.en").strip()
            logger.info("Loading Whisper model: %s", name)
            self.whisper_model = whisper.load_model(name)
            logger.info("OpenAI Whisper model loaded successfully (%s)", name)
        except ImportError:
            logger.error("openai-whisper not installed. pip install openai-whisper")
            self.whisper_model = None
        except Exception as e:
            logger.error("Failed to load Whisper model: %s", e)
            if "ffmpeg" in str(e).lower():
                logger.error("FFmpeg appears to be missing. Install FFmpeg and restart.")
            self.whisper_model = None

    def transcribe_audio(self, audio_file_path):
        try:
            if self.whisper_model is None:
                logger.info("Whisper model not loaded, attempting to reinitialize")
                self._initialize_whisper()
                if self.whisper_model is None:
                    return False, "Speech-to-text engine not available. Contact the server administrator."

            if not os.path.exists(audio_file_path):
                return False, "Audio file could not be read"

            file_size = os.path.getsize(audio_file_path)
            if file_size == 0:
                return False, "Audio file is empty"

            if not _looks_like_audio(audio_file_path):
                return False, "Uploaded file does not appear to contain valid audio data"

            logger.info("Starting transcription (size=%d bytes)", file_size)

            result = self.whisper_model.transcribe(audio_file_path)
            transcription = result.get("text", "").strip()

            if not transcription:
                return False, "No speech detected — audio may be silent or corrupted"

            logger.info("Transcription completed (%d characters)", len(transcription))
            return True, transcription

        except Exception as e:
            logger.error("Transcription error: %s", e)
            msg = str(e).lower()
            if "ffmpeg" in msg or "file specified" in msg:
                return False, "A required system component (FFmpeg) is missing on the server."
            return False, "Transcription failed. Please try a different recording."

    def save_uploaded_file(self, file, upload_folder):
        try:
            Path(upload_folder).mkdir(parents=True, exist_ok=True)

            from utils.validators import sanitize_filename

            original_filename = sanitize_filename(file.filename)
            _name, ext = os.path.splitext(original_filename)
            unique_filename = f"{uuid.uuid4().hex}{ext}"

            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)

            logger.info("File saved (%s)", unique_filename)
            return True, file_path

        except Exception as e:
            logger.error("File save error: %s", e)
            return False, "Failed to save uploaded file"

    def cleanup_file(self, file_path):
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug("Cleaned up temp file")
        except Exception as e:
            logger.warning("Cleanup failed: %s", e)


audio_service = AudioService()