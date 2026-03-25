const fs = require('fs');
const path = require('path');

const WEBHOOKS_FILE = path.join(__dirname, 'webhooks.json');

function loadWebhooks() {
    if (fs.existsSync(WEBHOOKS_FILE)) {
        return JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf8'));
    }
    return [];
}

function saveWebhooks(hooks) {
    fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(hooks, null, 2));
}

function generateId() {
    return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addWebhook({ name, url, keywords, chatIds, events, clientId = 'default' }) {
    const webhook = {
        id: generateId(),
        name: name || 'Untitled Webhook',
        url,
        keywords: Array.isArray(keywords) ? keywords : [],
        chatIds: Array.isArray(chatIds) ? chatIds : [],
        events: Array.isArray(events) ? events : ['message'],
        enabled: true,
        createdAt: new Date().toISOString(),
        clientId
    };

    const hooks = loadWebhooks();
    hooks.push(webhook);
    saveWebhooks(hooks);
    return webhook;
}

function removeWebhook(id) {
    const hooks = loadWebhooks().filter(h => h.id !== id);
    saveWebhooks(hooks);
}

function toggleWebhook(id, enabled) {
    const hooks = loadWebhooks();
    const idx = hooks.findIndex(h => h.id === id);
    if (idx !== -1) {
        hooks[idx].enabled = enabled;
        saveWebhooks(hooks);
        return hooks[idx];
    }
    return null;
}

async function fireWebhooks(event, messagePayload, sourceClientId = 'default') {
    const hooks = loadWebhooks().filter(h => h.enabled && (h.clientId === sourceClientId || !h.clientId));

    for (const hook of hooks) {
        if (!hook.events.includes(event)) continue;
        if (hook.chatIds.length > 0 && !hook.chatIds.includes(messagePayload.chatId)) continue;

        if (hook.keywords.length > 0) {
            const body = (messagePayload.body || '').toLowerCase();
            const hasKeyword = hook.keywords.some(kw => body.includes(kw.toLowerCase()));
            if (!hasKeyword) continue;
        }

        try {
            await fetch(hook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, ...messagePayload, webhookId: hook.id, webhookName: hook.name, clientId: sourceClientId })
            });
        } catch (err) {
            console.error(`[Webhook:${sourceClientId}] Failed to fire ${hook.name}:`, err.message);
        }
    }
}

function getWebhooks(clientId) {
    const all = loadWebhooks();
    if (clientId) return all.filter(h => h.clientId === clientId || !h.clientId);
    return all;
}

module.exports = { addWebhook, removeWebhook, toggleWebhook, fireWebhooks, getWebhooks };
