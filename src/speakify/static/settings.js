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

const darkModeToggle = document.getElementById("darkModeToggle");
const textContent = document.getElementById("textContent");
const pageRangeStart = document.getElementById("pageRangeStart");
const pageRangeEnd = document.getElementById("pageRangeEnd");
const pageInfo = document.getElementById("pageInfo");
const applyPagesBtn = document.getElementById("applyPagesBtn");
const pageSelectionStatus = document.getElementById("pageSelectionStatus");
const rateSlider = document.getElementById("rateSlider");
const rateValue = document.getElementById("rateValue");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const voiceSelect = document.getElementById("voiceSelect");
const spinner = document.getElementById("spinner");
const settingsOptionButtons = document.querySelectorAll(".settings-option-btn");
const settingsPanes = document.querySelectorAll(".settings-pane");

function applyTheme() {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.body.classList.toggle("dark-mode", isDark);
  darkModeToggle.textContent = isDark ? "Light" : "Dark Mode";
}

applyTheme();

function setStoredValue(key, value) {
  localStorage.setItem(key, String(value));
}

function getStoredValue(key, fallback = "") {
  const value = localStorage.getItem(key);
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getStoredNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function showSpinner(show) {
  spinner.style.display = show ? "block" : "none";
}

function activateSettingsPane(paneId) {
  settingsOptionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === paneId);
  });

  settingsPanes.forEach((pane) => {
    pane.classList.toggle("is-active", pane.id === paneId);
    pane.style.display = pane.id === paneId ? "block" : "none";
  });
}

function updateStatus(message) {
  pageSelectionStatus.textContent = message;
}

function syncSelectionSummary(startPage, endPage, selectedPages, totalPages) {
  pageInfo.textContent = `Total pages: ${totalPages}`;
  updateStatus(`Selected ${startPage}-${endPage} (${selectedPages} pages) out of ${totalPages} total pages.`);
}

function loadSettingsFromStorage() {
  const extractedText = getStoredValue(STORAGE_KEYS.extractedText, "");
  const totalPages = getStoredNumber(STORAGE_KEYS.totalPages, 0);
  const sourceType = getStoredValue(STORAGE_KEYS.sourceType, "pdf");
  const pageStart = getStoredNumber(STORAGE_KEYS.pageStart, 1);
  const pageEnd = getStoredNumber(STORAGE_KEYS.pageEnd, totalPages || 1);
  const rate = getStoredNumber(STORAGE_KEYS.rate, 150);
  const volume = getStoredNumber(STORAGE_KEYS.volume, 100);
  const voiceId = getStoredValue(STORAGE_KEYS.voiceId, "0");

  textContent.value = extractedText || "Upload a file on the home page to preview text here.";
  pageRangeStart.value = pageStart;
  pageRangeEnd.value = pageEnd;
  pageRangeStart.max = totalPages || 1;
  pageRangeEnd.max = totalPages || 1;
  rateSlider.value = rate;
  rateValue.textContent = rate;
  volumeSlider.value = volume;
  volumeValue.textContent = volume;
  voiceSelect.value = voiceId;

  if (!extractedText) {
    updateStatus("Upload a file first, then choose pages, voice, rate, and volume.");
  } else if (totalPages > 1) {
    syncSelectionSummary(pageStart, pageEnd, pageEnd - pageStart + 1, totalPages);
  } else {
    updateStatus(sourceType === "txt" ? "TXT files use the full document." : "This document has one page.");
  }
}

async function loadVoices() {
  try {
    const response = await fetch("/api/voices");
    const data = await response.json();

    if (Array.isArray(data.voices)) {
      const currentVoiceId = getStoredValue(STORAGE_KEYS.voiceId, "0");
      voiceSelect.innerHTML = "";
      data.voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = String(voice.id);
        option.textContent = voice.name;
        voiceSelect.appendChild(option);
      });
      voiceSelect.value = currentVoiceId;
    }
  } catch (error) {
    console.error("Error loading voices:", error);
  }
}

async function previewSelectedPages() {
  const uploadId = getStoredValue(STORAGE_KEYS.uploadId, "");
  if (!uploadId) {
    updateStatus("Upload a file on the home page before applying pages.");
    return;
  }

  const startPage = parseInt(pageRangeStart.value, 10) || 1;
  const endPage = parseInt(pageRangeEnd.value, 10) || 1;

  applyPagesBtn.disabled = true;
  applyPagesBtn.textContent = "Applying...";
  showSpinner(true);

  try {
    const response = await fetch("/api/preview-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId, start_page: startPage, end_page: endPage }),
    });

    const data = await response.json();

    if (!response.ok) {
      updateStatus(data.error || "Unable to apply selected pages.");
      return;
    }

    textContent.value = data.selected_text || "";
    pageRangeStart.value = data.start_page;
    pageRangeEnd.value = data.end_page;
    setStoredValue(STORAGE_KEYS.pageStart, data.start_page);
    setStoredValue(STORAGE_KEYS.pageEnd, data.end_page);
    updateStatus(`Applied pages ${data.start_page}-${data.end_page}.`);
    syncSelectionSummary(data.start_page, data.end_page, data.selected_pages, data.total_pages || 0);
    activateSettingsPane("textSection");
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  } finally {
    showSpinner(false);
    applyPagesBtn.disabled = false;
    applyPagesBtn.textContent = "Apply Pages";
  }
}

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", String(isDark));
  darkModeToggle.textContent = isDark ? "Light" : "Dark Mode";
});

settingsOptionButtons.forEach((button) => {
  button.addEventListener("click", () => activateSettingsPane(button.dataset.panel));
});

pageRangeStart.addEventListener("input", () => {
  const start = parseInt(pageRangeStart.value, 10) || 1;
  const end = parseInt(pageRangeEnd.value, 10) || start;
  if (start > end) pageRangeEnd.value = start;
  setStoredValue(STORAGE_KEYS.pageStart, pageRangeStart.value);
});

pageRangeEnd.addEventListener("input", () => {
  const start = parseInt(pageRangeStart.value, 10) || 1;
  const end = parseInt(pageRangeEnd.value, 10) || start;
  if (end < start) pageRangeStart.value = end;
  setStoredValue(STORAGE_KEYS.pageEnd, pageRangeEnd.value);
});

rateSlider.addEventListener("input", () => {
  rateValue.textContent = rateSlider.value;
  setStoredValue(STORAGE_KEYS.rate, rateSlider.value);
});

volumeSlider.addEventListener("input", () => {
  volumeValue.textContent = volumeSlider.value;
  setStoredValue(STORAGE_KEYS.volume, volumeSlider.value);
});

voiceSelect.addEventListener("change", () => {
  setStoredValue(STORAGE_KEYS.voiceId, voiceSelect.value);
});

applyPagesBtn.addEventListener("click", previewSelectedPages);

window.addEventListener("load", async () => {
  applyTheme();
  loadSettingsFromStorage();
  await loadVoices();
  loadSettingsFromStorage();
});

window.addEventListener("storage", (event) => {
  if (event.key === "darkMode") {
    applyTheme();
  }
});
