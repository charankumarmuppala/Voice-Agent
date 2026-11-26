import io
import os
import re
import tempfile
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Map ISO language codes to our system language names
ISO_TO_LANGUAGE = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
    "ta": "Tamil",
    "english": "English",
    "hindi": "Hindi",
    "telugu": "Telugu",
    "kannada": "Kannada",
    "tamil": "Tamil"
}

LANGUAGE_TO_ISO = {
    "English": "en",
    "Hindi": "hi",
    "Telugu": "te",
    "Kannada": "kn",
    "Tamil": "ta"
}

_whisper_model = None

def get_whisper_model():
    """Lazily load faster-whisper model."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            # 'tiny' or 'base' provides sub-second latency on CPU
            logger.info("Initializing faster-whisper (model: base, device: cpu)...")
            _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            logger.info("faster-whisper model initialized successfully.")
        except Exception as e:
            logger.warning(f"Failed to initialize faster-whisper: {e}. Will fall back to Gemini Audio.")
            _whisper_model = False
    return _whisper_model if _whisper_model is not False else None


def transcribe_with_whisper(audio_bytes: bytes, language_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Transcribe audio using local faster-whisper model with auto-language detection."""
    model = get_whisper_model()
    if not model:
        return None

    try:
        # Write bytes to temp file so faster-whisper can open with PyAV
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            iso_code = LANGUAGE_TO_ISO.get(language_hint) if language_hint else None
            segments, info = model.transcribe(
                tmp_path,
                beam_size=3,
                language=iso_code,  # If None, automatically detects language!
                task="transcribe"
            )

            text_segments = [s.text.strip() for s in segments]
            full_text = " ".join(text_segments).strip()
            detected_iso = getattr(info, "language", "en")
            detected_lang = ISO_TO_LANGUAGE.get(detected_iso.lower(), "English")
            confidence = getattr(info, "language_probability", 0.9)

            if full_text:
                return {
                    "transcript": full_text,
                    "detected_language": detected_lang,
                    "confidence": float(confidence),
                    "engine": "faster-whisper"
                }
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        logger.warning(f"faster-whisper transcription error: {e}")
    return None


def transcribe_with_gemini_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> Optional[Dict[str, Any]]:
    """Transcribe audio using Google Gemini 2.5 Flash multimodal speech engine."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=15000,
                retry_options=types.HttpRetryOptions(attempts=1)
            )
        )
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)

        prompt = (
            "You are an expert multilingual speech recognition system for Indian real estate.\n"
            "Carefully listen to this audio.\n"
            "1. Transcribe EXACTLY what the user said verbatim in its native script:\n"
            "   - If Telugu: transcribe in Telugu script (తెలుగు)\n"
            "   - If Hindi: transcribe in Devanagari script (हिन्दी)\n"
            "   - If Kannada: transcribe in Kannada script (ಕನ್ನಡ)\n"
            "   - If Tamil: transcribe in Tamil script (தமிழ்)\n"
            "   - If English: transcribe in English\n"
            "2. Identify the primary spoken language (one of: English, Hindi, Telugu, Kannada, Tamil).\n"
            "Return ONLY valid JSON with keys:\n"
            "{\"transcript\": \"transcribed text here\", \"detected_language\": \"Telugu|Hindi|Kannada|Tamil|English\"}"
        )

        response = None
        for model_name in ["gemini-3.5-flash-lite", "gemini-3.8-flash"]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[audio_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                break
            except Exception:
                continue
        if response is None:
            raise RuntimeError("All Gemini audio transcription models failed")

        import json
        data = json.loads(response.text.strip())
        return {
            "transcript": data.get("transcript", "").strip(),
            "detected_language": data.get("detected_language", "English"),
            "confidence": 0.98,
            "engine": "gemini-audio"
        }
    except Exception as e:
        logger.warning(f"Gemini audio transcription error: {e}")
        return None


def transcribe_multilingual_audio(audio_bytes: bytes, mime_type: str = "audio/webm", language_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Unified Multilingual Speech Recognition with Automatic Language Detection:
    Tries faster-whisper locally; falls back to Gemini Audio multimodal model.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return {"transcript": "", "detected_language": language_hint or "English", "confidence": 0.0, "engine": "none"}

    # 1. Try Gemini Audio first if webm/wav for pristine Indian script rendering
    result = transcribe_with_gemini_audio(audio_bytes, mime_type)
    if result and result.get("transcript"):
        return result

    # 2. Try faster-whisper
    whisper_res = transcribe_with_whisper(audio_bytes, language_hint)
    if whisper_res and whisper_res.get("transcript"):
        return whisper_res

    return {
        "transcript": "",
        "detected_language": language_hint or "English",
        "confidence": 0.0,
        "engine": "failed"
    }


ELEVENLABS_FEMALE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Sarah - warm, natural female voice


def synthesize_elevenlabs_speech(text: str, language: str = "English") -> Optional[bytes]:
    """
    Generate natural multilingual female speech (MP3) using ElevenLabs API.
    Uses eleven_flash_v2_5 for ultra-low latency across English, Hindi, Telugu, Kannada, and Tamil.
    """
    from app.config import settings
    api_key = getattr(settings, "ELEVENLABS_API_KEY", None) or os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key or not text or not text.strip():
        return None

    try:
        import httpx

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_FEMALE_VOICE_ID}"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text.strip(),
            "model_id": "eleven_flash_v2_5",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.2,
                "use_speaker_boost": True,
            },
        }
        resp = httpx.post(url, headers=headers, json=payload, timeout=15.0)
        if resp.status_code == 200 and resp.content:
            return resp.content
        logger.warning(f"ElevenLabs TTS returned {resp.status_code}: {resp.text[:200]}")
        return None
    except Exception as e:
        logger.warning(f"ElevenLabs TTS error: {e}")
        return None
