const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");
const { getReply, transcribeAudio, getVisionReply, generateImage } = require("./aiService");
const {
  client,
  getIntegrationOptions,
  normalizeWaMessage,
  buildChatListSnapshot,
  waStatusUpdates,
  SETTINGS_FILE
} = require("./waClient");

const FILES_FOLDER = path.join(__dirname, "files");
const { trackMessage } = require("./analytics");
const { parseCommand, isAiTask, extractAiTask } = require("./commands");
const { fireWebhooks } = require("./webhooks");

const MAX_MEMORY_PER_CHAT = 15;
const conversationMemory = new Map();

function addToMemory(chatId, messageObj) {
  if (!chatId) return;
  if (!conversationMemory.has(chatId)) conversationMemory.set(chatId, []);
  const history = conversationMemory.get(chatId);
  history.push({ body: messageObj.body || '', isOutbound: !!messageObj.isOutbound, timestamp: messageObj.timestamp || Date.now() });
  if (history.length > MAX_MEMORY_PER_CHAT) history.splice(0, history.length - MAX_MEMORY_PER_CHAT);
}

function setupSocket(io, targetClient, clientId = 'default') {
  let isReady = false;

  targetClient.on("qr", async (qr) => {
    try {
      const dataUrl = await qrcode.toDataURL(qr, { margin: 2, width: 280 });
      io.emit("qr", { dataUrl, clientId });
    } catch (err) {
      console.error(`[${clientId}] QR error:`, err.message);
    }
  });

  targetClient.on("auth_failure", (message) => {
    isReady = false;
    io.emit("connection_state", { state: "AUTH_FAILURE", message: String(message || "Authentication failed"), clientId });
  });

  targetClient.on("disconnected", (reason) => {
    isReady = false;
    io.emit("connection_state", { state: "DISCONNECTED", message: String(reason || "Client disconnected"), clientId });
  });

  targetClient.on("loading_screen", (percent, message) => {
    io.emit("connection_state", {
      state: "LOADING",
      percent: Number(percent || 0),
      message: message || "Loading session",
      clientId
    });
  });

  targetClient.on("ready", () => {
    isReady = true;
    io.emit("ready", { clientId });

    const options = getIntegrationOptions();
    if (!options.syncEnabled) return;

    buildChatListSnapshot(targetClient, 80)
      .then((snapshot) => io.emit("sync_snapshot", { chats: snapshot, statuses: options.showStatusFeed ? waStatusUpdates.slice(-40) : [], clientId }))
      .catch((err) => console.error(`[${clientId}] Bootstrap error:`, err.message));
  });

  io.on("connection", (socket) => {
    if (isReady) socket.emit("ready", { clientId });
  });

  targetClient.on("message_create", async (msg) => {
    const options = getIntegrationOptions();
    if (!options.syncEnabled) return;

    const normalized = normalizeWaMessage(msg);
    if (normalized.isStatus) return;
    normalized.clientId = clientId;

    try {
      const contact = await msg.getContact();
      normalized.fromName = contact.name || contact.pushname || contact.shortName || normalized.chatId;
    } catch (_) {
      normalized.fromName = normalized.chatId;
    }

    io.emit("message", normalized);
    if (normalized.isOutbound) trackMessage('sent', normalized.chatId, null, clientId);
    else trackMessage('received', normalized.chatId, null, clientId);

    io.emit("chat_update", {
      id: normalized.chatId,
      lastMessageText: normalized.body,
      timestamp: normalized.timestamp,
      unreadCount: normalized.isOutbound ? 0 : undefined,
      clientId
    });
  });

  targetClient.on("message_ack", (msg, ack) => {
    const id = (msg.id && msg.id._serialized) ? msg.id._serialized : null;
    if (!id) return;
    io.emit("message_ack", { id, ack: typeof ack === "number" ? ack : 0, clientId });
  });

  targetClient.on("change_state", (state) => {
    io.emit("connection_state", { state, clientId });
  });

  targetClient.on("message", async (msg) => {
    const options = getIntegrationOptions();

    if (msg.isStatus) {
      if (!options.showStatusFeed) return;
      const statusPayload = normalizeWaMessage(msg, { chatId: "status@broadcast" });
      statusPayload.clientId = clientId;
      waStatusUpdates.push(statusPayload);
      if (waStatusUpdates.length > 200) waStatusUpdates.splice(0, waStatusUpdates.length - 200);
      io.emit("status_update", statusPayload);
      return;
    }

    const text = (msg.body || "").trim();
    let fromName = msg.from;
    try {
      const contact = await msg.getContact();
      fromName = contact.name || contact.pushname || contact.shortName || msg.from;
    } catch (_) { }

    const payload = normalizeWaMessage(msg, {
      id: `${msg.from}-${Date.now()}`,
      from: msg.from,
    });
    payload.fromName = fromName || msg.from;
    payload.clientId = clientId;

    if (options.syncEnabled) {
      io.emit("message", payload);
    }

    fireWebhooks('message', payload, clientId).catch(() => { });

    let isAllowedChat = false;
    try {
      const chat = await msg.getChat();
      const chatId = (chat.id && chat.id._serialized) ? chat.id._serialized : String(chat.id || "");
      const isStatusChat = /status@broadcast|@\w*broadcast\b/.test(chatId);
      const enabledChats = Array.isArray(options.aiEnabledChats) ? options.aiEnabledChats : [];
      isAllowedChat = !isStatusChat && (options.replyToAllChats || enabledChats.includes(chatId));
    } catch (_) { }

    if (!text && !msg.hasMedia) return;
    if (!options.autoReplyEnabled || !isAllowedChat) return;

    let messageText = text;
    let pendingMedia = null;

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.mimetype) {
          if (media.mimetype.startsWith('audio/')) {
            messageText = await transcribeAudio(media.data, media.mimetype);

          } else if (media.mimetype.startsWith('image/')) {
            pendingMedia = { data: media.data, mimetype: media.mimetype };
          }
        }
      } catch (err) {
        console.error('[Media] processing failed:', err.message);
      }
    }

    if (!messageText && !pendingMedia) return;
    if (!messageText) messageText = "";


    const chatObj = await msg.getChat().catch(() => null);
    const isGroupChat = chatObj && chatObj.isGroup;

    if (isGroupChat && options.replyOnlyOnMention) {
      const botId = targetClient.info && targetClient.info.wid ? targetClient.info.wid._serialized : null;
      const mentionedIds = msg.mentionedIds || [];
      const isMentioned = botId && mentionedIds.some(id => {
        const serialized = (id && id._serialized) ? id._serialized : String(id || '');
        return serialized === botId;
      });
      if (!isMentioned) return;
      messageText = messageText.replace(/@\d+/g, '').trim();
      if (!messageText) return;
    }

    try {
      const settings = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) : null;
      const providerConfig = settings && settings.activeProvider && settings.providers[settings.activeProvider];
      if (!providerConfig || !providerConfig.apiKey) return;

      io.emit("bot_typing", { contactId: msg.from, clientId });
      const replyChatId = msg.fromMe ? (msg.to || msg.from) : (msg.from || msg.to);

      const cmd = parseCommand(messageText);
      if (cmd) {
        const context = {
          history: conversationMemory.get(replyChatId) || [],
          historyLength: (conversationMemory.get(replyChatId) || []).length,
          provider: settings.activeProvider || 'unknown',
          model: settings.providers?.[settings.activeProvider]?.model || 'unknown',
          clearMemory: () => conversationMemory.delete(replyChatId)
        };
        const result = cmd.handler(cmd.args, context);
        if (isAiTask(result)) {
          messageText = extractAiTask(result);
        } else {
          if (result) await msg.reply(result);
          io.emit("bot_typing_stop", { contactId: msg.from, clientId });
          return;
        }
      }

      addToMemory(replyChatId, { body: messageText || (pendingMedia ? '[User sent an image]' : ''), isOutbound: false, timestamp: Date.now() });
      const chatHistory = conversationMemory.get(replyChatId) || [];
      const reply = await getReply(FILES_FOLDER, messageText, chatHistory, pendingMedia);


      if (reply) {
        io.emit("bot_typing_stop", { contactId: msg.from, clientId });
        let finalReply = reply;
        let extractedGif = null;
        let extractedSticker = null;
        let extractedPhoto = null;
        let extractedGenImage = null;

        const photoMatch = finalReply.match(/\[PHOTO:\s*(.*?)\]/i);
        if (photoMatch) {
          extractedPhoto = photoMatch[1].trim();
          finalReply = finalReply.replace(/\[PHOTO:\s*(.*?)\]/i, '').trim();
        }

        const genImgMatch = finalReply.match(/\[GENERATE_IMAGE:\s*(.*?)\]/i);
        if (genImgMatch) {
          extractedGenImage = genImgMatch[1].trim();
          finalReply = finalReply.replace(/\[GENERATE_IMAGE:\s*(.*?)\]/i, '').trim();
        }

        const gifMatch = finalReply.match(/\[GIF:\s*(.*?)\]/i);
        if (gifMatch) {
          extractedGif = gifMatch[1].trim();
          finalReply = finalReply.replace(/\[GIF:\s*(.*?)\]/i, '').trim();
        }

        const stickerMatch = finalReply.match(/\[STICKER:\s*(.*?)\]/i);
        if (stickerMatch) {
          extractedSticker = stickerMatch[1].trim();
          finalReply = finalReply.replace(/\[STICKER:\s*(.*?)\]/i, '').trim();
        }

        let messagesToSend = [finalReply];
        if (options.splitMessages && finalReply) {
          messagesToSend = [];
          let inCodeBlock = false;
          let currentCodeBlock = [];

          const lines = finalReply.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('```')) {
              inCodeBlock = !inCodeBlock;
              currentCodeBlock.push(line);
              if (!inCodeBlock) {
                messagesToSend.push(currentCodeBlock.join('\n'));
                currentCodeBlock = [];
              }
            } else if (inCodeBlock) {
              currentCodeBlock.push(line);
            } else if (trimmed) {
              messagesToSend.push(trimmed);
            }
          }
          if (currentCodeBlock.length > 0) {
            messagesToSend.push(...currentCodeBlock);
          }
        }

        const delay = options.typingDelay || 0;
        for (let i = 0; i < messagesToSend.length; i++) {
          const chunk = messagesToSend[i];
          if (i > 0 || delay > 0) {
            io.emit("bot_typing", { contactId: msg.from, clientId });
            const waitTime = delay > 0 ? delay * 1000 : (i > 0 ? 1500 : 0);
            if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
            io.emit("bot_typing_stop", { contactId: msg.from, clientId });
          }
          if (chunk) {
            await msg.reply(chunk);
            addToMemory(replyChatId, { body: chunk, isOutbound: true, timestamp: Date.now() });
            trackMessage('ai_reply', replyChatId, settings.activeProvider, clientId);
          }
        }

        if (extractedPhoto && options.allowAiGallery) {
          try {
            const photoPath = path.join(__dirname, 'public', 'gallery', path.basename(extractedPhoto));
            if (fs.existsSync(photoPath)) {
              const { MessageMedia } = require("whatsapp-web.js");
              const media = MessageMedia.fromFilePath(photoPath);
              await targetClient.sendMessage(msg.from, media);
              addToMemory(replyChatId, { body: `[Sent Photo: ${extractedPhoto}]`, isOutbound: true, timestamp: Date.now() });
            } else {
              console.log("Gallery photo not found:", photoPath);
            }
          } catch (e) { console.error("Gallery Photo error:", e); }
        }

        if (extractedGif && (options.tenorApiKey || options.giphyApiKey)) {
          try {
            let mediaUrl = null;
            if (options.giphyApiKey && !options.tenorApiKey) {
              const giphyRes = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${options.giphyApiKey}&q=${encodeURIComponent(extractedGif)}&limit=1`);
              const giphyData = await giphyRes.json();
              if (giphyData.data && giphyData.data.length > 0) mediaUrl = giphyData.data[0].images?.original?.url;
            } else if (options.tenorApiKey) {
              const tenorRes = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(extractedGif)}&key=${options.tenorApiKey}&limit=1`);
              const tenorData = await tenorRes.json();
              if (tenorData.results && tenorData.results.length > 0) mediaUrl = tenorData.results[0].media_formats?.mp4?.url;
            }
            if (mediaUrl) {
              const { MessageMedia } = require("whatsapp-web.js");
              const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
              await targetClient.sendMessage(msg.from, media, { sendVideoAsGif: true });
            }
          } catch (e) { console.error("GIF error:", e); }
        }

        if (extractedSticker && (options.tenorApiKey || options.giphyApiKey)) {
          try {
            let mediaUrl = null;
            if (options.giphyApiKey && !options.tenorApiKey) {
              const giphyRes = await fetch(`https://api.giphy.com/v1/stickers/search?api_key=${options.giphyApiKey}&q=${encodeURIComponent(extractedSticker)}&limit=1`);
              const giphyData = await giphyRes.json();
              if (giphyData.data && giphyData.data.length > 0) mediaUrl = giphyData.data[0].images?.original?.url;
            } else if (options.tenorApiKey) {
              const tenorRes = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(extractedSticker + " transparent sticker")}&key=${options.tenorApiKey}&limit=1`);
              const tenorData = await tenorRes.json();
              if (tenorData.results && tenorData.results.length > 0) mediaUrl = tenorData.results[0].media_formats?.gif?.url;
            }
            if (mediaUrl) {
              const { MessageMedia } = require("whatsapp-web.js");
              const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
              await targetClient.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerName: 'Infinity Chat', stickerAuthor: 'Sanjay' });
            }
          } catch (e) { console.error("Sticker error:", e); }
        }

        if (extractedGenImage) {
          try {
            io.emit("bot_typing", { contactId: msg.from, clientId });
            const imageBuffer = await generateImage(extractedGenImage);
            const { MessageMedia } = require("whatsapp-web.js");
            const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'generated.png');
            await targetClient.sendMessage(msg.from, media);
            addToMemory(replyChatId, { body: `[Generated Image: ${extractedGenImage}]`, isOutbound: true, timestamp: Date.now() });
          } catch (e) {
            console.error("Generate Image error:", e);
            await targetClient.sendMessage(msg.from, "❌ *Image Generation Failed:* " + e.message);
          } finally {
            io.emit("bot_typing_stop", { contactId: msg.from, clientId });
          }
        }
      } else {
        io.emit("bot_typing_stop", { contactId: msg.from, clientId });
      }
    } catch (err) {
      io.emit("bot_typing_stop", { contactId: msg.from, clientId });
      console.error("AI reply error:", err);
    }
  });
}

function getIsReady() { return true; }

module.exports = { setupSocket, getIsReady };
