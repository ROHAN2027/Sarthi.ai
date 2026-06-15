"""Voice service for text-to-speech and speech-to-text using ElevenLabs and Groq."""

import os
import tempfile
from collections.abc import Iterator
from functools import lru_cache

from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from groq import Groq

# Create router
router = APIRouter(prefix="/voice", tags=["voice"])

# Groq TTS voice options
DEFAULT_TTS_VOICE = os.getenv("GROQ_TTS_VOICE", "troy")
DEFAULT_TTS_MODEL = os.getenv("GROQ_TTS_MODEL", "canopylabs/orpheus-v1-english")
DEFAULT_TTS_FORMAT = os.getenv("GROQ_TTS_FORMAT", "wav")


class SpeechRequest(BaseModel):
    """Payload for generating speech audio using Groq TTS."""
    
    text: str = Field(..., min_length=1, description="Text to convert to speech")
    voice: str | None = Field(
        None, description="Voice to use (e.g., Aaliyah-PlayAI, etc.)"
    )
    model: str | None = Field(
        None, description="TTS model to use (default: canopylabs/orpheus-v1-english)"
    )
    response_format: str | None = Field(
        None,
        description="Audio format: mp3, wav, pcm"
    )


@lru_cache(maxsize=1)
def get_groq_client() -> Groq:
    """Return a cached Groq client configured from the environment."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


def build_audio_stream(request: SpeechRequest) -> Iterator[bytes]:
    """Generate speech audio using Groq TTS and stream it."""
    
    # Check if mock mode is enabled (for testing without rate limits)
    mock_mode = os.getenv("MOCK_TTS", "false").lower() == "true"
    if mock_mode:
        print(f"[MOCK TTS] Skipping audio generation for: {request.text[:60]}...")
        # Return empty audio (silence) - interview continues in text mode
        yield b''
        return
    
    client = get_groq_client()
    voice = request.voice or DEFAULT_TTS_VOICE
    model = request.model or DEFAULT_TTS_MODEL
    audio_format = request.response_format or DEFAULT_TTS_FORMAT
    
    try:
        # Call Groq TTS API
        response = client.audio.speech.create(
            model=model,
            voice=voice,
            response_format=audio_format,
            input=request.text
        )
        
        # Write to a temporary file first, then stream it
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as tmp:
            tmp_path = tmp.name
        
        # Use Groq's write_to_file method
        response.write_to_file(tmp_path)
        
        # Now read and stream the file with larger chunks for smoother playback
        with open(tmp_path, 'rb') as audio_file:
            while True:
                chunk = audio_file.read(16384)  # 16KB chunks for smoother audio
                if not chunk:
                    break
                yield chunk
        
        # Cleanup
        os.unlink(tmp_path)
                
    except Exception as exc:
        import groq
        # Check if it's a rate limit error
        if isinstance(exc, groq.RateLimitError):
            print(f"⚠️  Groq TTS rate limit hit: {exc}")
            # Return empty audio stream (silence) - let interview continue without voice
            yield b''
        else:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/tts", response_class=StreamingResponse)
async def text_to_speech(request: SpeechRequest) -> StreamingResponse:
    """Stream Groq TTS audio generated from the provided text."""
    audio_stream = build_audio_stream(request)
    audio_format = request.response_format or DEFAULT_TTS_FORMAT
    media_type = f"audio/{audio_format}" if audio_format != "mp3" else "audio/mpeg"
    return StreamingResponse(audio_stream, media_type=media_type)


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)) -> dict:
    """Convert speech audio to text using Groq Whisper.
    
    Accepts audio files in various formats (webm, mp3, m4a, wav, etc.)
    Returns the transcribed text.
    """
    try:
        # Save uploaded file temporarily
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Call Groq STT
        client = get_groq_client()
        with open(tmp_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(tmp_path, file.read()),
                model="whisper-large-v3-turbo",
                temperature=0,
                response_format="json"
            )
        
        # Cleanup
        os.unlink(tmp_path)
        
        return {
            "text": transcription.text,
            "status": "success"
        }
        
    except Exception as e:
        # Cleanup on error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"STT error: {str(e)}")


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint for the voice service."""
    return {
        "status": "ok",
        "groq_tts_configured": bool(os.getenv("GROQ_API_KEY")),
        "groq_stt_configured": bool(os.getenv("GROQ_API_KEY"))
    }
