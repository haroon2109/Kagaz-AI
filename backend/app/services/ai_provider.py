"""
Unified AI provider for Kagaz AI.

Engine priority (first configured wins, automatic fallback on failure):
  1. Gemini   — native Google AI integration (generativelanguage REST API,
                structured output via responseSchema, inline_data vision).
                Free key: https://aistudio.google.com/apikey
  2. Frontier — any OpenAI-compatible API (OpenAI, OpenRouter, Together, ...)
  3. Ollama   — fully local, open weights, zero cost, offline-capable
  4. Groq     — free-tier OpenAI-compatible API (groq.com)

Every AI capability in the app (vision OCR extraction, single-answer grading
verification, reassessment question generation, full pedagogical analysis)
goes through this one module, so the rest of the codebase never needs to know
which engine answered. The engine that answered is recorded in `last_engine`
for transparency/observability (surfaced to teachers in the UI).
"""

import base64
import json
import logging
import mimetypes
import os
import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def extract_json(raw: str) -> Any:
    """Parse JSON out of a model response, tolerating markdown fences."""
    text = raw.strip()
    # Strip markdown code fences if present
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last resort: grab the outermost JSON object/array in the text
        for pattern in (r"\{.*\}", r"\[.*\]"):
            match = re.search(pattern, text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    continue
        raise


# Backwards-compatible private alias
_extract_json = extract_json


def _read_image(image_path: str):
    """
    Read an image file, returning (raw_bytes, mime_type).
    Images larger than AI_VISION_MAX_EDGE on their long side are downscaled
    with Pillow first — this cuts CPU vision-inference time dramatically
    (quadratic in pixel count) with no practical accuracy loss for handwriting.
    """
    with open(image_path, "rb") as f:
        data = f.read()
    mime, _ = mimetypes.guess_type(image_path)
    if not mime:
        mime = "image/jpeg"

    max_edge = settings.AI_VISION_MAX_EDGE
    if max_edge and mime.startswith("image/"):
        try:
            from io import BytesIO

            from PIL import Image

            img = Image.open(BytesIO(data))
            long_edge = max(img.size)
            if long_edge > max_edge:
                scale = max_edge / long_edge
                new_size = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
                img = img.resize(new_size, Image.LANCZOS)
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                buf = BytesIO()
                img.save(buf, format="JPEG", quality=90)
                data = buf.getvalue()
                mime = "image/jpeg"
                logger.info(
                    f"[AI] Downscaled vision input {long_edge}px → {max(new_size)}px "
                    f"({len(data) // 1024}KB)"
                )
        except Exception as e:
            # Downscaling is an optimization — never fail the request over it
            logger.warning(f"[AI] Image preprocessing skipped: {e}")

    return data, mime


def _image_b64_raw(image_path: str) -> str:
    """Raw base64 (no prefix) — the format Ollama's native API requires.
    A data-URL prefix makes Ollama fail with 'illegal base64 data'."""
    data, _ = _read_image(image_path)
    return base64.b64encode(data).decode("utf-8")


def _image_data_url(image_path: str) -> str:
    """Base64 data-URL — the format OpenAI-compatible APIs (frontier/Groq) expect."""
    data, mime = _read_image(image_path)
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"


class AIProvider:
    """
    Routes chat/vision requests through a priority chain:
      frontier (OpenAI-compatible) → Ollama (local) → Groq.
    All three speak the OpenAI /chat/completions protocol (Ollama additionally
    has a native API); we use plain httpx so there is no heavyweight SDK
    dependency (works fully offline with Ollama when no cloud key is set).
    """

    def __init__(self):
        self._ollama_available: Optional[bool] = None
        # Transparency: which engine answered the most recent chat() call.
        # Read by callers to tag AI outputs shown to teachers.
        self.last_engine: Optional[str] = None

    def extract_json(self, raw: str) -> Any:
        """Instance-level access to the module-level JSON repair function.
        (Callers like ocr.py use ai_provider.extract_json — keep that working.)"""
        return extract_json(raw)

    # ── Engine configuration ────────────────────────────────────────────────

    @property
    def ollama_base(self) -> str:
        return settings.OLLAMA_BASE_URL.rstrip("/")

    @property
    def ollama_vision_model(self) -> str:
        return settings.OLLAMA_VISION_MODEL

    @property
    def ollama_text_model(self) -> str:
        return settings.OLLAMA_TEXT_MODEL

    # ── Native Gemini (Google AI) ───────────────────────────────────────

    @property
    def gemini_ready(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def _chat_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        image_path: Optional[str],
        schema_hint: Optional[str],
        temperature: float,
        timeout: float,
    ) -> str:
        """
        Native generativelanguage.googleapis.com call — NOT the OpenAI shim.
        Uses structured output (responseSchema) for JSON-constrained tasks and
        inline_data for vision. Free-tier friendly (gemini-2.0-flash default).
        """
        import base64 as _b64

        model = settings.GEMINI_VISION_MODEL if image_path else settings.GEMINI_TEXT_MODEL
        url = f"{settings.GEMINI_API_BASE}/models/{model}:generateContent"

        contents: List[Dict[str, Any]] = []
        parts: List[Dict[str, Any]] = []
        if image_path:
            data, mime = _read_image(image_path)
            parts.append({"inline_data": {"mime_type": mime, "data": _b64.b64encode(data).decode("utf-8")}})
        parts.append({"text": user_prompt})
        contents.append({"role": "user", "parts": parts})

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
            "safetySettings": [
                {"category": c, "threshold": "BLOCK_ONLY_HIGH"}
                for c in (
                    "HARM_CATEGORY_HARASSMENT",
                    "HARM_CATEGORY_HATE_SPEECH",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "HARM_CATEGORY_DANGEROUS_CONTENT",
                )
            ],
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        # Structured output: force valid JSON conforming to the hint's shape.
        if schema_hint:
            payload["generationConfig"]["responseMimeType"] = "application/json"
            payload["generationConfig"]["responseSchema"] = self._schema_from_hint(schema_hint)

        resp = httpx.post(url, json=payload, params={"key": settings.GEMINI_API_KEY}, timeout=timeout)
        resp.raise_for_status()
        body = resp.json()
        try:
            return body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            # Blocked/empty candidate — surface a readable error
            raise RuntimeError(f"Gemini returned no text (blocked or empty): {body.get('promptFeedback', e)}")

    # Map a flat JSON example (our schema_hint) to a permissive Gemini
    # responseSchema: object/array structure preserved, all leaf types STRING
    # (strongest guarantee we need is valid JSON, not typed fields).
    @staticmethod
    def _schema_from_hint(hint: str) -> Dict[str, Any]:
        def convert(node: Any) -> Dict[str, Any]:
            if isinstance(node, dict):
                return {
                    "type": "OBJECT",
                    "properties": {k: convert(v) for k, v in node.items()},
                    "required": list(node.keys()),
                }
            if isinstance(node, list) and node:
                return {"type": "ARRAY", "items": convert(node[0])}
            return {"type": "STRING"}

        try:
            return convert(json.loads(hint))
        except Exception:
            # Malformed hint → fall back to bare JSON mime constraint
            return {"type": "STRING"}

    @property
    def frontier_ready(self) -> bool:
        return bool(settings.OPENAI_API_KEY)

    def _frontier_client_config(self) -> Dict[str, Any]:
        return {
            "base_url": settings.OPENAI_API_BASE.rstrip("/"),
            "api_key": settings.OPENAI_API_KEY,
            "model": settings.OPENAI_VISION_MODEL,
        }

    @property
    def groq_ready(self) -> bool:
        return bool(settings.GROQ_API_KEY)

    def _groq_client_config(self) -> Dict[str, Any]:
        return {
            "base_url": settings.GROQ_API_BASE.rstrip("/"),
            "api_key": settings.GROQ_API_KEY,
            "model": settings.GROQ_MODEL,
        }

    # ── Availability probes ─────────────────────────────────────────────────

    def check_ollama(self, force: bool = False) -> bool:
        """Probe the local Ollama server. Cached after the first success."""
        if self._ollama_available and not force:
            return True
        try:
            resp = httpx.get(f"{self.ollama_base}/api/tags", timeout=3.0)
            self._ollama_available = resp.status_code == 200
        except Exception:
            self._ollama_available = False
        return self._ollama_available

    def reset_probe(self):
        """Force re-detection of Ollama on the next call (e.g. after failure)."""
        self._ollama_available = None

    # ── Core chat completion ────────────────────────────────────────────────

    @staticmethod
    def _user_message(user_prompt: str, image_path: Optional[str], target: str) -> Dict[str, Any]:
        """
        Build a user message in the format each API expects.
        - Ollama native: flat message with an "images" array of raw base64.
        - OpenAI-compatible (frontier/Groq): content is a list of typed parts
          ("text" + "image_url" with a base64 data URL). A flat "images" key
          would be silently ignored by OpenAI-style servers → no vision.
        """
        if not image_path:
            return {"role": "user", "content": user_prompt}
        if target == "openai":
            return {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": _image_data_url(image_path)}},
                ],
            }
        # Ollama native — expects raw base64, NOT data-URLs
        return {
            "role": "user",
            "content": user_prompt,
            "images": [_image_b64_raw(image_path)],
        }

    def _chat_ollama(
        self,
        system_prompt: str,
        user_prompt: str,
        image_path: Optional[str],
        schema_hint: Optional[str],
        temperature: float,
        timeout: float,
    ) -> str:
        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append(self._user_message(user_prompt, image_path, target="ollama"))
        if schema_hint:
            # Nudge local models toward valid JSON without leaking into output
            messages.append({
                "role": "assistant",
                "content": f"Understood. I will respond with only raw JSON in this exact shape:\n{schema_hint}",
            })
        payload = {
            "model": self.ollama_vision_model if image_path else self.ollama_text_model,
            "messages": messages,
            "stream": False,
            "format": "json" if schema_hint else None,
            "options": {"temperature": temperature},
        }
        payload = {k: v for k, v in payload.items() if v is not None}
        resp = httpx.post(f"{self.ollama_base}/api/chat", json=payload, timeout=timeout)
        resp.raise_for_status()
        return resp.json()["message"]["content"]

    def _chat_openai_compatible(
        self,
        cfg: Dict[str, Any],
        system_prompt: str,
        user_prompt: str,
        image_path: Optional[str],
        temperature: float,
        timeout: float,
        json_mode: bool = False,
    ) -> str:
        """Shared OpenAI-compatible call used by both frontier and Groq engines."""
        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append(self._user_message(user_prompt, image_path, target="openai"))
        headers = {"Authorization": f"Bearer {cfg['api_key']}"}
        payload: Dict[str, Any] = {
            "model": cfg["model"],
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        resp = httpx.post(
            f"{cfg['base_url']}/chat/completions",
            json=payload,
            headers=headers,
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def _chat_frontier(
        self,
        system_prompt: str,
        user_prompt: str,
        image_path: Optional[str],
        schema_hint: Optional[str],
        temperature: float,
        timeout: float,
    ) -> str:
        """Call the configured frontier provider (OpenAI, OpenRouter, Gemini's
        OpenAI-compatible endpoint, Together, DeepSeek, ...). Text requests use
        the cheaper text model; vision requests use the vision model."""
        cfg = self._frontier_client_config()
        if not image_path:
            cfg = {**cfg, "model": settings.OPENAI_TEXT_MODEL}
        return self._chat_openai_compatible(
            cfg, system_prompt, user_prompt, image_path, temperature, timeout,
            json_mode=bool(schema_hint),
        )

    def _chat_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        image_path: Optional[str],
        schema_hint: Optional[str],
        temperature: float,
        timeout: float,
    ) -> str:
        return self._chat_openai_compatible(
            self._groq_client_config(),
            system_prompt, user_prompt, image_path, temperature, timeout,
            json_mode=bool(schema_hint),
        )

    def chat(
        self,
        system_prompt: str = "",
        user_prompt: str = "",
        image_path: Optional[str] = None,
        schema_hint: Optional[str] = None,
        temperature: float = 0.2,
        timeout: Optional[float] = None,
    ) -> str:
        """
        Synchronous chat completion through the priority chain:
        Gemini → frontier (OpenAI-compatible) → Ollama → Groq.
        Records which engine answered in self.last_engine. Raises only if all
        configured engines fail.
        """
        timeout = timeout or settings.AI_TIMEOUT_SECONDS
        self.last_engine = None

        # 1. Native Gemini (structured output, free tier available)
        if self.gemini_ready:
            try:
                out = self._chat_gemini(system_prompt, user_prompt, image_path, schema_hint, temperature, timeout)
                self.last_engine = f"gemini:{settings.GEMINI_VISION_MODEL if image_path else settings.GEMINI_TEXT_MODEL}"
                return out
            except Exception as e:
                logger.warning(f"[AI] Gemini call failed, falling back: {e}")

        # 2. Frontier OpenAI-compatible (OpenAI, OpenRouter, ...)
        if self.frontier_ready:
            try:
                out = self._chat_frontier(system_prompt, user_prompt, image_path, schema_hint, temperature, timeout)
                self.last_engine = f"openai-compat:{settings.OPENAI_VISION_MODEL if image_path else settings.OPENAI_TEXT_MODEL}"
                return out
            except Exception as e:
                logger.warning(f"[AI] Frontier call failed, falling back: {e}")

        # 3. Local Ollama
        if self.check_ollama():
            try:
                out = self._chat_ollama(system_prompt, user_prompt, image_path, schema_hint, temperature, timeout)
                self.last_engine = f"ollama:{self.ollama_vision_model if image_path else self.ollama_text_model}"
                return out
            except Exception as e:
                logger.warning(f"[AI] Ollama call failed, falling back: {e}")
                self.reset_probe()

        # 4. Groq free tier
        if self.groq_ready:
            out = self._chat_groq(system_prompt, user_prompt, image_path, schema_hint, temperature, timeout)
            self.last_engine = f"groq:{settings.GROQ_MODEL}"
            return out

        raise RuntimeError(
            "No AI engine available. Set GEMINI_API_KEY or OPENAI_API_KEY, start Ollama (ollama serve), or set GROQ_API_KEY."
        )

    # ── Semantic similarity (free, local, no embeddings API) ────────────────

    def semantic_similarity(self, expected: str, student: str) -> float:
        """
        Cosine similarity between two short strings without any embedding API.

        Uses Ollama's /api/embed if a local embedding model is installed
        (default: nomic-embed-text, a free open model); otherwise falls back to
        a deterministic lexical-overlap score so grading never breaks offline.
        """
        if not expected or not student:
            return 0.0

        if self.check_ollama() and settings.OLLAMA_EMBED_MODEL:
            try:
                resp = httpx.post(
                    f"{self.ollama_base}/api/embed",
                    json={
                        "model": settings.OLLAMA_EMBED_MODEL,
                        "input": [expected, student],
                    },
                    timeout=30.0,
                )
                resp.raise_for_status()
                embs = [e["embedding"] for e in resp.json().get("embeddings", [])]
                if len(embs) == 2:
                    import math

                    a, b = embs
                    dot = sum(x * y for x, y in zip(a, b))
                    na = math.sqrt(sum(x * x for x in a))
                    nb = math.sqrt(sum(x * x for x in b))
                    if na and nb:
                        sim = dot / (na * nb)
                        # Cosine of open embedding models rarely reaches 1.0 even
                        # for identical text; rescale so exact matches grade correctly.
                        return float(min(1.0, max(0.0, (sim - 0.5) / 0.5)))
            except Exception as e:
                logger.warning(f"[AI] Local embedding similarity failed: {e}")

        return self._lexical_similarity(expected, student)

    @staticmethod
    def _lexical_similarity(expected: str, student: str) -> float:
        """Token-overlap (Jaccard-weighted) fallback similarity — zero deps."""
        def tokens(s: str):
            return set(re.findall(r"[a-z0-9]+", s.lower()))

        te, ts = tokens(expected), tokens(student)
        if not te or not ts:
            return 0.0
        intersection = len(te & ts)
        # Weighted overlap: how much of expected is covered by student
        recall = intersection / len(te)
        precision = intersection / len(ts)
        if precision + recall == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)  # F1


ai_provider = AIProvider()
