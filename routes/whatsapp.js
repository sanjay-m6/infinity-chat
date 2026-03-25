const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const upload = multer({ dest: os.tmpdir() });
const { MessageMedia } = require("whatsapp-web.js");
const { clients, createWaClient, getIntegrationOptions, buildChatListSnapshot, getPresence, waStatusUpdates, WA_BOOTSTRAP_MAX_CHATS, normalizeWaMessage, SETTINGS_FILE } = require('../waClient');

const resolveIds = (req, chatIdParam) => {
  let clientId = req.query?.clientId || req.body?.clientId;
  let pureId = chatIdParam;
  if (chatIdParam && chatIdParam.includes(':')) {
    const parts = chatIdParam.split(':');
    clientId = parts[0];
    pureId = parts.slice(1).join(':');
  }
  clientId = clientId || 'default';
  const client = clients.get(clientId) || clients.get('default');
  return { client, pureId, clientId };
};

const getTargetClient = (req) => {
  const cid = req.query?.clientId || req.body?.clientId || 'default';
  return clients.get(cid) || clients.get('default');
};

router.post("/send-message", async (req, res) => {
  const { to, message, clientId } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing to or message" });
  try {
    const { client, pureId, clientId: cid } = resolveIds(req, to);
    const chatId = pureId.includes('@') ? pureId : `${pureId}@c.us`;
    const sentMsg = await client.sendMessage(chatId, message);
    const normalized = normalizeWaMessage(sentMsg);
    normalized.clientId = cid;
    res.json({ ok: true, message: normalized });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/send-media", upload.single("file"), async (req, res) => {
  const { to, caption, isSticker, clientId } = req.body;
  if (!to || !req.file) return res.status(400).json({ error: "Missing to or file" });
  try {
    const { client, pureId, clientId: cid } = resolveIds(req, to);
    const chatId = pureId.includes('@') ? pureId : `${pureId}@c.us`;
    const media = MessageMedia.fromFilePath(req.file.path);
    media.filename = req.file.originalname;

    const opts = { caption: caption || "" };
    if (isSticker === 'true') {
      opts.sendMediaAsSticker = true;
      opts.stickerName = "InfinityChat";
      opts.stickerAuthor = "AI";
    }
    const sentMsg = await client.sendMessage(chatId, media, opts);
    const normalized = normalizeWaMessage(sentMsg);
    normalized.clientId = cid;

    try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.json({ ok: true, message: normalized });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

router.get("/ai-whitelist", (req, res) => {
  let settings = { integrations: { whatsapp: {} } };
  if (fs.existsSync(SETTINGS_FILE)) settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  res.json({ ok: true, aiEnabledChats: settings?.integrations?.whatsapp?.aiEnabledChats || [] });
});

router.post("/toggle-ai", async (req, res) => {
  const { chatId, enabled, clientId } = req.body;
  if (!chatId) return res.status(400).json({ error: "Missing chatId" });
  try {
    let settings = { integrations: { whatsapp: {} } };
    if (fs.existsSync(SETTINGS_FILE)) settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    if (!settings.integrations) settings.integrations = {};
    if (!settings.integrations.whatsapp) settings.integrations.whatsapp = {};

    let enabledChats = settings.integrations.whatsapp.aiEnabledChats || [];
    const cid = clientId || 'default';
    const targetId = chatId.includes(':') ? chatId : `${cid}:${chatId}`;

    if (enabled) {
      if (!enabledChats.includes(targetId)) enabledChats.push(targetId);
    } else {
      enabledChats = enabledChats.filter(id => id !== targetId);
    }
    settings.integrations.whatsapp.aiEnabledChats = enabledChats;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ ok: true, enabledChats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/media/:msgId", async (req, res) => {
  try {
    const client = getTargetClient(req);
    const msg = await client.getMessageById(req.params.msgId);
    if (!msg || !msg.hasMedia) return res.status(404).send('No media available');
    const media = await msg.downloadMedia();
    if (!media || !media.data) return res.status(404).send('Media payload empty');

    const buffer = Buffer.from(media.data, 'base64');
    res.setHeader('Content-Type', media.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

router.post("/logout", async (req, res) => {
  const id = req.query?.clientId || req.body?.clientId || 'default';
  try {
    const client = clients.get(id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    console.error(`Logout error for ${id}:`, err);
    // If logout fails, we might still want to destroy the client to allow fresh start
    try {
      const client = clients.get(id);
      if (client) await client.destroy();
    } catch (_) { }
    res.status(500).json({ ok: false, error: "Logout failed but client was destroyed for safety." });
  }
});

router.post("/clear-session", async (req, res) => {
  const { clientId } = req.body;
  const id = clientId || 'default';
  try {
    console.log(`[Session] Clearing session for: ${id}`);

    // 1. Attempt to stop the client gracefully
    try {
      const client = clients.get(id);
      if (client) {
        await client.destroy().catch(() => { });
        clients.delete(id);
      }
    } catch (_) { }

    // 2. Clear auth and cache paths
    const authPath = path.join(__dirname, '..', `.wwebjs_auth/session-${id}`);
    const cachePath = path.join(__dirname, '..', `.wwebjs_cache/session-${id}`);

    // Give it a small delay for OS to release locks
    setTimeout(() => {
      try { if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true }); } catch (e) { console.error("Auth cleanup err:", e); }
      try { if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true }); } catch (e) { console.error("Cache cleanup err:", e); }
      console.log(`[Session] Cleanup complete for ${id}.`);
    }, 1000);

    res.json({ ok: true, message: "Session cleanup initiated. Folder will be deleted shortly." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/bootstrap", async (req, res) => {
  try {
    const client = getTargetClient(req);
    const cid = req.query.clientId || 'default';
    const options = getIntegrationOptions();
    if (!options.syncEnabled) return res.json({ ok: true, ready: true, chats: [], statuses: [], clientId: cid });
    const maxChats = Number(req.query.maxChats || WA_BOOTSTRAP_MAX_CHATS);
    const chats = await buildChatListSnapshot(client, maxChats);
    res.json({ ok: true, ready: true, chats, statuses: options.showStatusFeed ? waStatusUpdates.filter(s => s.clientId === cid).slice(-40) : [], clientId: cid });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/messages/:chatId", async (req, res) => {
  try {
    const { client, pureId } = resolveIds(req, req.params.chatId);
    const limit = Math.max(50, Math.min(5000, Number(req.query.limit || 1200)));
    const chat = await client.getChatById(pureId);
    const history = await chat.fetchMessages({ limit });
    const messages = history.map((m) => normalizeWaMessage(m)).sort((a, b) => a.timestamp - b.timestamp);
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/presence/:chatId", async (req, res) => {
  try {
    const { client, pureId } = resolveIds(req, req.params.chatId);
    const presence = await getPresence(pureId, client);
    res.json({ ok: true, presence });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/status", async (req, res) => {
  const cid = req.query.clientId || 'default';
  const options = getIntegrationOptions();
  res.json({ ok: true, statuses: options.showStatusFeed ? waStatusUpdates.filter(s => s.clientId === cid).slice(-100) : [] });
});

router.get("/profile-pic/:chatId", async (req, res) => {
  try {
    const { client, pureId } = resolveIds(req, req.params.chatId);
    const contact = await client.getContactById(pureId);
    if (!contact) return res.json({ ok: false });
    const url = await contact.getProfilePicUrl();
    res.json({ ok: true, url: url || "" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
