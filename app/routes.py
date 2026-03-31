"""
API routes for Murmur voice journaling application
"""
import os
import logging
from flask import Blueprint, request, current_app
from werkzeug.exceptions import RequestEntityTooLarge

from utils.validators import validate_audio_upload
from utils.responses import success_response, error_response, validation_error_response
from services.audio_service import audio_service
from services.gemini_service import gemini_service
from .security import enforce_murmur_api_guard

logger = logging.getLogger(__name__)

# Create Blueprint
api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify service status
    
    Returns:
        JSON response with service health status
    """
    try:
        # Check Gemini service health
        gemini_healthy, gemini_status = gemini_service.health_check()

        # Avoid leaking internal error strings from Gemini in production
        if current_app.debug:
            gemini_details = gemini_status
        else:
            gemini_details = "ok" if gemini_healthy else "unavailable"

        health_data = {
            "status": "healthy" if gemini_healthy else "degraded",
            "services": {
                "api": "healthy",
                "gemini": "healthy" if gemini_healthy else "unhealthy",
                "gemini_details": gemini_details,
            },
            "version": "1.0.0"
        }
        
        status_code = 200 if gemini_healthy else 503
        return success_response(health_data, "Health check completed", status_code)
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return error_response("Health check failed", 500, "HEALTH_CHECK_ERROR")

@api_bp.route('/journal/analyze', methods=['POST'])
def analyze_journal():
    """
    Main endpoint for analyzing voice journal entries
    
    Accepts audio file upload, transcribes it, and provides AI analysis
    
    Returns:
        JSON response with transcription and analysis
    """
    try:
        # Check if file is present in request
        if 'audio' not in request.files:
            return validation_error_response({"audio": "No audio file provided"})
        
        file = request.files['audio']
        
        # Validate the uploaded file
        is_valid, error_message = validate_audio_upload(file)
        if not is_valid:
            return validation_error_response({"audio": error_message})
        
        # Save the uploaded file
        upload_folder = current_app.config['UPLOAD_FOLDER']
        success, file_path_or_error = audio_service.save_uploaded_file(file, upload_folder)
        
        if not success:
            logger.error(f"File save failed: {file_path_or_error}")
            return error_response("Failed to save uploaded file", 500, "FILE_SAVE_ERROR")
        
        audio_file_path = file_path_or_error
        
        try:
            # Transcribe the audio file
            logger.info(f"Starting transcription for: {audio_file_path}")
            transcription_success, transcription_result = audio_service.transcribe_audio(audio_file_path)
            
            if not transcription_success:
                logger.error(f"Transcription failed: {transcription_result}")
                return error_response(
                    f"Audio transcription failed: {transcription_result}", 
                    422, 
                    "TRANSCRIPTION_ERROR"
                )
            
            transcript = transcription_result
            logger.info("Transcription completed successfully")
            
            # Analyze the transcript with Gemini
            request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
            logger.info("Starting Gemini analysis")
            analysis_success, analysis_result = gemini_service.analyze_journal_entry(transcript, request_api_key=request_api_key)
            
            if not analysis_success:
                logger.error(f"Gemini analysis failed: {analysis_result}")
                return error_response(
                    f"Journal analysis failed: {analysis_result}", 
                    500, 
                    "ANALYSIS_ERROR"
                )
            
            logger.info("Analysis completed successfully")
            
            # Prepare response data
            response_data = {
                "transcript": transcript,
                "analysis": analysis_result,
                "metadata": {
                    "original_filename": file.filename,
                    "file_size_bytes": os.path.getsize(audio_file_path) if os.path.exists(audio_file_path) else 0
                }
            }
            
            return success_response(
                response_data, 
                "Journal entry analyzed successfully"
            )
            
        finally:
            # Clean up the uploaded file
            audio_service.cleanup_file(audio_file_path)
            
    except RequestEntityTooLarge:
        return error_response("File too large. Maximum size is 16MB.", 413, "FILE_TOO_LARGE")
    except Exception as e:
        logger.error(f"Unexpected error in analyze_journal: {str(e)}")
        return error_response("An unexpected error occurred", 500, "UNEXPECTED_ERROR")

@api_bp.route('/journal/analyze-text', methods=['POST'])
def analyze_text():
    """
    Endpoint for analyzing text directly (without audio transcription)
    
    Accepts JSON with text content and provides AI analysis
    
    Returns:
        JSON response with analysis
    """
    try:
        # Check if JSON data is present
        if not request.is_json:
            return validation_error_response({"text": "Request must be JSON"})
        
        data = request.get_json()
        
        if not data or 'text' not in data:
            return validation_error_response({"text": "No text provided"})
        
        text = data['text'].strip()
        
        if not text:
            return validation_error_response({"text": "Text cannot be empty"})
        
        # Analyze the text with Gemini (optional client API key)
        request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
        logger.info("Starting Gemini analysis for text")
        analysis_success, analysis_result = gemini_service.analyze_journal_entry(text, request_api_key=request_api_key)
        
        if not analysis_success:
            logger.error(f"Gemini analysis failed: {analysis_result}")
            return error_response(
                f"Analysis failed: {analysis_result}", 
                422, 
                "ANALYSIS_ERROR"
            )
        
        logger.info("Gemini analysis completed successfully")
        
        # Prepare response data
        response_data = {
            "transcript": text,
            "analysis": analysis_result,
            "metadata": {
                "processing_time": "N/A",
                "text_length": len(text),
                "word_count": len(text.split())
            }
        }
        
        return success_response(
            response_data,
            "Text analyzed successfully"
        )
        
    except Exception as e:
        logger.error(f"Unexpected error in analyze_text: {str(e)}")
        return error_response(
            "An unexpected error occurred during text analysis", 
            500, 
            "INTERNAL_ERROR"
        )

@api_bp.route('/journal/ask', methods=['POST'])
def ask_journal():
    """
    Ask a question answered from client-supplied journal excerpts (context).
    Expects JSON: { "question": str, "journal_context": str }
    """
    try:
        if not request.is_json:
            return validation_error_response({"body": "Request must be JSON"})
        
        data = request.get_json() or {}
        question = (data.get("question") or "").strip()
        journal_context = (data.get("journal_context") or "").strip()
        
        if not question:
            return validation_error_response({"question": "Question is required"})
        
        request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
        ok, result = gemini_service.ask_journal_question(question, journal_context, request_api_key=request_api_key)
        if not ok:
            return error_response(result, 422, "ASK_ERROR")
        
        return success_response({"answer": result}, "Answer ready")
    
    except Exception as e:
        logger.error(f"ask_journal error: {str(e)}")
        return error_response("An unexpected error occurred", 500, "INTERNAL_ERROR")

@api_bp.route('/journal/transcript-only', methods=['POST'])
def transcribe_only():
    """
    Endpoint for audio transcription only (without AI analysis)
    
    Useful for testing or when only transcription is needed
    
    Returns:
        JSON response with transcription only
    """
    try:
        # Check if file is present in request
        if 'audio' not in request.files:
            return validation_error_response({"audio": "No audio file provided"})
        
        file = request.files['audio']
        
        # Validate the uploaded file
        is_valid, error_message = validate_audio_upload(file)
        if not is_valid:
            return validation_error_response({"audio": error_message})
        
        # Save the uploaded file
        upload_folder = current_app.config['UPLOAD_FOLDER']
        success, file_path_or_error = audio_service.save_uploaded_file(file, upload_folder)
        
        if not success:
            return error_response("Failed to save uploaded file", 500, "FILE_SAVE_ERROR")
        
        audio_file_path = file_path_or_error
        
        try:
            # Transcribe the audio file
            transcription_success, transcription_result = audio_service.transcribe_audio(audio_file_path)
            
            if not transcription_success:
                return error_response(
                    f"Audio transcription failed: {transcription_result}", 
                    422, 
                    "TRANSCRIPTION_ERROR"
                )
            
            response_data = {
                "transcript": transcription_result,
                "metadata": {
                    "original_filename": file.filename,
                    "file_size_bytes": os.path.getsize(audio_file_path)
                }
            }
            
            return success_response(response_data, "Audio transcribed successfully")
            
        finally:
            # Clean up the uploaded file
            audio_service.cleanup_file(audio_file_path)
            
    except RequestEntityTooLarge:
        return error_response("File too large. Maximum size is 16MB.", 413, "FILE_TOO_LARGE")
    except Exception as e:
        logger.error(f"Unexpected error in transcribe_only: {str(e)}")
        return error_response("An unexpected error occurred", 500, "UNEXPECTED_ERROR")

@api_bp.route('/info', methods=['GET'])
def api_info():
    """
    API information endpoint
    
    Returns:
        JSON response with API information and supported formats
    """
    info_data = {
        "name": "Murmur AI Voice Journaling API",
        "version": "1.0.0",
        "description": "AI-powered voice journaling with emotional analysis",
        "endpoints": {
            "/api/v1/health": "Health check",
            "/api/v1/journal/analyze": "Full voice journal analysis (POST)",
            "/api/v1/journal/analyze-text": "Text analysis only (POST)",
            "/api/v1/journal/transcript-only": "Audio transcription only (POST)",
            "/api/v1/journal/ask": "Ask a question over journal context (POST JSON)",
            "/api/v1/info": "API information"
        },
        "supported_audio_formats": ["wav", "mp3", "flac", "m4a", "ogg", "webm"],
        "max_file_size": "16MB",
        "features": [
            "Speech-to-text transcription using Whisper.cpp",
            "AI-powered emotional analysis using Google Gemini",
            "Supportive and encouraging feedback",
            "Structured journaling insights"
        ]
    }
    
    return success_response(info_data, "API information retrieved successfully")


@api_bp.before_request
def _require_murmur_service_token():
    """Optional gate when MURMUR_API_SECRET / MURMUR_API_SECRET_SHA256 is set (see app/security.py)."""
    return enforce_murmur_api_guard()