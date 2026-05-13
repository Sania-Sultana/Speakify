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
const darkModeToggle = document.getElementById("darkModeToggle");
const pageRangeStart = document.getElementById("pageRangeStart");
const pageRangeEnd = document.getElementById("pageRangeEnd");
const pageInfo = document.getElementById("pageInfo");
const applyPagesBtn = document.getElementById("applyPagesBtn");
const pageSelectionStatus = document.getElementById("pageSelectionStatus");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const pageSelection = document.querySelector(".page-selection");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const settingsOptionButtons = document.querySelectorAll(".settings-option-btn");
const settingsPanes = document.querySelectorAll(".settings-pane");
const pagesSection = document.getElementById("pagesSection");

let selectedPagePreview = "";

let extractedText = "";
let audioPath = "";
let totalPages = 0;
let uploadId = "";
let sourceType = "pdf";

// Dark Mode
const savedDarkMode = localStorage.getItem("darkMode") === "true";
if (savedDarkMode) {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "Light";
} else {
  darkModeToggle.textContent = "Dark";
}

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
  darkModeToggle.textContent = isDark ? "Light" : "Dark";
});

settingsToggle.addEventListener("click", () => {
  const isOpen = settingsPanel.classList.toggle("open");
  settingsPanel.setAttribute("aria-hidden", String(!isOpen));
});

function activateSettingsPane(paneId) {
  settingsOptionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === paneId);
  });

  settingsPanes.forEach((pane) => {
    const isActive = pane.id === paneId;
    pane.classList.toggle("is-active", isActive);
    pane.style.display = isActive ? "block" : "none";
  });
}

settingsOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateSettingsPane(button.dataset.panel);
  });
});

function updatePageSelectionSummary(startPage, endPage, selectedPages, totalPagesCount) {
  if (!pageSelectionStatus) {
    return;
  }

  pageSelectionStatus.textContent = `Selected ${startPage}-${endPage} (${selectedPages} pages) out of ${totalPagesCount} total pages.`;
}

async function previewSelectedPages() {
  if (!uploadId) {
    showMessage(uploadStatus, "error", "Upload a file before selecting pages");
    return;
  }

  const startPage = parseInt(pageRangeStart.value, 10) || 1;
  const endPage = parseInt(pageRangeEnd.value, 10) || totalPages || 1;

  applyPagesBtn.disabled = true;
  applyPagesBtn.textContent = "Applying...";
  showSpinner(true);

  try {
    const response = await fetch("/api/preview-pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        upload_id: uploadId,
        start_page: startPage,
        end_page: endPage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(uploadStatus, "error", data.error || "Unable to preview selected pages");
      return;
    }

    selectedPagePreview = data.selected_text || extractedText;
    textContent.value = selectedPagePreview;
    pageRangeStart.value = data.start_page;
    pageRangeEnd.value = data.end_page;
    pageInfo.textContent = `Total pages: ${data.total_pages || totalPages}`;
    updatePageSelectionSummary(data.start_page, data.end_page, data.selected_pages, data.total_pages || totalPages);
    activateSettingsPane("textSection");
    settingsToggle.textContent = "Settings";
    pageSelectionStatus.textContent = `Applied pages ${data.start_page}-${data.end_page}. Review text updated.`;
    showMessage(uploadStatus, "info", "Preview updated for the selected pages");
  } catch (error) {
    showMessage(uploadStatus, "error", `Error: ${error.message}`);
    if (pageSelectionStatus) {
      pageSelectionStatus.textContent = "Unable to apply the selected pages. Please try again.";
    }
  } finally {
    showSpinner(false);
    applyPagesBtn.disabled = false;
    applyPagesBtn.textContent = "Apply Pages";
  }
}

function syncPageInputs() {
  const start = parseInt(pageRangeStart.value, 10) || 1;
  const end = parseInt(pageRangeEnd.value, 10) || totalPages || 1;

  if (start > end) {
    pageRangeEnd.value = start;
  }

  if (end < start) {
    pageRangeStart.value = end;
  }

  const normalizedStart = parseInt(pageRangeStart.value, 10) || 1;
  const normalizedEnd = parseInt(pageRangeEnd.value, 10) || totalPages || 1;
  updatePageSelectionSummary(normalizedStart, normalizedEnd, normalizedEnd - normalizedStart + 1, totalPages || normalizedEnd);
}

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
      uploadId = data.upload_id || "";
      totalPages = data.total_pages || 1;
      sourceType = data.source_type || "pdf";
      
      // Update page range inputs
      pageRangeStart.value = 1;
      pageRangeEnd.value = totalPages;
      pageRangeStart.max = totalPages;
      pageRangeEnd.max = totalPages;
      const canSelectPages = totalPages > 1;
      pageSelection.style.display = canSelectPages ? "grid" : "none";
      pagesSection.style.display = canSelectPages ? "block" : "none";
      pageInfo.textContent = canSelectPages ? `Total pages: ${totalPages}` : "Document imported";
      if (pageSelectionStatus) {
        pageSelectionStatus.textContent = canSelectPages
          ? "Select a range and apply it to preview only those pages."
          : "This document has only one page, so page selection is not needed.";
      }
      
      selectedPagePreview = extractedText;
      textContent.value = extractedText;
      showMessage(uploadStatus, "success", "File uploaded successfully!");

      // Show next steps
      textSection.style.display = "block";
      settingsSection.style.display = "block";
      convertSection.style.display = "block";
      settingsPanel.classList.add("open");
      settingsPanel.setAttribute("aria-hidden", "false");
      activateSettingsPane("textSection")
      syncPageInputs();
      if (canSelectPages) {
        updatePageSelectionSummary(1, totalPages, totalPages, totalPages);
      }

      // Load voices
      loadVoices();
      
      // Update selection summary as the range changes
      pageRangeStart.addEventListener("input", syncPageInputs);
      pageRangeEnd.addEventListener("input", syncPageInputs);
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

if (applyPagesBtn) {
  applyPagesBtn.addEventListener("click", previewSelectedPages);
}

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
    const startPage = parseInt(pageRangeStart.value);
    const endPage = parseInt(pageRangeEnd.value);

    const response = await fetch("/api/synthesize-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: extractedText,
        upload_id: uploadId,
        rate: parseInt(rateSlider.value),
        volume: volumeSlider.value / 100,
        voice_id: voiceSelect.value,
        start_page: startPage,
        end_page: endPage,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      audioPath = data.audio_path;
      const filename = data.filename;

      // Set audio source and show player
      audioPlayer.src = `/api/audio/${filename}`;
      playerSection.style.display = "block";
      
      // Reset player controls
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

// Audio Player Controls
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
  totalPages = 0;
  sourceType = "pdf";

  textSection.style.display = "none";
  settingsSection.style.display = "none";
  convertSection.style.display = "none";
  playerSection.style.display = "none";
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
  pageSelection.style.display = "grid";
  pagesSection.style.display = "none";

  uploadStatus.innerHTML = "";
  convertStatus.innerHTML = "";

  audioPlayer.src = "";
  resetPlayerDisplay();
  playBtn.textContent = "Play";
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

