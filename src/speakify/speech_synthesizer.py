"""Speech synthesis utilities for text-to-speech conversion."""

import os
import tempfile
from typing import Optional

import pyttsx3


def synthesize_speech(
    text: str, rate: int = 150, volume: float = 1.0, voice_id: int = 0
) -> Optional[str]:
    """
    Convert text to speech and save as audio file.

    Args:
        text: Text to convert to speech
        rate: Speech rate (words per minute)
        volume: Volume level (0.0 to 1.0)
        voice_id: Voice ID to use (0 for default)

    Returns:
        Path to generated audio file or None if synthesis fails
    """
    try:
        engine = pyttsx3.init()

        # Set voice properties
        engine.setProperty("rate", rate)
        engine.setProperty("volume", volume)

        # Set voice
        voices = engine.getProperty("voices")
        if voice_id < len(voices):
            engine.setProperty("voice", voices[voice_id].id)

        # Generate audio file in temp directory
        output_path = os.path.join(tempfile.gettempdir(), "speakify_audio.wav")
        engine.save_to_file(text, output_path)
        engine.runAndWait()

        # Verify file was created
        if os.path.exists(output_path):
            return output_path

        return None

    except Exception as e:
        print(f"Error synthesizing speech: {e}")
        return None


def get_available_voices() -> list:
    """
    Get list of available voices on the system.

    Returns:
        List of available voices
    """
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty("voices")
        return [{"id": i, "name": voice.name} for i, voice in enumerate(voices)]
    except Exception as e:
        print(f"Error getting voices: {e}")
        return []
