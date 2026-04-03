"""
Google Gemini AI service for journaling analysis and emotional feedback
"""
import json
import logging
import re
import threading
from collections import Counter

import google.generativeai as genai
from config.settings import Config

logger = logging.getLogger(__name__)

# Common English stop words for transcript-based keyword fallback
_KEYWORD_STOP = frozenset({
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'was',
    'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'their', 'our', 'its', 'as', 'with', 'from', 'by', 'not', 'no', 'so', 'if', 'just', 'very',
    'really', 'about', 'into', 'like', 'got', 'get', 'also', 'too', 'then', 'than', 'there',
    'here', 'when', 'what', 'which', 'who', 'how', 'why', 'all', 'some', 'any', 'out', 'up',
})


def _keywords_from_transcript(transcript, exclude=None, target_max=8):
    """Ranked content words from transcript when the model omits keywords."""
    exclude = {x.lower() for x in (exclude or [])}
    text = (transcript or '').lower()
    words = re.findall(r'\b[a-z]{3,}\b', text)
    counts = Counter(w for w in words if w not in _KEYWORD_STOP and w not in exclude)
    out = []
    for w, _ in counts.most_common(24):
        out.append(w.capitalize())
        if len(out) >= target_max:
            break
    return out


def _extract_keywords_raw(analysis):
    """Gemini sometimes uses alternate keys or nests keywords under summary."""
    if not isinstance(analysis, dict):
        return None
    for key in ('keywords', 'context_keywords', 'top_keywords', 'keyword_tags'):
        v = analysis.get(key)
        if v is not None:
            return v
    summary = analysis.get('summary')
    if isinstance(summary, dict) and summary.get('keywords') is not None:
        return summary['keywords']
    return None


def _normalize_keywords_list(raw, transcript=None):
    """
    Return 7–8 distinct strings: main themes from the model, padded from transcript if needed.
    Accepts list, comma-separated string, or None.
    """
    if isinstance(raw, str) and raw.strip():
        raw = [x.strip() for x in re.split(r'[,;]|\n', raw) if x.strip()]
    elif not isinstance(raw, list):
        raw = []

    out = []
    if isinstance(raw, list):
        for x in raw:
            s = re.sub(r'\s+', ' ', str(x).strip())
            if not s:
                continue
            if len(s) > 48:
                s = s[:45].rstrip() + '…'
            if s.lower() not in {k.lower() for k in out}:
                out.append(s)
    if len(out) < 7 and transcript:
        need = 8 - len(out)
        extra = _keywords_from_transcript(
            transcript,
            exclude={k.lower() for k in out},
            target_max=max(need, 8 - len(out)),
        )
        for w in extra:
            if w.lower() not in {k.lower() for k in out}:
                out.append(w)
            if len(out) >= 8:
                break
    if len(out) > 8:
        out = out[:8]
    while len(out) < 7 and transcript:
        filler = _keywords_from_transcript(transcript, exclude={k.lower() for k in out}, target_max=8)
        if not filler:
            break
        for w in filler:
            if w.lower() not in {k.lower() for k in out}:
                out.append(w)
            if len(out) >= 7:
                break
    return out[:8]

_GEMINI_LOCK = threading.Lock()


class GeminiService:
    """Service for interacting with Google Gemini API for journaling analysis"""
    
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Gemini client"""
        if not self.api_key:
            logger.error("Gemini API key not configured")
            return
        
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("Gemini client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
            self.model = None

    def _restore_server_config(self):
        """Restore process-wide genai config after a per-request user key."""
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def _run_with_request_key(self, request_api_key, fn):
        """
        Run fn(model) with optional client API key. google-generativeai uses global
        configure(), so user-key requests hold a lock for the whole call.
        """
        user_key = (request_api_key or "").strip()
        if user_key:
            with _GEMINI_LOCK:
                genai.configure(api_key=user_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                try:
                    return fn(model)
                finally:
                    self._restore_server_config()
        if not self.model:
            return False, "Gemini API key required. Add your key in Murmur Settings."
        return fn(self.model)
    
    def _create_journaling_prompt(self, transcript):
        """
        Create a comprehensive prompt for journaling analysis
        
        Args:
            transcript (str): The transcribed text from audio
            
        Returns:
            str: Formatted prompt for Gemini
        """
        return f"""
You are the most supportive best friend analyzing a personal journal entry. Be warm, caring, and genuinely encouraging.

Analyze this journal entry and respond with ONLY the JSON object - no code blocks, no extra text, just the raw JSON:

{{
    "summary": {{
        "key_points": [
            "Consolidated summary point 1 from their input text",
            "Consolidated summary point 2 from their input text", 
            "Consolidated summary point 3 from their input text"
        ]
    }},
    "emotional_feedback": {{
        "key_thoughts": "Brief insight about their thinking patterns - casual and friendly tone",
        "feelings": "Acknowledge their emotions warmly - like a caring friend who really gets it",
        "whats_next": "Long, heartfelt encouragement that pours out genuine support and optimism. Write like you're that friend who always lifts their spirits. Be emotionally rich, use casual language, celebrate their wins or comfort their struggles. Make them feel heard and cared for. This should be substantial and pour your heart out.",
        "mood": "calm"
    }},
    "keywords": [
        "Most important theme or entity from their words (rank 1)",
        "Second most important theme or concept (rank 2)",
        "Third ranked keyword or phrase (rank 3)",
        "Fourth ranked keyword (rank 4)",
        "Fifth ranked keyword (rank 5)",
        "Sixth ranked keyword (rank 6)",
        "Seventh ranked keyword (rank 7)",
        "Eighth ranked keyword (rank 8)"
    ]
}}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no code blocks, no extra text
- Summary key_points: Extract and consolidate the main content from their input text into clear bullet points
- Be their most caring best friend - casual, warm, emotionally supportive
- "whats_next" must be long and emotionally rich - really pour out encouragement
- emotional_feedback.mood MUST be exactly one of these strings (lowercase): "ease", "tension", or "calm"
  - "ease" = uplifted, hopeful, light, relieved, or clearly positive emotional tone
  - "calm" = steady, balanced, neutral, reflective without strong swing either way
  - "tension" = stressed, heavy, worried, sad, angry, or clearly difficult emotional load
- keywords: Exactly 8 entries, ordered most important first. Each must be a short phrase or single word (2–5 words max) capturing main topics, people, places, feelings, or situations from THEIR text—not generic filler. Use their vocabulary when possible.
- No generic AI responses - be genuinely human and caring
- Avoid special characters that might break JSON parsing

Journal entry: "{transcript}"
"""
    
    def analyze_journal_entry(self, transcript, request_api_key=None):
        """
        Analyze a journal transcript using Gemini AI
        
        Args:
            transcript (str): The transcribed journal entry
            request_api_key (str, optional): Client-supplied API key (overrides server env)
            
        Returns:
            tuple: (success: bool, analysis: dict or error_message: str)
        """
        if not transcript or not transcript.strip():
            return False, "No transcript provided for analysis"
        return self._run_with_request_key(
            request_api_key,
            lambda model: self._analyze_journal_core(model, transcript.strip()),
        )

    def _analyze_journal_core(self, model, transcript):
        """Run Gemini JSON analysis; model is already configured for this request."""
        try:
            prompt = self._create_journaling_prompt(transcript)
            logger.info("Gemini analyze: transcript_len=%s chars (content not logged)", len(transcript))
            response = model.generate_content(prompt)
            logger.info(
                "Gemini response received, chars=%s",
                len(response.text) if response and response.text else 0,
            )
            
            if not response or not response.text:
                logger.error("Empty response from Gemini")
                return False, "No response generated from Gemini"
            
            try:
                if logger.isEnabledFor(logging.DEBUG) and response.text:
                    logger.debug("Raw Gemini response (truncated): %s...", response.text[:200])
                response_text = response.text.strip()
                if '```json' in response_text:
                    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1).strip()
                elif '```' in response_text:
                    json_match = re.search(r'```\s*(.*?)\s*```', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1).strip()
                if not response_text.startswith('{'):
                    start = response_text.find('{')
                    end = response_text.rfind('}')
                    if start != -1 and end != -1 and end > start:
                        response_text = response_text[start:end+1]
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug("Cleaned JSON candidate (truncated): %s...", response_text[:200])
                analysis = json.loads(response_text)
                required_keys = ['summary', 'emotional_feedback']
                if not all(key in analysis for key in required_keys):
                    logger.error(f"Missing required keys in response: {list(analysis.keys())}")
                    return False, "Invalid response structure from Gemini"
                emotional_feedback = analysis.get('emotional_feedback', {})
                required_emotional_keys = ['key_thoughts', 'feelings', 'whats_next', 'mood']
                missing_keys = [key for key in required_emotional_keys if key not in emotional_feedback]
                if missing_keys:
                    logger.error(f"Missing emotional feedback keys: {missing_keys}")
                    return False, f"Incomplete emotional feedback structure: missing {missing_keys}"
                mood_raw = str(emotional_feedback.get('mood', 'calm')).lower().strip()
                if mood_raw not in ('ease', 'tension', 'calm'):
                    mood_raw = 'calm'
                emotional_feedback['mood'] = mood_raw
                analysis['emotional_feedback'] = emotional_feedback
                analysis['keywords'] = _normalize_keywords_list(
                    _extract_keywords_raw(analysis),
                    transcript.strip(),
                )
                logger.info("Successfully analyzed journal entry with proper structure")
                return True, analysis
            except json.JSONDecodeError as e:
                logger.error("Failed to parse Gemini response as JSON: %s", str(e))
                if response and response.text:
                    logger.debug(
                        "Raw response length=%s (snippet not logged at INFO)",
                        len(response.text),
                    )
                fallback_analysis = self._create_fallback_analysis(response.text, transcript)
                logger.info("Using fallback analysis")
                return True, fallback_analysis
        except Exception as e:
            logger.error(f"Gemini analysis error: {str(e)}")
            return False, f"Analysis failed: {str(e)}"
    
    def ask_journal_question(self, question, journal_context, request_api_key=None):
        """
        Answer a user question using only the provided journal excerpts (RAG-style).
        
        Args:
            question (str): User's question
            journal_context (str): Concatenated dated journal excerpts from the client
            request_api_key (str, optional): Client-supplied API key
            
        Returns:
            tuple: (success: bool, answer_text: str or error_message: str)
        """
        q = (question or "").strip()
        if not q:
            return False, "No question provided"
        
        ctx = (journal_context or "").strip()
        if not ctx:
            return False, "No journal history was provided. Add a few voice journal entries first."
        
        max_chars = 120_000
        if len(ctx) > max_chars:
            ctx = ctx[:max_chars] + "\n\n[…older entries omitted to fit context limit…]"

        prompt = f"""You are an intelligent reflection assistant.

The user is asking about their past journal entries.

Your job is to:
1. Understand the user's intent clearly
2. Analyze the provided journal summaries below (they were retrieved to match the question, but may include noise)
3. Only treat as relevant entries that truly match the intent—not just keyword overlap
4. Ignore irrelevant or loosely related excerpts
5. Provide a clear, thoughtful answer

Do NOT rely on keyword matching alone. Understand relationships and meaning.

Example: If the question is about "fighting with boyfriend":
- INCLUDE entries where the user had a conflict WITH their boyfriend
- EXCLUDE entries where the boyfriend is mentioned but not involved in the conflict

If the excerpts do not contain enough to answer, say so plainly and suggest one gentle journaling prompt—do not invent events or dates not implied by the text.

---

User Question:
{q}

---

Journal Entries:
{ctx}

---

Instructions:

- Base your answer ONLY on the journal material above
- Return in EXACTLY this format (use the labels):

Answer:
(Your main response—warm, reflective, non-judgmental, human—not robotic. Usually 2–6 short paragraphs unless they asked for a list.)

Relevant Insights:
- (optional bullet points of patterns or observations; omit this section entirely if nothing useful)

Do not add a separate "Tone:" section."""

        def _ask(model):
            try:
                response = model.generate_content(prompt)
                if not response or not response.text:
                    return False, "No response from the model. Try again."
                return True, response.text.strip()
            except Exception as e:
                logger.error(f"ask_journal_question error: {str(e)}")
                return False, f"Could not get an answer: {str(e)}"

        return self._run_with_request_key(request_api_key, _ask)
    
    def _create_fallback_analysis(self, raw_response, transcript):
        """
        Create a fallback structured analysis when JSON parsing fails
        
        Args:
            raw_response (str): Raw response from Gemini
            transcript (str): Original transcript
            
        Returns:
            dict: Structured analysis
        """
        return {
            "summary": {
                "key_points": [
                    "• Journal entry processed successfully",
                    "• Thoughts and feelings captured",
                    "• Ready for reflection and growth"
                ]
            },
            "emotional_feedback": {
                "key_thoughts": "I notice you're taking time for self-reflection and processing your experiences through journaling, which shows real emotional intelligence.",
                "feelings": "You seem reflective and thoughtful, showing a genuine desire to understand yourself better.",
                "whats_next": "Hey, I just want to say how awesome it is that you're taking time to journal and reflect on your thoughts! That takes real courage and shows you're committed to understanding yourself better. Keep this amazing practice going - you're doing something really meaningful for your personal growth. I'm genuinely proud of you for making this space for yourself. 💙",
                "mood": "calm"
            },
            "keywords": _normalize_keywords_list(None, transcript),
            "raw_response": raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
        }
    
    def health_check(self):
        """
        Check if the Gemini service is working properly
        
        Returns:
            tuple: (is_healthy: bool, status_message: str)
        """
        if not self.api_key:
            return False, "API key not configured"
        
        if not self.model:
            return False, "Model not initialized"
        
        try:
            # Test with a simple prompt
            test_response = self.model.generate_content("Say 'Hello' in JSON format: {\"message\": \"Hello\"}")
            if test_response and test_response.text:
                return True, "Gemini service is healthy"
            else:
                return False, "No response from Gemini"
        except Exception as e:
            return False, f"Health check failed: {str(e)}"

# Create a singleton instance
gemini_service = GeminiService()