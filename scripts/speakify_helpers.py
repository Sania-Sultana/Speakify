"""Helper CLI for Speakify Node.js backend."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import time
import uuid
import sys
import zipfile
from xml.etree import ElementTree as ET
from pathlib import Path

import PyPDF2
import pyttsx3


def extract_pdf(pdf_path: str) -> dict:
    pages: list[str] = []
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            pages.append(page.extract_text() or "")

    text = "\n\n".join(page_text.strip() for page_text in pages).strip()
    return {
        "text": text,
        "pages": pages,
        "total_pages": len(pages),
    }


def extract_docx(docx_path: str) -> dict:
    namespace = {
        "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    }

    with zipfile.ZipFile(docx_path) as archive:
        document_xml = archive.read("word/document.xml")

    root = ET.fromstring(document_xml)
    paragraphs: list[str] = []

    for paragraph in root.findall(".//w:p", namespace):
        parts = [node.text for node in paragraph.findall(".//w:t", namespace) if node.text]
        paragraph_text = "".join(parts).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    text = "\n\n".join(paragraphs).strip()
    return {
        "text": text,
        "pages": [text] if text else [],
        "total_pages": 1 if text else 0,
    }


def extract_text_file(text_path: str) -> dict:
    text = Path(text_path).read_text(encoding="utf-8")
    cleaned = text.strip()
    return {
        "text": cleaned,
        "pages": [cleaned] if cleaned else [],
        "total_pages": 1 if cleaned else 0,
    }


def extract_document(file_path: str) -> dict:
    suffix = Path(file_path).suffix.lower()

    if suffix == ".pdf":
        result = extract_pdf(file_path)
        result["source_type"] = "pdf"
        return result

    if suffix == ".docx":
        result = extract_docx(file_path)
        result["source_type"] = "docx"
        return result

    if suffix == ".txt":
        result = extract_text_file(file_path)
        result["source_type"] = "txt"
        return result

    raise ValueError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.")


def get_voices() -> dict:
    engine = pyttsx3.init()
    voices = engine.getProperty("voices")
    return {"voices": [{"id": index, "name": voice.name} for index, voice in enumerate(voices)]}


def synthesize_text(text_file: str, rate: int, volume: float, voice_id: int) -> dict:
    text = Path(text_file).read_text(encoding="utf-8")
    engine = pyttsx3.init()
    engine.setProperty("rate", rate)
    engine.setProperty("volume", volume)

    voices = engine.getProperty("voices")
    if 0 <= voice_id < len(voices):
        engine.setProperty("voice", voices[voice_id].id)

    audio_dir = Path(tempfile.gettempdir()) / "speakify-node" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    filename = f"speakify_{uuid.uuid4().hex}.wav"
    output_path = audio_dir / filename

    engine.save_to_file(text, str(output_path))
    engine.runAndWait()

    for _ in range(20):
        if output_path.exists():
            break
        time.sleep(0.1)

    if not output_path.exists():
        raise RuntimeError("Failed to generate audio")

    return {"audio_path": str(output_path), "filename": filename}


def main() -> int:
    parser = argparse.ArgumentParser(description="Speakify helper commands")
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract_parser = subparsers.add_parser("extract", help="Extract document text")
    extract_parser.add_argument("--file", required=True)

    subparsers.add_parser("voices", help="List available voices")

    synthesize_parser = subparsers.add_parser("synthesize", help="Synthesize speech")
    synthesize_parser.add_argument("--text-file", required=True)
    synthesize_parser.add_argument("--rate", type=int, default=150)
    synthesize_parser.add_argument("--volume", type=float, default=1.0)
    synthesize_parser.add_argument("--voice-id", type=int, default=0)

    args = parser.parse_args()

    try:
        if args.command == "extract":
            result = extract_document(args.file)
        elif args.command == "voices":
            result = get_voices()
        elif args.command == "synthesize":
            result = synthesize_text(args.text_file, args.rate, args.volume, args.voice_id)
        else:
            raise RuntimeError("Unknown command")

        print(json.dumps(result))
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())