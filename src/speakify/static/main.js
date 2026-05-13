const uploadArea = document.getElementById("uploadArea");
const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");
const convertSection = document.getElementById("convertSection");
const convertBtn = document.getElementById("convertBtn");
const convertStatus = document.getElementById("convertStatus");
const playerSection = document.getElementById("playerSection");
const audioPlayer = document.getElementById("audioPlayer");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const spinner = document.getElementById("spinner");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const currentSettingsSummary = document.getElementById("currentSettingsSummary");

const STORAGE_KEYS = {
  uploadId: "speakify.uploadId",
  extractedText: "speakify.extractedText",
  totalPages: "speakify.totalPages",
  sourceType: "speakify.sourceType",
  pageStart: "speakify.pageStart",
  pageEnd: "speakify.pageEnd",
  rate: "speakify.rate",
  volume: "speakify.volume",
  voiceId: "speakify.voiceId",
};

let audioPath = "";

function applyTheme() {
  document.body.classList.toggle("dark-mode", localStorage.getItem("darkMode") === "true");
}

function showMessage(element, type, message) {
  element.textContent = message;
  element.className = `status-message ${type}`;
}

function showSpinner(show) {
  spinner.style.display = show ? "block" : "none";
}

function resetPlayerDisplay() {
  progressBar.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStoredValue(key, fallback = "") {
  const value = localStorage.getItem(key);
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getStoredNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getPlaybackSettings() {
  return {
    uploadId: getStoredValue(STORAGE_KEYS.uploadId, ""),
    text: getStoredValue(STORAGE_KEYS.extractedText, ""),
    startPage: getStoredNumber(STORAGE_KEYS.pageStart, 1),
    endPage: getStoredNumber(STORAGE_KEYS.pageEnd, 1),
    rate: getStoredNumber(STORAGE_KEYS.rate, 150),
    volume: getStoredNumber(STORAGE_KEYS.volume, 100) / 100,
    voiceId: getStoredValue(STORAGE_KEYS.voiceId, "0"),
  };
}

function syncSummary() {
  if (!currentSettingsSummary) {
    return;
  }

  const settings = getPlaybackSettings();
  if (!settings.uploadId) {
    currentSettingsSummary.textContent = "Open Settings after uploading a file to choose pages, voice, rate, and volume.";
    return;
  }

  currentSettingsSummary.textContent = `Pages ${settings.startPage}-${settings.endPage}, voice ${settings.voiceId}, rate ${settings.rate}, volume ${Math.round(settings.volume * 100)}%.`;
}

function saveUploadState(data) {
  localStorage.setItem(STORAGE_KEYS.uploadId, data.upload_id || "");
  localStorage.setItem(STORAGE_KEYS.extractedText, data.text || "");
  localStorage.setItem(STORAGE_KEYS.totalPages, String(data.total_pages || 0));
  localStorage.setItem(STORAGE_KEYS.sourceType, data.source_type || "pdf");
  localStorage.setItem(STORAGE_KEYS.pageStart, "1");
  localStorage.setItem(STORAGE_KEYS.pageEnd, String(data.total_pages || 1));
  syncSummary();
}

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
      saveUploadState(data);
      showMessage(uploadStatus, "success", "File uploaded successfully!");
      convertSection.style.display = "block";
      syncSummary();
    } else {
      showMessage(uploadStatus, "error", data.error || "Upload failed");
    }
  } catch (error) {
    showMessage(uploadStatus, "error", `Error: ${error.message}`);
  } finally {
    showSpinner(false);
  }
}

async function loadVoices() {
  try {
    await fetch("/api/voices");
  } catch (error) {
    console.error("Error loading voices:", error);
  }
}

async function convertToSpeech() {
  const settings = getPlaybackSettings();

  if (!settings.uploadId) {
    showMessage(convertStatus, "error", "Upload a file and configure settings first");
    return;
  }

  if (!settings.text) {
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
        text: settings.text,
        upload_id: settings.uploadId,
        rate: settings.rate,
        volume: settings.volume,
        voice_id: settings.voiceId,
        start_page: settings.startPage,
        end_page: settings.endPage,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      audioPath = data.audio_path;
      audioPlayer.src = `/api/audio/${data.filename}`;
      playerSection.style.display = "block";
      audioPlayer.currentTime = 0;
      playBtn.textContent = "Play";
      resetPlayerDisplay();
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

uploadArea.addEventListener("click", () => pdfFile.click());
uploadBtn.addEventListener("click", uploadPDF);

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

convertBtn.addEventListener("click", convertToSpeech);

playBtn.addEventListener("click", () => {
  if (audioPlayer.paused) {
    audioPlayer.play();
    playBtn.textContent = "Playing";
  }
});

pauseBtn.addEventListener("click", () => {
  audioPlayer.pause();
  playBtn.textContent = "Play";
});

stopBtn.addEventListener("click", () => {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  playBtn.textContent = "Play";
  resetPlayerDisplay();
});

audioPlayer.addEventListener("play", () => {
  playBtn.textContent = "Playing";
});

audioPlayer.addEventListener("pause", () => {
  playBtn.textContent = "Play";
});

audioPlayer.addEventListener("timeupdate", () => {
  progressBar.value = audioPlayer.currentTime;
  currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("loadedmetadata", () => {
  progressBar.max = audioPlayer.duration;
  durationEl.textContent = formatTime(audioPlayer.duration);
});

progressBar.addEventListener("input", () => {
  audioPlayer.currentTime = progressBar.value;
});

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

resetBtn.addEventListener("click", () => {
  pdfFile.value = "";
  audioPath = "";
  uploadBtn.disabled = true;
  convertSection.style.display = "none";
  playerSection.style.display = "none";
  uploadStatus.innerHTML = "";
  convertStatus.innerHTML = "";
  audioPlayer.src = "";
  resetPlayerDisplay();
  playBtn.textContent = "Play";

  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  syncSummary();
});

window.addEventListener("load", async () => {
  applyTheme();
  syncSummary();
  await loadVoices();
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    console.log("Server status:", data.status);
  } catch (error) {
    console.error("Server connection error:", error);
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === "darkMode") {
    applyTheme();
  }
});
