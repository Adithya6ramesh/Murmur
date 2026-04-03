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

api_bp = Blueprint('api', __name__)


def _safe_error(internal_msg: str, *, user_msg: str = "An unexpected error occurred",
                status: int = 500, code: str = "INTERNAL_ERROR"):
    """Log the real error, return a generic message to the client."""
    logger.error(internal_msg)
    return error_response(user_msg, status, code)


def _text_limit():
    return current_app.config.get("MAX_TEXT_LENGTH", 50_000)


def _context_limit():
    return current_app.config.get("MAX_JOURNAL_CONTEXT_LENGTH", 120_000)


@api_bp.route('/health', methods=['GET'])
def health_check():
    try:
        gemini_healthy, gemini_status = gemini_service.health_check()

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
        return _safe_error(f"Health check error: {e}")


@api_bp.route('/journal/analyze', methods=['POST'])
def analyze_journal():
    try:
        if 'audio' not in request.files:
            return validation_error_response({"audio": "No audio file provided"})

        file = request.files['audio']

        is_valid, error_message = validate_audio_upload(file)
        if not is_valid:
            return validation_error_response({"audio": error_message})

        upload_folder = current_app.config['UPLOAD_FOLDER']
        success, file_path_or_error = audio_service.save_uploaded_file(file, upload_folder)

        if not success:
            return _safe_error(
                f"File save failed: {file_path_or_error}",
                user_msg="Failed to save uploaded file",
                code="FILE_SAVE_ERROR",
            )

        audio_file_path = file_path_or_error

        try:
            logger.info("Starting transcription (file accepted)")
            transcription_success, transcription_result = audio_service.transcribe_audio(audio_file_path)

            if not transcription_success:
                logger.error("Transcription failed: %s", transcription_result)
                return error_response(
                    "Audio transcription failed. Ensure the file contains valid audio.",
                    422,
                    "TRANSCRIPTION_ERROR",
                )

            transcript = transcription_result
            logger.info("Transcription completed")

            request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
            logger.info("Starting Gemini analysis")
            analysis_success, analysis_result, analysis_err_code = gemini_service.analyze_journal_entry(
                transcript, request_api_key=request_api_key
            )

            if not analysis_success:
                logger.error("Gemini analysis failed: %s", analysis_result)
                status = 401 if analysis_err_code == "INVALID_GEMINI_API_KEY" else 500
                safe_msg = analysis_result if analysis_err_code else "Analysis failed"
                return error_response(safe_msg, status, analysis_err_code or "ANALYSIS_ERROR")

            logger.info("Analysis completed")

            response_data = {
                "transcript": transcript,
                "analysis": analysis_result,
                "metadata": {
                    "file_size_bytes": os.path.getsize(audio_file_path) if os.path.exists(audio_file_path) else 0,
                }
            }

            return success_response(response_data, "Journal entry analyzed successfully")

        finally:
            audio_service.cleanup_file(audio_file_path)

    except RequestEntityTooLarge:
        return error_response("File too large. Maximum size is 16 MB.", 413, "FILE_TOO_LARGE")
    except Exception as e:
        return _safe_error(f"analyze_journal: {e}")


@api_bp.route('/journal/analyze-text', methods=['POST'])
def analyze_text():
    try:
        if not request.is_json:
            return validation_error_response({"text": "Request must be JSON"})

        data = request.get_json(silent=True)

        if not data or 'text' not in data:
            return validation_error_response({"text": "No text provided"})

        text = data['text'].strip()
        if not text:
            return validation_error_response({"text": "Text cannot be empty"})

        limit = _text_limit()
        if len(text) > limit:
            return validation_error_response(
                {"text": f"Text exceeds maximum length of {limit:,} characters"}
            )

        request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
        logger.info("Starting text analysis (len=%d)", len(text))
        analysis_success, analysis_result, analysis_err_code = gemini_service.analyze_journal_entry(
            text, request_api_key=request_api_key
        )

        if not analysis_success:
            logger.error("Gemini analysis failed: %s", analysis_result)
            status = 401 if analysis_err_code == "INVALID_GEMINI_API_KEY" else 422
            safe_msg = analysis_result if analysis_err_code else "Analysis failed"
            return error_response(safe_msg, status, analysis_err_code or "ANALYSIS_ERROR")

        logger.info("Text analysis completed")

        response_data = {
            "transcript": text,
            "analysis": analysis_result,
            "metadata": {
                "text_length": len(text),
                "word_count": len(text.split()),
            }
        }

        return success_response(response_data, "Text analyzed successfully")

    except Exception as e:
        return _safe_error(f"analyze_text: {e}")


@api_bp.route('/journal/ask', methods=['POST'])
def ask_journal():
    """Answer a question from client-supplied journal excerpts (context)."""
    try:
        if not request.is_json:
            return validation_error_response({"body": "Request must be JSON"})

        data = request.get_json(silent=True) or {}
        question = (data.get("question") or "").strip()
        journal_context = (data.get("journal_context") or "").strip()

        if not question:
            return validation_error_response({"question": "Question is required"})

        q_limit = _text_limit()
        if len(question) > q_limit:
            return validation_error_response(
                {"question": f"Question exceeds {q_limit:,} character limit"}
            )

        ctx_limit = _context_limit()
        if len(journal_context) > ctx_limit:
            return validation_error_response(
                {"journal_context": f"Context exceeds {ctx_limit:,} character limit"}
            )

        request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
        ok, result, ask_err_code = gemini_service.ask_journal_question(
            question, journal_context, request_api_key=request_api_key
        )
        if not ok:
            status = 401 if ask_err_code == "INVALID_GEMINI_API_KEY" else 422
            safe_msg = result if ask_err_code else "Could not process your question"
            return error_response(safe_msg, status, ask_err_code or "ASK_ERROR")

        return success_response({"answer": result}, "Answer ready")

    except Exception as e:
        return _safe_error(f"ask_journal: {e}")


@api_bp.route('/journal/transcript-only', methods=['POST'])
def transcribe_only():
    try:
        if 'audio' not in request.files:
            return validation_error_response({"audio": "No audio file provided"})

        file = request.files['audio']

        is_valid, error_message = validate_audio_upload(file)
        if not is_valid:
            return validation_error_response({"audio": error_message})

        upload_folder = current_app.config['UPLOAD_FOLDER']
        success, file_path_or_error = audio_service.save_uploaded_file(file, upload_folder)

        if not success:
            return _safe_error(
                f"File save failed: {file_path_or_error}",
                user_msg="Failed to save uploaded file",
                code="FILE_SAVE_ERROR",
            )

        audio_file_path = file_path_or_error

        try:
            transcription_success, transcription_result = audio_service.transcribe_audio(audio_file_path)

            if not transcription_success:
                return error_response(
                    "Audio transcription failed. Ensure the file contains valid audio.",
                    422,
                    "TRANSCRIPTION_ERROR",
                )

            response_data = {
                "transcript": transcription_result,
                "metadata": {
                    "file_size_bytes": os.path.getsize(audio_file_path),
                }
            }

            return success_response(response_data, "Audio transcribed successfully")

        finally:
            audio_service.cleanup_file(audio_file_path)

    except RequestEntityTooLarge:
        return error_response("File too large. Maximum size is 16 MB.", 413, "FILE_TOO_LARGE")
    except Exception as e:
        return _safe_error(f"transcribe_only: {e}")


@api_bp.route('/journal/verify-gemini-key', methods=['POST'])
def verify_gemini_key():
    try:
        request_api_key = request.headers.get('X-Gemini-Api-Key', '').strip()
        ok, msg, err_code = gemini_service.verify_gemini_api_key(request_api_key)
        if not ok:
            status = 401 if err_code == 'INVALID_GEMINI_API_KEY' else 422
            return error_response(msg, status, err_code or 'VERIFY_ERROR')
        return success_response(None, 'API key is valid')
    except Exception as e:
        return _safe_error(f"verify_gemini_key: {e}", user_msg="Verification failed")


@api_bp.route('/info', methods=['GET'])
def api_info():
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
            "/api/v1/journal/verify-gemini-key": "Verify Gemini API key (POST, header X-Gemini-Api-Key)",
            "/api/v1/info": "API information",
        },
        "supported_audio_formats": ["wav", "mp3", "flac", "m4a", "ogg", "webm"],
        "max_file_size": "16MB",
    }

    return success_response(info_data, "API information retrieved successfully")


@api_bp.before_request
def _require_murmur_service_token():
    return enforce_murmur_api_guard()