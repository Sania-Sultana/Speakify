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
const pythonExe = fsSync.existsSync(path.join(rootDir, ".venv", "Scripts", "python.exe"))
  ? path.join(rootDir, ".venv", "Scripts", "python.exe")
  : "python";
const helperScript = path.join(rootDir, "scripts", "speakify_helpers.py");

async function ensureDirectories() {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(uploadMetaDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
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

app.post("/api/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const output = await runPython(["extract", "--file", req.file.path]);
    const parsed = JSON.parse(output);
    const uploadId = randomUUID();
    const metaPath = path.join(uploadMetaDir, `${uploadId}.json`);

    await fs.writeFile(metaPath, JSON.stringify(parsed), "utf8");
    await fs.unlink(req.file.path).catch(() => {});

    res.json({
      status: "success",
      upload_id: uploadId,
      text: parsed.text,
      length: parsed.text.length,
      total_pages: parsed.total_pages,
      source_type: parsed.source_type || "pdf",
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
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

  res.download(filePath);
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