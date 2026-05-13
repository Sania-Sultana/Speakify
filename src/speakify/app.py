"""Flask backend for Speakify - PDF to Speech converter."""

import os
import tempfile
from pathlib import Path

import pyttsx3
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from speakify.pdf_handler import extract_text_from_pdf
from speakify.speech_synthesizer import synthesize_speech

app = Flask(__name__, static_folder="static", static_url_path="/static")

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {"pdf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size

# Initialize TTS engine
engine = pyttsx3.init()


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index() -> str:
    """Serve the main page."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/health", methods=["GET"])
def health() -> dict:
    """Health check endpoint."""
    return jsonify({"status": "healthy", "message": "Speakify is running"}), 200


@app.route("/api/upload-pdf", methods=["POST"])
def upload_pdf() -> dict:
    """Handle PDF upload and text extraction."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        # Extract text from PDF
        text = extract_text_from_pdf(filepath)

        # Clean up
        if os.path.exists(filepath):
            os.remove(filepath)

        if not text:
            return jsonify({"error": "Could not extract text from PDF"}), 400

        return jsonify({"status": "success", "text": text, "length": len(text)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/synthesize-speech", methods=["POST"])
def synthesize_audio() -> dict:
    """Convert text to speech and return audio file."""
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data["text"]

        if not text or len(text.strip()) == 0:
            return jsonify({"error": "Text cannot be empty"}), 400

        # Get optional parameters
        rate = data.get("rate", 150)
        volume = data.get("volume", 1.0)

        # Synthesize speech
        audio_path = synthesize_speech(text, rate=rate, volume=volume)

        if not audio_path or not os.path.exists(audio_path):
            return jsonify({"error": "Failed to generate audio"}), 500

        # Return audio file path for frontend to download
        return jsonify(
            {"status": "success", "audio_path": audio_path, "filename": Path(audio_path).name}
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/audio/<filename>", methods=["GET"])
def download_audio(filename: str) -> tuple:
    """Download generated audio file."""
    try:
        # Security: only allow filenames from temp folder
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], secure_filename(filename))

        if not os.path.exists(filepath):
            return jsonify({"error": "Audio file not found"}), 404

        return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=True)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/voices", methods=["GET"])
def get_voices() -> dict:
    """Get available voices for TTS."""
    try:
        voices = engine.getProperty("voices")
        voice_list = [{"id": i, "name": voice.name} for i, voice in enumerate(voices)]
        return jsonify({"voices": voice_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
