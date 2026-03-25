const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "settings.json");
const WA_BOOTSTRAP_MAX_CHATS = 3000;
const waStatusUpdates = [];

function getIntegrationOptions() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { autoReplyEnabled: true, syncEnabled: true, showStatusFeed: true };
    }
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    const wa = settings?.integrations?.whatsapp || {};
    return {
      autoReplyEnabled: wa.autoReplyEnabled !== false,
      replyToAllChats: wa.replyToAllChats === true,
      replyOnlyOnMention: wa.replyOnlyOnMention === true,
      syncEnabled: wa.syncEnabled !== false,
      showStatusFeed: wa.showStatusFeed !== false,
      splitMessages: wa.splitMessages !== false,
      typingDelay: typeof wa.typingDelay === 'number' ? wa.typingDelay : 0,
      aiEnabledChats: Array.isArray(wa.aiEnabledChats) ? wa.aiEnabledChats : [],
      tenorApiKey: wa.tenorApiKey || '',
      giphyApiKey: wa.giphyApiKey || '',
    };
  } catch (_) {
    return { autoReplyEnabled: true, replyToAllChats: false, replyOnlyOnMention: false, syncEnabled: true, showStatusFeed: true, splitMessages: true, typingDelay: 0, aiEnabledChats: [], tenorApiKey: '', giphyApiKey: '' };
  }
}

function normalizeWaMessage(msg, fallback = {}) {
  const id = (msg.id && msg.id._serialized) ? msg.id._serialized : fallback.id || `msg-${Date.now()}`;
  const from = msg.from || fallback.from || "";
  const to = msg.to || fallback.to || "";
  const author = msg.author || "";
  const body = msg.body || "";
  const chatId = msg.fromMe ? (to || from) : (from || to);
  return {
    id,
    chatId,
    from,
    to,
    author,
    body,
    type: msg.type || "chat",
    timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
    hasMedia: !!msg.hasMedia,
    isStatus: !!msg.isStatus,
    isGroup: (chatId || "").endsWith("@g.us"),
    isOutbound: !!msg.fromMe,
    ack: typeof msg.ack === "number" ? msg.ack : 0,
  };
}

const puppeteerOptions = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const clients = new Map();

function createWaClient(clientId = 'default') {
  if (clients.has(clientId)) return clients.get(clientId);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: puppeteerOptions,
  });

  clients.set(clientId, client);
  return client;
}

// For backward compatibility, initialize a default client
const client = createWaClient('default');

async function buildChatListSnapshot(targetClient = client, maxChats = WA_BOOTSTRAP_MAX_CHATS) {
  const chats = await targetClient.getChats();
  const mapped = chats.map((chat) => {
    const chatId = chat.id?._serialized || String(chat.id || "");
    const lastMsg = chat.lastMessage ? normalizeWaMessage(chat.lastMessage, { chatId }) : null;

    let properName = chat.name || chat.formattedTitle;
    if ((!properName || properName === chatId) && chat.lastMessage?._data?.notifyName) {
      properName = chat.lastMessage._data.notifyName;
    }

    return {
      id: chatId,
      name: properName || chatId || "Unknown",
      isGroup: !!chat.isGroup,
      isArchived: !!chat.archived,
      unreadCount: Number(chat.unreadCount || 0),
      isMuted: !!chat.isMuted,
      timestamp: (lastMsg && lastMsg.timestamp) || chat.timestamp || 0,
      lastMessageText: (lastMsg && lastMsg.body) || "",
      lastMessageHasMedia: (lastMsg && !!lastMsg.hasMedia) || false,
      presence: {
        isOnline: null,
        lastSeen: null,
      },
      messages: [],
    };
  });

  return mapped
    .filter((c) => c.id && !/status@broadcast/.test(c.id))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, Math.max(100, Math.min(WA_BOOTSTRAP_MAX_CHATS, Number(maxChats) || WA_BOOTSTRAP_MAX_CHATS)));
}

async function getPresence(chatId, targetClient = client) {
  const cleanId = String(chatId || "");
  if (!cleanId) return { isOnline: null, lastSeen: null };
  try {
    const contact = await targetClient.getContactById(cleanId);
    return {
      isOnline: typeof contact.isOnline === "boolean" ? contact.isOnline : null,
      lastSeen: contact.lastSeen || null,
      name: contact.name || contact.pushname || contact.shortName || contact.number || cleanId,
    };
  } catch (_) {
    return { isOnline: null, lastSeen: null, name: cleanId };
  }
}

module.exports = {
  client,
  clients,
  createWaClient,
  getIntegrationOptions,
  normalizeWaMessage,
  buildChatListSnapshot,
  getPresence,
  waStatusUpdates,
  SETTINGS_FILE,
  WA_BOOTSTRAP_MAX_CHATS
};
