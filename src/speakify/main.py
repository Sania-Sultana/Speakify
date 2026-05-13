"""Main entry point for Speakify application."""

from speakify.app import app


def main() -> None:
    """Run the Flask application."""
    print("Starting Speakify application...")
    print("Visit http://localhost:5000 in your browser")
    app.run(debug=True, host="127.0.0.1", port=5000)


if __name__ == "__main__":
    main()

