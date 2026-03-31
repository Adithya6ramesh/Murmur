"""
Audio processing service using OpenAI Whisper for speech-to-text conversion
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class AudioService:
    """Service for handling audio file processing and transcription"""
    
    def __init__(self):
        self.whisper_model = None
        self._initialize_whisper()
    
    def _initialize_whisper(self):
        """Initialize OpenAI Whisper model"""
        try:
            import whisper
            # Load the tiny model first (faster and requires less resources)
            logger.info("Loading Whisper model...")
            self.whisper_model = whisper.load_model("tiny")
            logger.info("OpenAI Whisper model loaded successfully")
        except ImportError:
            logger.error("OpenAI Whisper not installed. Please install with: pip install openai-whisper")
            self.whisper_model = None
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to load Whisper model: {error_msg}")
            
            # Check if it's an FFmpeg related error
            if "ffmpeg" in error_msg.lower() or "file specified" in error_msg.lower():
                logger.error("This appears to be an FFmpeg dependency issue.")
                logger.error("Please install FFmpeg: winget install ffmpeg")
                logger.error("Then restart the application.")
            
            self.whisper_model = None
    
    def transcribe_audio(self, audio_file_path):
        """
        Transcribe audio file to text using OpenAI Whisper
        
        Args:
            audio_file_path (str): Path to the audio file
            
        Returns:
            tuple: (success: bool, result: str or error_message: str)
        """
        try:
            # Check if Whisper model is loaded
            if self.whisper_model is None:
                # Try to reinitialize the model
                logger.info("Whisper model not loaded, attempting to reinitialize...")
                self._initialize_whisper()
                
                if self.whisper_model is None:
                    return False, "Whisper model not available. FFmpeg may be missing. Please install FFmpeg and restart the server."
            
            # Ensure the audio file exists
            if not os.path.exists(audio_file_path):
                return False, f"Audio file not found: {audio_file_path}"
            
            # Check file size
            file_size = os.path.getsize(audio_file_path)
            if file_size == 0:
                return False, "Audio file is empty"
            
            logger.info(f"Starting transcription of: {audio_file_path} (size: {file_size} bytes)")
            
            # Transcribe the audio file
            result = self.whisper_model.transcribe(audio_file_path)
            
            # Extract the transcription text
            transcription = result.get("text", "").strip()
            
            if not transcription:
                return False, "No transcription generated - audio may be silent or corrupted"
            
            logger.info(f"Transcription completed successfully. Length: {len(transcription)} characters")
            return True, transcription
                    
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Transcription error: {error_msg}")
            
            # Provide more specific error messages
            if "ffmpeg" in error_msg.lower():
                return False, "FFmpeg is required but not found. Please install FFmpeg and restart the server."
            elif "file specified" in error_msg.lower():
                return False, "Required system component not found. Please install FFmpeg and restart the server."
            elif "permission" in error_msg.lower():
                return False, "Permission denied accessing audio file."
            else:
                return False, f"Transcription error: {error_msg}"
    
    def save_uploaded_file(self, file, upload_folder):
        """
        Save uploaded file to the specified folder
        
        Args:
            file: Flask uploaded file object
            upload_folder (str): Directory to save the file
            
        Returns:
            tuple: (success: bool, file_path: str or error_message: str)
        """
        try:
            # Create upload directory if it doesn't exist
            Path(upload_folder).mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename
            from utils.validators import sanitize_filename
            import uuid
            
            original_filename = sanitize_filename(file.filename)
            name, ext = os.path.splitext(original_filename)
            unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
            
            file_path = os.path.join(upload_folder, unique_filename)
            
            # Save the file
            file.save(file_path)
            
            logger.info(f"File saved successfully: {file_path}")
            return True, file_path
            
        except Exception as e:
            logger.error(f"File save error: {str(e)}")
            return False, f"Failed to save file: {str(e)}"
    
    def cleanup_file(self, file_path):
        """
        Clean up temporary audio file
        
        Args:
            file_path (str): Path to the file to delete
        """
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.info(f"Cleaned up file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup file {file_path}: {str(e)}")

# Create a singleton instance
audio_service = AudioService()