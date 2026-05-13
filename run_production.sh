#!/bin/bash

# Speakify Production Runner (Linux/Mac)

echo ""
echo "========================================"
echo "  SPEAKIFY - PDF to Speech Converter"
echo "  Production Mode"
echo "========================================"
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Start the Node.js app
echo "[*] Starting Speakify application..."
echo "[*] Server will be available at: http://0.0.0.0:5000"
echo "[*] Or from this machine: http://localhost:5000"
echo ""
echo "[*] Press CTRL+C to stop the server"
echo ""

node server.js
