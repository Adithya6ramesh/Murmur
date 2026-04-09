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


def _gemini_request_options():
    """Per-request options for google.generativeai (timeout in seconds)."""
    return {"timeout": Config.GEMINI_HTTP_TIMEOUT}

_WRONG_API_KEY_MSG = (
    "Wrong API key. Check that you copied the full key from Google AI Studio and try again."
)


def _classify_gemini_exception(exc: BaseException) -> tuple[str, str | None]:
    """
    Map Gemini / Google SDK errors to a user-facing message and optional error_code.
    error_code INVALID_GEMINI_API_KEY is used when the key is invalid or not authorized.
    """
    try:
        from google.api_core import exceptions as gexc
    except ImportError:
        gexc = None

    msg = str(exc).strip()
    lowered = msg.lower()

    if gexc:
        if hasattr(gexc, "DeadlineExceeded") and isinstance(exc, gexc.DeadlineExceeded):
            return (
                "The request to Gemini timed out. Check your network, VPN, or firewall, then try again.",
                None,
            )
        if isinstance(exc, (gexc.PermissionDenied, gexc.Unauthenticated)):
            return _WRONG_API_KEY_MSG, "INVALID_GEMINI_API_KEY"
        if isinstance(exc, gexc.InvalidArgument):
            if any(
                x in lowered
                for x in ("api key", "apikey", "api_key", "invalid api", "invalid_argument")
            ):
                return _WRONG_API_KEY_MSG, "INVALID_GEMINI_API_KEY"

    if any(
        x in lowered
        for x in (
            "api key not valid",
            "invalid api key",
            "api_key_invalid",
            "api key expired",
            "requests to this api",
        )
    ):
        return _WRONG_API_KEY_MSG, "INVALID_GEMINI_API_KEY"

    if "deadline exceeded" in lowered or "504 deadline" in lowered:
        return (
            "The request to Gemini timed out. Check your network, VPN, or firewall, then try again.",
            None,
        )

    return msg, None


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


def _normalize_emotional_feedback(emotional_feedback):
    """Map legacy keys, coerce key_thoughts list→string, ensure murmurings exists."""
    if not isinstance(emotional_feedback, dict):
        return {}
    out = dict(emotional_feedback)
    if out.get('murmurings') in (None, '') and out.get('whats_next'):
        out['murmurings'] = out['whats_next']
    kt = out.get('key_thoughts')
    if isinstance(kt, list):
        parts = [str(x).strip() for x in kt if str(x).strip()]
        out['key_thoughts'] = ' '.join(parts) if parts else ''
    return out


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
            return False, "Gemini API key required. Add your key in Murmur Settings.", None
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
You are Murmur — a calm, thoughtful, and emotionally intelligent journaling companion.

The user has spoken freely about their day. The input may be messy, unstructured, emotional, or even a mix of languages (e.g., English + Malayalam). Your job is to deeply understand what they meant — not just what they said.

---

## Your Responsibilities

1. Understand the user's experiences, emotions, and underlying thoughts
2. Clean and organize their thoughts into meaningful structure
3. Identify emotional patterns with sensitivity
4. Respond with warmth, empathy, and clarity

{{
    "summary": {{
        "key_points": [
            "… (first-person; one sentence per bullet)",
            "…",
            "…",
            "…",
            "…",
            "… (include a 6th only if needed for coverage)"
        ]
    }},
    "emotional_feedback": {{
        "key_thoughts": "Extract important thoughts, realizations, or concerns.

                          Write them in second-person (e.g., "You keep thinking...", "You feel like...").

                           Focus on internal reflections, not events.
                           Keep them concise and meaningful.,
        "feelings": "Warm, specific acknowledgment of how they seem to feel—ground it in their words, second person (you). One short paragraph.",
        "murmurings": "Exactly 2–3  paragraphs. Same shape every time: warm follow-up, not a report.

                    Voice: you are someone who truly cares about them—a close friend or partner who is on their side. Comfort them when they sound low; share in their lightness when they sound happy or relieved; when it is mixed, stay steady with them. They should feel they belong with you, not analyzed.

                    Write in plain, everyday language. Sound like a real person texting after a long talk—honest, specific to what they said, never performative.

                    Do NOT sound like: a therapist, life coach, corporate wellness copy, or generic AI. Do NOT use therapy-speak or jargon (avoid words/phrases like: navigate, journey, hold space, honor, validate, intentional, mindful, processing, self-care speak, leverage, unpack, toxic, boundaries used emptily).

                    Do NOT: give strong advice, preach, list tips, or use clichés ("stay strong", "everything happens for a reason", "you got this" unless it truly fits their words).

                    DO: use "you" naturally; name details from their entry; mirror their emotional temperature; offer quiet reassurance or shared joy without explaining their feelings back at them in clinical terms.

                    Keep it natural; a little plain is better than polished emptiness.",
    "mood": "calm"
    }},
    "keywords": [
        "Eight items, most important first, 2–5 words each, drawn from their vocabulary"
    ]
}}

CRITICAL RULES:
- Return ONLY the JSON object
- summary.key_points: Exactly 5 or 6 strings. Each must be first person  and summarize part of their entry—not third person ("they" / "the user").
- key_thoughts: Factual and tight—ground every claim in the transcript. If you cannot tie a sentence to their words, omit it.
- murmurings: 2–3 long paragraphs as above—specific to their words, human, belonging—not generic or jargon-heavy.
  - "ease" = clearly lighter, hopeful, relieved, or positive
  - "calm" = steady, mixed, or neutral reflection
  - "tension" = stress, weight, conflict, sadness, anger, or difficulty
- No generic AI responses - be genuinely human and caring
- keywords: Exactly 8 distinct strings, topics/themes from their text—not filler
- Escape quotes inside strings so JSON parses. Avoid emoji if it could break JSON.

Journal entry:
{json.dumps(transcript)}
"""
    
    def analyze_journal_entry(self, transcript, request_api_key=None):
        """
        Analyze a journal transcript using Gemini AI
        
        Args:
            transcript (str): The transcribed journal entry
            request_api_key (str, optional): Client-supplied API key (overrides server env)
            
        Returns:
            tuple: (success, analysis dict or error_message, error_code or None)
        """
        if not transcript or not transcript.strip():
            return False, "No transcript provided for analysis", None
        return self._run_with_request_key(
            request_api_key,
            lambda model: self._analyze_journal_core(model, transcript.strip()),
        )

    def _analyze_journal_core(self, model, transcript):
        """Run Gemini JSON analysis; model is already configured for this request."""
        try:
            prompt = self._create_journaling_prompt(transcript)
            logger.info("Gemini analyze: transcript_len=%s chars (content not logged)", len(transcript))
            logger.info(
                "Gemini generate_content starting (timeout=%ss)",
                Config.GEMINI_HTTP_TIMEOUT,
            )
            response = model.generate_content(prompt, request_options=_gemini_request_options())
            logger.info(
                "Gemini response received, chars=%s",
                len(response.text) if response and response.text else 0,
            )
            
            if not response or not response.text:
                logger.error("Empty response from Gemini")
                return False, "No response generated from Gemini", None
            
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
                    return False, "Invalid response structure from Gemini", None
                emotional_feedback = _normalize_emotional_feedback(analysis.get('emotional_feedback', {}))
                required_emotional_keys = ['key_thoughts', 'feelings', 'murmurings', 'mood']
                missing_keys = [key for key in required_emotional_keys if key not in emotional_feedback]
                if missing_keys:
                    logger.error(f"Missing emotional feedback keys: {missing_keys}")
                    return False, f"Incomplete emotional feedback structure: missing {missing_keys}", None
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
                return True, analysis, None
            except json.JSONDecodeError as e:
                logger.error("Failed to parse Gemini response as JSON: %s", str(e))
                if response and response.text:
                    logger.debug(
                        "Raw response length=%s (snippet not logged at INFO)",
                        len(response.text),
                    )
                fallback_analysis = self._create_fallback_analysis(response.text, transcript)
                logger.info("Using fallback analysis")
                return True, fallback_analysis, None
        except Exception as e:
            logger.error("Gemini analysis error: %s", e)
            user_msg, err_code = _classify_gemini_exception(e)
            if err_code:
                return False, user_msg, err_code
            return False, "Analysis failed. Please try again.", None
    
    def ask_journal_question(self, question, journal_context, request_api_key=None):
        """
        Answer a user question using only the provided journal excerpts (RAG-style).
        
        Args:
            question (str): User's question
            journal_context (str): Concatenated dated journal excerpts from the client
            request_api_key (str, optional): Client-supplied API key
            
        Returns:
            tuple: (success, answer_or_error_message, error_code_or_None)
        """
        q = (question or "").strip()
        if not q:
            return False, "No question provided", None

        ctx = (journal_context or "").strip()
        if not ctx:
            return False, "No journal history was provided. Add a few voice journal entries first.", None
        
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
                response = model.generate_content(prompt, request_options=_gemini_request_options())
                if not response or not response.text:
                    return False, "No response from the model. Try again.", None
                return True, response.text.strip(), None
            except Exception as e:
                logger.error("ask_journal_question error: %s", e)
                user_msg, err_code = _classify_gemini_exception(e)
                if err_code:
                    return False, user_msg, err_code
                return False, "Could not get an answer. Please try again.", None

        return self._run_with_request_key(request_api_key, _ask)

    def verify_gemini_api_key(self, request_api_key: str):
        """
        Lightweight check that the API key can call Gemini (one short generation).

        Returns:
            tuple: (success, message_or_none, error_code_or_None)
        """
        key = (request_api_key or "").strip()
        if not key:
            return False, "No API key provided.", None

        def _verify(model):
            try:
                r = model.generate_content("Reply with exactly: OK", request_options=_gemini_request_options())
                if not r or not r.text:
                    return False, "Could not reach Gemini. Try again.", None
                return True, None, None
            except Exception as e:
                logger.error("verify_gemini_api_key error: %s", e)
                user_msg, err_code = _classify_gemini_exception(e)
                if err_code:
                    return False, user_msg, err_code
                return False, "Could not verify key. Please try again.", None

        return self._run_with_request_key(key, _verify)
    
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
                    "I put something down in my journal today.",
                    "I'm processing it without a full structured read-back.",
                    "I'll come back to this when I want to reflect again.",
                    "I left room for whatever comes next.",
                    "I'm still here with whatever I wrote.",
                ]
            },
            "emotional_feedback": {
                "key_thoughts": "You named what's on your mind in this entry. The details are yours to revisit when you're ready.",
                "feelings": "Sounds like you're sitting with a mix of thoughts—nothing wrong with letting that be enough for now.",
                "murmurings": "If the formatted view glitched, your words are still what matter. Re-run analysis when the connection's stable.",
                "mood": "calm"
            },
            "keywords": _normalize_keywords_list(None, transcript),
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
            test_response = self.model.generate_content(
                "Reply with exactly: OK",
                request_options=_gemini_request_options(),
            )
            if test_response and test_response.text:
                return True, "Gemini service is healthy"
            else:
                return False, "No response from Gemini"
        except Exception as e:
            logger.error("Gemini health check failed: %s", e)
            return False, "Gemini health check failed"

# Create a singleton instance
gemini_service = GeminiService()