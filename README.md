# Speakify 🎙️

**Convert your PDF documents to speech with a single click!**

Speakify is a modern web application that extracts text from PDF files and converts them to audio using text-to-speech technology. It features an intuitive interface with customizable voice settings, speech rate control, and volume adjustment.

## Features

✨ **PDF to Speech Conversion** - Upload any PDF and convert its content to audio  
🎤 **Multiple Voices** - Choose from available system voices  
⚙️ **Customizable Settings** - Adjust speech rate and volume  
🎨 **Modern UI** - Beautiful, responsive interface  
💾 **Download Audio** - Save generated audio files  
⚡ **Fast & Efficient** - Quick text extraction and synthesis  

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML + CSS + JavaScript |
| **Backend** | Python + Flask |
| **PDF Reading** | PyPDF2 |
| **Voice Engine** | pyttsx3 |

## Installation

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

### Setup Instructions (Windows PowerShell)

1. **Navigate to project directory:**
   ```powershell
   cd Speakify
   ```

2. **Create and activate virtual environment:**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. **Upgrade pip and install all dependencies:**
   ```powershell
   python -m pip install --upgrade pip
   pip install -e .[dev]
   ```

## Usage

### Running the Application

Start the Flask development server:

```powershell
python src/speakify/app.py
```

Or using Python module:

```powershell
python -m speakify.app
```

The application will be available at: **http://localhost:5000**

### How to Use

1. **Upload PDF** - Click or drag & drop a PDF file
2. **Review Text** - Check the extracted text
3. **Configure Voice** - Choose voice, speech rate, and volume
4. **Convert** - Click "Convert to Speech" button
5. **Play & Download** - Listen and download the audio file

## Project Structure

```
Speakify/
├── src/
│   └── speakify/
│       ├── __init__.py              # Package initialization
│       ├── app.py                   # Flask application
│       ├── pdf_handler.py           # PDF text extraction
│       ├── speech_synthesizer.py    # Text-to-speech conversion
│       ├── main.py                  # Main entry point
│       └── static/
│           ├── index.html           # Frontend UI
│           ├── style.css            # Styling
│           └── script.js            # Frontend logic
├── tests/
│   └── test_main.py                 # Unit tests
├── pyproject.toml                   # Project configuration
├── README.md                        # This file
└── .gitignore                       # Git ignore rules
```

## Development

### Code Quality

Lint code:
```powershell
ruff check .
```

Format code:
```powershell
black .
```

Type checking:
```powershell
mypy src
```

### Running Tests

```powershell
pytest
```

With coverage:
```powershell
pytest --cov=src/speakify --cov-report=term-missing
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main page |
| GET | `/api/health` | Health check |
| POST | `/api/upload-pdf` | Upload and extract PDF text |
| POST | `/api/synthesize-speech` | Convert text to speech |
| GET | `/api/audio/<filename>` | Download audio file |
| GET | `/api/voices` | Get available voices |

## Dependencies

### Core
- **Flask** (3.0.0+) - Web framework
- **pyttsx3** (2.90+) - Text-to-speech engine
- **PyPDF2** (3.0.0+) - PDF processing

### Development
- **pytest** - Testing framework
- **pytest-cov** - Coverage reporting
- **ruff** - Code linting
- **black** - Code formatting
- **mypy** - Type checking
- **build** - Build tool

## Configuration

### File Size Limit

The default maximum file size is 50MB. To change it, modify `app.py`:

```python
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # Change this value
```

### Server Configuration

Change host/port in `app.py`:

```python
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
```

## Troubleshooting

### PDF Not Uploading
- Check file size (max 50MB)
- Ensure it's a valid PDF file
- Check browser console for errors

### No Audio Output
- Verify pyttsx3 is installed correctly
- Check system audio settings
- Try different voice/settings

### Server Won't Start
- Ensure port 5000 is not in use
- Check Python installation
- Install all dependencies: `pip install -e .[dev]`

## Future Enhancements

- 🔐 User authentication
- 📁 Batch PDF processing
- 🌐 Multiple language support
- 📊 Processing history
- ☁️ Cloud storage integration

## License

This project is open source and available under the MIT License.

---

**Made with ❤️ for accessibility and learning**
