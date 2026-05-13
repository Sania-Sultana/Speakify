#!/usr/bin/env python3
"""Quick start script for Speakify."""

import subprocess
import sys
import os


def main():
    """Run setup and start the application."""
    print("=" * 60)
    print("🎙️ Speakify - PDF to Speech Converter")
    print("=" * 60)
    print()

    # Check Python version
    if sys.version_info < (3, 10):
        print("❌ Error: Python 3.10+ is required")
        sys.exit(1)

    print("✅ Python version OK")
    print()

    # Check if virtual environment exists
    venv_path = os.path.join(os.getcwd(), ".venv")
    if not os.path.exists(venv_path):
        print("📦 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
        print("✅ Virtual environment created")
    else:
        print("✅ Virtual environment found")

    print()
    print("📦 Installing/upgrading dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], check=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "-e", ".[dev]"], check=True)
    print("✅ Dependencies installed")

    print()
    print("=" * 60)
    print("🚀 Starting Speakify Server...")
    print("=" * 60)
    print()
    print("Visit: http://localhost:5000")
    print()

    # Run the application
    subprocess.run([sys.executable, "src/speakify/main.py"], check=False)


if __name__ == "__main__":
    main()
