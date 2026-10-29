"""
Provider-agnostic LLM service (Gemini, Claude, OpenAI) for journaling analysis.
The provider is inferred from the model name the user picks, falling back to the API key prefix.
"""
import json
import logging
import re
from collections import Counter

import requests
from config.settings import Config

logger = logging.getLogger(__name__)

_WRONG_API_KEY_MSG = (
    "Wrong API key. Check that you copied the full key from your provider and that it matches the selected model."
)
_TIMEOUT_MSG = "The request to the AI provider timed out. Check your network, VPN, or firewall, then try again."


class LLMError(Exception):
    """Provider call failed; message is safe to show to the user."""

    def __init__(self, message, code=None):
        super().__init__(message)
        self.message = message
        self.code = code


def detect_provider(model, api_key=""):
    """Return 'anthropic' | 'gemini' | 'openai' from the model name, else from the key prefix."""
    m = (model or "").strip().lower()
    if m.startswith("claude"):
        return "anthropic"
    if m.startswith(("gemini", "gemma")):
        return "gemini"
    if m.startswith(("gpt", "chatgpt", "o1", "o3", "o4", "o5")):
        return "openai"
    k = (api_key or "").strip()
    if k.startswith("sk-ant-"):
        return "anthropic"
    if k.startswith("AIza"):
        return "gemini"
    return "openai"


def _post(url, headers, payload):
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=Config.LLM_HTTP_TIMEOUT)
    except requests.Timeout:
        raise LLMError(_TIMEOUT_MSG)
    except requests.RequestException as e:
        logger.error("LLM request failed: %s", type(e).__name__)
        raise LLMError("Could not reach the AI provider. Check your network and try again.")
    if r.status_code < 400:
        try:
            return r.json()
        except ValueError:
            raise LLMError("The AI provider returned an unreadable response.")
    try:
        body = r.json()
        err = body.get("error", body) if isinstance(body, dict) else {}
        detail = err.get("message", "") if isinstance(err, dict) else str(err)
    except ValueError:
        detail = ""
    detail = str(detail)[:300]
    lowered = detail.lower()
    logger.error("LLM HTTP %s from provider (detail not logged)", r.status_code)
    if r.status_code in (401, 403) or any(
        x in lowered for x in ("api key not valid", "invalid api key", "invalid x-api-key", "api_key_invalid")
    ):
        raise LLMError(_WRONG_API_KEY_MSG, "INVALID_API_KEY")
    if r.status_code == 404 or ("model" in lowered and ("not found" in lowered or "does not exist" in lowered)):
        raise LLMError(
            "That model name wasn't found for this provider. Check the model name in Settings.", "INVALID_MODEL"
        )
    if r.status_code == 429:
        raise LLMError("Rate limit or quota reached for this API key. Try again later.")
    raise LLMError(detail or f"The AI provider returned an error ({r.status_code}).")


def _generate(prompt, api_key, model):
    """Send one prompt to the provider matching `model`; return the reply text."""
    provider = detect_provider(model, api_key)
    if provider == "anthropic":
        data = _post(
            "https://api.anthropic.com/v1/messages",
            {"x-api-key": api_key, "anthropic-version": "2023-06-01"},
            {"model": model, "max_tokens": 4096, "messages": [{"role": "user", "content": prompt}]},
        )
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    if provider == "gemini":
        data = _post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            {"x-goog-api-key": api_key},
            {"contents": [{"parts": [{"text": prompt}]}]},
        )
        cands = data.get("candidates") or []
        parts = (cands[0].get("content") or {}).get("parts", []) if cands else []
        return "".join(p.get("text", "") for p in parts)
    data = _post(
        "https://api.openai.com/v1/chat/completions",
        {"Authorization": f"Bearer {api_key}"},
        {"model": model, "messages": [{"role": "user", "content": prompt}]},
    )
    choices = data.get("choices") or []
    return ((choices[0].get("message") or {}).get("content") or "") if choices else ""


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
    """Models sometimes uses alternate keys or nests keywords under summary."""
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


class LLMService:
    """Service for journaling analysis with a user-selected model."""

    def __init__(self):
        self.api_key = Config.LLM_API_KEY
        self.model = Config.LLM_MODEL

    def _run_with_request_key(self, request_api_key, request_model, fn):
        """
        Run fn(generate) where generate(prompt) -> text, using the client-supplied
        key/model, or the server env defaults.
        """
        key = (request_api_key or "").strip() or self.api_key
        model = (request_model or "").strip() or self.model
        if not key:
            return False, "API key required. Add your key in Murmur Settings.", None
        if not model:
            return False, "Model name required. Add a model name in Murmur Settings.", None
        return fn(lambda prompt: _generate(prompt, key, model))

    def _create_journaling_prompt(self, transcript):
        """
        Create a comprehensive prompt for journaling analysis
        
        Args:
            transcript (str): The transcribed text from audio
            
        Returns:
            str: Formatted prompt
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
    
    def analyze_journal_entry(self, transcript, request_api_key=None, request_model=None):
        """
        Analyze a journal transcript using the selected model
        
        Args:
            transcript (str): The transcribed journal entry
            request_api_key (str, optional): Client-supplied API key (overrides server env)
            request_model (str, optional): Client-selected model name
            
        Returns:
            tuple: (success, analysis dict or error_message, error_code or None)
        """
        if not transcript or not transcript.strip():
            return False, "No transcript provided for analysis", None
        return self._run_with_request_key(
            request_api_key,
            request_model,
            lambda generate: self._analyze_journal_core(generate, transcript.strip()),
        )

    def _analyze_journal_core(self, generate, transcript):
        """Run JSON analysis via generate(prompt) -> text."""
        try:
            prompt = self._create_journaling_prompt(transcript)
            logger.info("LLM analyze: transcript_len=%s chars (content not logged)", len(transcript))
            raw_text = generate(prompt)
            logger.info("LLM response received, chars=%s", len(raw_text or ""))

            if not raw_text or not raw_text.strip():
                logger.error("Empty response from model")
                return False, "No response generated from the model", None

            try:
                response_text = raw_text.strip()
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
                    return False, "Invalid response structure from the model", None
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
                logger.error("Failed to parse model response as JSON: %s", str(e))
                fallback_analysis = self._create_fallback_analysis(raw_text, transcript)
                logger.info("Using fallback analysis")
                return True, fallback_analysis, None
        except LLMError as e:
            return False, e.message, e.code
        except Exception as e:
            logger.error("LLM analysis error: %s", e)
            return False, "Analysis failed. Please try again.", None
    
    def ask_journal_question(self, question, journal_context, request_api_key=None, request_model=None):
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

        def _ask(generate):
            try:
                text = generate(prompt)
                if not text or not text.strip():
                    return False, "No response from the model. Try again.", None
                return True, text.strip(), None
            except LLMError as e:
                return False, e.message, e.code
            except Exception as e:
                logger.error("ask_journal_question error: %s", e)
                return False, "Could not get an answer. Please try again.", None

        return self._run_with_request_key(request_api_key, request_model, _ask)

    def verify_api_key(self, request_api_key, request_model):
        """
        Lightweight check that the key + model work (one short generation).

        Returns:
            tuple: (success, message_or_none, error_code_or_None)
        """
        if not (request_api_key or "").strip():
            return False, "No API key provided.", None
        if not (request_model or "").strip():
            return False, "No model name provided.", None

        def _verify(generate):
            try:
                if not generate("Reply with exactly: OK"):
                    return False, "Could not reach the AI provider. Try again.", None
                return True, None, None
            except LLMError as e:
                return False, e.message, e.code
            except Exception as e:
                logger.error("verify_api_key error: %s", e)
                return False, "Could not verify key. Please try again.", None

        return self._run_with_request_key(request_api_key, request_model, _verify)

    def _create_fallback_analysis(self, raw_response, transcript):
        """
        Create a fallback structured analysis when JSON parsing fails
        
        Args:
            raw_response (str): Raw model response
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
        Clients bring their own key, so this only probes the provider when
        LLM_API_KEY and LLM_MODEL are set in the server environment.

        Returns:
            tuple: (is_healthy: bool, status_message: str)
        """
        if not self.api_key or not self.model:
            return True, "No server-side key configured; clients supply their own"
        try:
            if _generate("Reply with exactly: OK", self.api_key, self.model):
                return True, "LLM service is healthy"
            return False, "No response from model"
        except LLMError as e:
            return False, e.message
        except Exception as e:
            logger.error("LLM health check failed: %s", e)
            return False, "LLM health check failed"


# Create a singleton instance
llm_service = LLMService()
