// DOM Elements
const uploadArea = document.getElementById("uploadArea");
const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");
const textSection = document.getElementById("textSection");
const textContent = document.getElementById("textContent");
const settingsSection = document.getElementById("settingsSection");
const convertSection = document.getElementById("convertSection");
const convertBtn = document.getElementById("convertBtn");
const convertStatus = document.getElementById("convertStatus");
const playerSection = document.getElementById("playerSection");
const audioPlayer = document.getElementById("audioPlayer");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const rateSlider = document.getElementById("rateSlider");
const rateValue = document.getElementById("rateValue");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const voiceSelect = document.getElementById("voiceSelect");
const spinner = document.getElementById("spinner");

let extractedText = "";
let audioPath = "";

// File Upload Handling
uploadArea.addEventListener("click", () => pdfFile.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    pdfFile.files = files;
    uploadBtn.disabled = false;
  }
});

pdfFile.addEventListener("change", () => {
  if (pdfFile.files.length > 0) {
    uploadBtn.disabled = false;
  }
});

uploadBtn.addEventListener("click", uploadPDF);

// Upload PDF
async function uploadPDF() {
  const file = pdfFile.files[0];
  if (!file) {
    showMessage(uploadStatus, "error", "Please select a PDF file");
    return;
  }

  showSpinner(true);
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      extractedText = data.text;
      textContent.value = extractedText;
      showMessage(uploadStatus, "success", "PDF uploaded successfully!");

      // Show next steps
      textSection.style.display = "block";
      settingsSection.style.display = "block";
      convertSection.style.display = "block";

      // Load voices
      loadVoices();
    } else {
      showMessage(uploadStatus, "error", data.error || "Upload failed");
    }
  } catch (error) {
    showMessage(uploadStatus, "error", `Error: ${error.message}`);
  } finally {
    showSpinner(false);
  }
}

// Load Available Voices
async function loadVoices() {
  try {
    const response = await fetch("/api/voices");
    const data = await response.json();

    if (data.voices) {
      voiceSelect.innerHTML = "";
      data.voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.id;
        option.textContent = voice.name;
        voiceSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading voices:", error);
  }
}

// Update Slider Values
rateSlider.addEventListener("input", () => {
  rateValue.textContent = rateSlider.value;
});

volumeSlider.addEventListener("input", () => {
  volumeValue.textContent = volumeSlider.value;
});

// Convert to Speech
convertBtn.addEventListener("click", convertToSpeech);

async function convertToSpeech() {
  if (!extractedText) {
    showMessage(convertStatus, "error", "No text to convert");
    return;
  }

  showSpinner(true);
  convertBtn.disabled = true;

  try {
    const response = await fetch("/api/synthesize-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: extractedText,
        rate: parseInt(rateSlider.value),
        volume: volumeSlider.value / 100,
        voice_id: voiceSelect.value,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      audioPath = data.audio_path;
      const filename = data.filename;

      // Set audio source and show player
      audioPlayer.src = `/api/audio/${filename}`;
      playerSection.style.display = "block";

      showMessage(convertStatus, "success", "Speech synthesized successfully!");
    } else {
      showMessage(convertStatus, "error", data.error || "Conversion failed");
    }
  } catch (error) {
    showMessage(convertStatus, "error", `Error: ${error.message}`);
  } finally {
    showSpinner(false);
    convertBtn.disabled = false;
  }
}

// Download Audio
downloadBtn.addEventListener("click", () => {
  if (audioPath) {
    const filename = audioPath.split("/").pop();
    const link = document.createElement("a");
    link.href = `/api/audio/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

// Reset Application
resetBtn.addEventListener("click", () => {
  pdfFile.value = "";
  extractedText = "";
  audioPath = "";
  textContent.value = "";
  uploadBtn.disabled = true;

  textSection.style.display = "none";
  settingsSection.style.display = "none";
  convertSection.style.display = "none";
  playerSection.style.display = "none";

  uploadStatus.innerHTML = "";
  convertStatus.innerHTML = "";

  audioPlayer.src = "";
});

// Utility Functions
function showMessage(element, type, message) {
  element.textContent = message;
  element.className = `status-message ${type}`;
}

function showSpinner(show) {
  spinner.style.display = show ? "block" : "none";
}

// Check server health on page load
window.addEventListener("load", async () => {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    console.log("Server status:", data.status);
  } catch (error) {
    console.error("Server connection error:", error);
  }
});
