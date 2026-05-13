const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");

dotenv.config();

const app = express();
const rootDir = __dirname;
const staticDir = path.join(rootDir, "src", "speakify", "static");
const tempDir = path.join(os.tmpdir(), "speakify-node");
const uploadMetaDir = path.join(tempDir, "uploads");
const audioDir = path.join(tempDir, "audio");
const supportedExtensions = new Set([".pdf", ".docx", ".txt"]);
const pythonExe = fsSync.existsSync(path.join(rootDir, ".venv", "Scripts", "python.exe"))
  ? path.join(rootDir, ".venv", "Scripts", "python.exe")
  : "python";
const helperScript = path.join(rootDir, "scripts", "speakify_helpers.py");

async function ensureDirectories() {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(uploadMetaDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
}

function isSupportedUpload(filename) {
  return supportedExtensions.has(path.extname(filename).toLowerCase());
}

async function getFileSignature(filePath, bytesToRead = 8) {
  const buffer = Buffer.alloc(bytesToRead);
  const fd = await fs.open(filePath, "r");
  try {
    await fd.read(buffer, 0, bytesToRead, 0);
    return buffer;
  } finally {
    await fd.close();
  }
}

async function validateFileMagic(filePath, filename) {
  const ext = path.extname(filename).toLowerCase();
  const signature = await getFileSignature(filePath);

  // PDF: starts with %PDF
  if (ext === ".pdf") {
    if (signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46) {
      return true;
    } else {
      throw new Error("File is not a valid PDF. The file content doesn't match PDF format.");
    }
  }

  // DOCX: ZIP file (starts with PK\x03\x04)
  if (ext === ".docx") {
    if (signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04) {
      return true;
    } else {
      throw new Error("File is not a valid DOCX. The file content doesn't match DOCX format (should be a ZIP archive).");
    }
  }

  // TXT: just verify it's not binary
  if (ext === ".txt") {
    return true; // Allow any text file
  }

  throw new Error("Unsupported file extension.");
}

function getUploadLabel(sourceType) {
  if (sourceType === "docx") {
    return "DOCX";
  }

  if (sourceType === "txt") {
    return "TXT";
  }

  return "PDF";
}

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExe, [helperScript, ...args], { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `Python helper exited with code ${code}`));
    });
  });
}

function safePageRange(startPage, endPage, totalPages) {
  const safeStart = Math.max(1, Math.min(Number(startPage) || 1, totalPages));
  const safeEnd = Math.max(safeStart, Math.min(Number(endPage) || totalPages, totalPages));
  return [safeStart, safeEnd];
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/static", express.static(staticDir));

const upload = multer({ dest: tempDir });

app.get("/", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get("/settings", (_req, res) => {
  res.sendFile(path.join(staticDir, "settings.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", message: "Speakify is running on Node.js" });
});

app.get("/api/voices", async (_req, res) => {
  try {
    const output = await runPython(["voices"]);
    res.json(JSON.parse(output));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function handleDocumentUpload(req, res) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    console.log(`[UPLOAD] File received: ${req.file.originalname}`);
    console.log(`[UPLOAD] File extension: ${path.extname(req.file.originalname).toLowerCase()}`);
    console.log(`[UPLOAD] File path: ${req.file.path}`);
    console.log(`[UPLOAD] File size: ${req.file.size} bytes`);

    // Check file extension first
    if (!isSupportedUpload(req.file.originalname)) {
      console.log(`[UPLOAD] ERROR: Unsupported extension for ${req.file.originalname}`);
      await fs.unlink(req.file.path).catch(() => {});
      res.status(400).json({ 
        error: `Unsupported file type. File must be .pdf, .docx, or .txt (you uploaded: ${path.extname(req.file.originalname)})` 
      });
      return;
    }

    // Validate file content matches the extension (magic bytes check)
    try {
      console.log(`[UPLOAD] Validating magic bytes for ${path.extname(req.file.originalname).toLowerCase()}`);
      await validateFileMagic(req.file.path, req.file.originalname);
      console.log(`[UPLOAD] Magic bytes validation passed`);
    } catch (validationError) {
      console.log(`[UPLOAD] Magic bytes validation failed: ${validationError.message}`);
      await fs.unlink(req.file.path).catch(() => {});
      res.status(400).json({ error: validationError.message });
      return;
    }

    console.log(`[UPLOAD] Starting Python extraction for ${req.file.originalname}`);
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1); // Remove the dot
    const output = await runPython(["extract", "--file", req.file.path, "--file-type", fileType]);
    const parsed = JSON.parse(output);
    const uploadId = randomUUID();
    const metaPath = path.join(uploadMetaDir, `${uploadId}.json`);

    await fs.writeFile(metaPath, JSON.stringify(parsed), "utf8");
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[UPLOAD] SUCCESS: Uploaded ${req.file.originalname} with ID ${uploadId}`);

    res.json({
      status: "success",
      upload_id: uploadId,
      text: parsed.text,
      length: parsed.text.length,
      total_pages: parsed.total_pages,
      source_type: parsed.source_type || "pdf",
      source_label: getUploadLabel(parsed.source_type || "pdf"),
    });
  } catch (error) {
    console.log(`[UPLOAD] EXCEPTION: ${error.message}`);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
}

app.post("/api/upload-pdf", upload.single("file"), handleDocumentUpload);
app.post("/api/upload-document", upload.single("file"), handleDocumentUpload);

app.post("/api/preview-pages", async (req, res) => {
  try {
    const { upload_id: uploadId, start_page: startPage, end_page: endPage } = req.body || {};

    if (!uploadId) {
      res.status(400).json({ error: "No upload_id provided" });
      return;
    }

    const metaPath = path.join(uploadMetaDir, `${uploadId}.json`);
    const metaRaw = await fs.readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw);
    const pages = Array.isArray(meta.pages) ? meta.pages : [];

    if (pages.length === 0) {
      const fallbackText = typeof meta.text === "string" ? meta.text.trim() : "";
      res.json({
        status: "success",
        selected_text: fallbackText,
        start_page: 1,
        end_page: 1,
        selected_pages: fallbackText ? 1 : 0,
        total_pages: 0,
      });
      return;
    }

    const [safeStart, safeEnd] = safePageRange(startPage, endPage, pages.length);
    const selectedText = pages.slice(safeStart - 1, safeEnd).join("\n\n").trim();

    res.json({
      status: "success",
      selected_text: selectedText || (typeof meta.text === "string" ? meta.text.trim() : ""),
      start_page: safeStart,
      end_page: safeEnd,
      selected_pages: safeEnd - safeStart + 1,
      total_pages: pages.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/synthesize-speech", async (req, res) => {
  try {
    const { text, upload_id: uploadId, start_page: startPage, end_page: endPage, rate = 150, volume = 1.0, voice_id: voiceId = 0 } = req.body || {};

    let selectedText = typeof text === "string" ? text : "";

    if (uploadId) {
      const metaPath = path.join(uploadMetaDir, `${uploadId}.json`);
      const metaRaw = await fs.readFile(metaPath, "utf8");
      const meta = JSON.parse(metaRaw);
      const pages = Array.isArray(meta.pages) ? meta.pages : [];

      if (pages.length > 0) {
        const [safeStart, safeEnd] = safePageRange(startPage, endPage, pages.length);
        selectedText = pages.slice(safeStart - 1, safeEnd).join("\n\n").trim();
      }

      if (!selectedText.trim() && typeof meta.text === "string") {
        selectedText = meta.text.trim();
      }
    }

    if (!selectedText.trim()) {
      res.status(400).json({ error: "No text provided" });
      return;
    }

    const textFile = path.join(tempDir, `${randomUUID()}.txt`);
    await fs.writeFile(textFile, selectedText, "utf8");

    const output = await runPython([
      "synthesize",
      "--text-file",
      textFile,
      "--rate",
      String(rate),
      "--volume",
      String(volume),
      "--voice-id",
      String(voiceId),
    ]);

    await fs.unlink(textFile).catch(() => {});

    const parsed = JSON.parse(output);
    res.json({
      status: "success",
      audio_path: parsed.audio_path,
      filename: parsed.filename,
      download_url: `/api/audio/${parsed.filename}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/audio/:filename", async (req, res) => {
  const filePath = path.join(audioDir, path.basename(req.params.filename));

  if (!fsSync.existsSync(filePath)) {
    res.status(404).json({ error: "Audio file not found" });
    return;
  }

  res.download(filePath, path.basename(filePath));
});

app.get("/api/supported-formats", (_req, res) => {
  res.json({
    status: "success",
    formats: ["pdf", "docx", "txt"],
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "0.0.0.0";

ensureDirectories()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Speakify Node server running on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Speakify:", error);
    process.exit(1);
  });