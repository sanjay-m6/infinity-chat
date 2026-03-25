const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const FILES_FOLDER = path.join(__dirname, '../files');

if (!fs.existsSync(FILES_FOLDER)) {
  fs.mkdirSync(FILES_FOLDER, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FILES_FOLDER),
  filename: (req, file, cb) => {
    const base = (file.originalname || `chat-${Date.now()}.txt`).replace(/[^a-zA-Z0-9._-]/g, "_") || "chat.txt";
    cb(null, base);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === "text/plain" || (file.originalname && file.originalname.toLowerCase().endsWith(".txt"));
    cb(ok ? null : new Error("Only .txt files allowed"), ok);
  },
});

router.get("/chats", (req, res) => {
  try {
    if (!fs.existsSync(FILES_FOLDER)) {
      return res.json({ files: [] });
    }
    const files = fs
      .readdirSync(FILES_FOLDER)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => ({ name: f, isClosest: f === "closest-person.txt" }));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/chats/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    // Basic path traversal prevention
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ ok: false, error: "Invalid filename" });
    }
    const targetPath = path.join(FILES_FOLDER, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return res.json({ ok: true });
    } else {
      return res.status(404).json({ ok: false, error: "File not found" });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/chats/:filename/primary", (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ ok: false, error: "Invalid filename" });
    }
    const targetPath = path.join(FILES_FOLDER, filename);
    const closestPath = path.join(FILES_FOLDER, "closest-person.txt");

    if (fs.existsSync(targetPath)) {
      // Copy the content over to closest-person.txt. It acts as the canonical active system prompt.
      fs.copyFileSync(targetPath, closestPath);
      return res.json({ ok: true });
    } else {
      return res.status(404).json({ ok: false, error: "File not found" });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/upload-chat", upload.single("chat"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded. Choose a .txt chat export." });
  }
  const asClosest = req.body && (req.body.asClosest === "true" || req.body.asClosest === true);
  let filename = req.file.filename;
  if (asClosest) {
    const targetPath = path.join(FILES_FOLDER, "closest-person.txt");
    try {
      fs.renameSync(req.file.path, targetPath);
      filename = "closest-person.txt";
    } catch (err) {
      return res.status(500).json({ ok: false, error: "Failed to save as closest-person chat." });
    }
  }
  res.json({
    ok: true,
    filename,
    asClosest: !!asClosest,
    message: asClosest
      ? "Chat saved as your closest-person reference."
      : "Chat uploaded. It will be used as additional style reference.",
  });
});

module.exports = router;
