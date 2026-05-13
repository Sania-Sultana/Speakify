"""Tests for Speakify application."""

import os
import tempfile
from typing import Generator

import pytest

from speakify import greet
from speakify.app import app
from speakify.pdf_handler import extract_text_from_pdf, get_pdf_info
from speakify.speech_synthesizer import get_available_voices


@pytest.fixture
def client():
    """Create a test client for Flask app."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestGreeting:
    """Test greeting function."""

    def test_greet(self) -> None:
        """Test greet function returns correct message."""
        assert greet("Sania") == "Hello, Sania! Welcome to Speakify."

    def test_greet_different_name(self) -> None:
        """Test greet function with different name."""
        assert "Speakify" in greet("Test")


class TestFlaskEndpoints:
    """Test Flask API endpoints."""

    def test_index_endpoint(self, client) -> None:
        """Test main page loads."""
        response = client.get("/")
        assert response.status_code == 200

    def test_health_endpoint(self, client) -> None:
        """Test health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "healthy"

    def test_voices_endpoint(self, client) -> None:
        """Test voices endpoint."""
        response = client.get("/api/voices")
        assert response.status_code == 200
        data = response.get_json()
        assert "voices" in data

    def test_upload_pdf_no_file(self, client) -> None:
        """Test PDF upload without file."""
        response = client.post("/api/upload-pdf")
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data

    def test_synthesize_speech_no_text(self, client) -> None:
        """Test speech synthesis without text."""
        response = client.post(
            "/api/synthesize-speech", json={"text": ""}
        )
        assert response.status_code == 400


class TestSpeechSynthesizer:
    """Test speech synthesis utilities."""

    def test_get_available_voices(self) -> None:
        """Test getting available voices."""
        voices = get_available_voices()
        assert isinstance(voices, list)
        if voices:
            assert "id" in voices[0]
            assert "name" in voices[0]


class TestPDFHandler:
    """Test PDF handling utilities."""

    def test_extract_text_invalid_path(self) -> None:
        """Test extracting text from non-existent file."""
        result = extract_text_from_pdf("/nonexistent/file.pdf")
        assert result is None

    def test_get_pdf_info_invalid_path(self) -> None:
        """Test getting info from non-existent file."""
        result = get_pdf_info("/nonexistent/file.pdf")
        assert isinstance(result, dict)
        assert len(result) == 0

