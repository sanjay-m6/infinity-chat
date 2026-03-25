const express = require('express');
const router = express.Router();
const {
    igClients, createIgClient, getIgInbox, getIgThread, sendIgDM,
    getIgProfile, getIgFeed, uploadIgPhoto,
    getOfficialProfile, getOfficialFeed,
    SETTINGS_FILE
} = require('../igClient');

const { getReply } = require('../aiService');
const path = require('path');
const fs = require('fs');

// OAuth Config
const IG_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const IG_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const IG_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;


function getIgWrapper(clientId = 'ig_default') {
    return igClients.get(clientId) || null;
}

// GET /api/instagram/status
router.get('/status', async (req, res) => {
    const clientId = req.query.clientId || 'ig_default';
    const wrapper = getIgWrapper(clientId);

    let oauthConnected = false;
    let profile = null;

    // Check settings for OAuth token
    if (fs.existsSync(SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        const token = settings.instagramOAuth?.accessToken;
        if (token) {
            oauthConnected = true;
            // Optionally fetch profile if not connected via private API
            if (!wrapper) {
                profile = await getOfficialProfile(token);
            }
        }
    }

    res.json({
        ok: true,
        connected: !!wrapper,
        oauthConnected,
        profile: wrapper ? await getIgProfile(wrapper) : profile
    });
});

// GET /api/instagram/auth
router.get('/auth', (req, res) => {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    // For DMs, we use the Facebook Login flow which provides the Graph API token
    // Scopes needed for Instagram DMs via Graph API:
    const scopes = [
        'instagram_basic',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'public_profile'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
    res.redirect(authUrl);
});

// GET /api/instagram/auth/callback
router.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.send(`Auth Error: ${error}`);

    try {
        const clientId = process.env.INSTAGRAM_CLIENT_ID;
        const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

        // 1. Exchange code for short-lived User Access Token
        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
        const tokenData = await tokenRes.json();

        if (tokenData.error) throw new Error(tokenData.error.message);

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange for long-lived token (usually 60 days)
        const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
        const longLivedData = await longLivedRes.json();

        const finalToken = longLivedData.access_token || shortLivedToken;

        // 3. Save to settings
        if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            settings.instagramOAuth = {
                accessToken: finalToken,
                updatedAt: new Date().toISOString(),
                isGraph: true // Mark as Graph API token
            };
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        }

        res.send('<h1>Authentication Successful!</h1><p>You can close this window and refresh the app.</p><script>setTimeout(() => window.close(), 3000);</script>');
    } catch (e) {
        console.error('[IG Auth] Error:', e.message);
        res.status(500).send(`Auth Failed: ${e.message}`);
    }
});


// POST /api/instagram/login
router.post('/login', async (req, res) => {
    const { username, password, clientId = 'ig_default' } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Username and password required' });

    try {
        await createIgClient(clientId, username, password);
        res.json({ ok: true, message: 'Logged in successfully' });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

// POST /api/instagram/import
router.post('/import', async (req, res) => {
    const { username, sessionData, clientId = 'ig_default' } = req.body;
    if (!username || !sessionData) return res.json({ ok: false, error: 'Username and session data required' });

    try {
        await createIgClient(clientId, username, null, sessionData);
        res.json({ ok: true, message: 'Session imported successfully' });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

// GET /api/instagram/profile
router.get('/profile', async (req, res) => {
    try {
        const settings = getSettings();
        if (settings.instagramOAuth?.accessToken) {
            const profile = await getOfficialProfile(settings.instagramOAuth.accessToken, settings.instagramOAuth.isGraph);
            if (profile) return res.json({ ok: true, profile });
        }

        const client = igClients.get('ig_default');
        if (!client) return res.status(401).json({ ok: false, error: 'Not logged in' });
        const profile = await getIgProfile(client);
        res.json({ ok: true, profile });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/instagram/inbox
router.get('/inbox', async (req, res) => {
    try {
        const settings = getSettings();
        if (settings.instagramOAuth?.accessToken && settings.instagramOAuth.isGraph) {
            const threads = await getOfficialInbox(settings.instagramOAuth.accessToken);
            return res.json({ ok: true, threads });
        }

        const client = igClients.get('ig_default');
        if (!client) return res.status(401).json({ ok: false, error: 'Not logged in' });
        const threads = await getIgInbox(client);
        res.json({ ok: true, threads });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/instagram/thread/:threadId
router.get('/thread/:threadId', async (req, res) => {
    try {
        const { threadId } = req.params;
        const settings = getSettings();
        if (settings.instagramOAuth?.accessToken && settings.instagramOAuth.isGraph) {
            const messages = await getOfficialMessages(settings.instagramOAuth.accessToken, threadId);
            return res.json({ ok: true, messages });
        }

        const client = igClients.get('ig_default');
        if (!client) return res.status(401).json({ ok: false, error: 'Not logged in' });
        const messages = await getIgThread(client, threadId);
        res.json({ ok: true, messages });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/instagram/send
router.post('/send', async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const settings = getSettings();

        // Try official API if Graph token exists
        if (settings.instagramOAuth?.accessToken && settings.instagramOAuth.isGraph) {
            const result = await igClient.sendOfficialMessage(settings.instagramOAuth.accessToken, recipientId, text);
            return res.json(result);
        }

        const client = igClients.get('ig_default');
        if (!client) return res.status(401).json({ ok: false, error: 'Not logged in' });

        const result = await igClient.sendIgDM(client, recipientId, text);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});


// POST /api/instagram/ai-reply
router.post('/ai-reply', async (req, res) => {
    const { threadId, userMessage, clientId = 'ig_default' } = req.body;
    const wrapper = getIgWrapper(clientId);
    if (!wrapper) return res.json({ ok: false, error: 'Instagram not connected' });

    try {
        const filesDir = path.join(__dirname, '..', 'files');
        const history = await getIgThread(wrapper, threadId);
        const formattedHistory = history.slice(-15).map(m => ({
            isOutbound: m.isOutbound,
            body: m.text || '',
        }));

        const reply = await getReply(filesDir, userMessage, formattedHistory, history[history.length - 1]?.media);
        if (reply) {
            await sendIgDM(wrapper, threadId, reply);
        }
        res.json({ ok: true, reply });

    } catch (e) {
        console.error('[IG Route] AI reply error:', e.message);
        res.json({ ok: false, error: e.message });
    }
});

// GET /api/instagram/feed
router.get('/feed', async (req, res) => {
    const clientId = req.query.clientId || 'ig_default';
    const wrapper = getIgWrapper(clientId);
    const limit = Number(req.query.limit) || 20;

    if (wrapper) {
        const feed = await getIgFeed(wrapper, limit);
        return res.json({ ok: true, feed });
    }

    // Try official API
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            const token = settings.instagramOAuth?.accessToken;
            if (token) {
                const feed = await getOfficialFeed(token, limit);
                return res.json({ ok: true, feed });
            }
        }
    } catch (_) { }

    res.json({ ok: false, error: 'Instagram not connected' });
});


// POST /api/instagram/generate-caption
router.post('/generate-caption', async (req, res) => {
    const { prompt } = req.body;
    try {
        const filesDir = path.join(__dirname, '..', 'files');
        const reply = await getReply(filesDir, prompt || "Write a short, engaging Instagram caption for a photo.", []);
        res.json({ ok: true, caption: reply });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

// POST /api/instagram/upload
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/upload', upload.single('photo'), async (req, res) => {
    const { caption, clientId = 'ig_default' } = req.body;
    const wrapper = getIgWrapper(clientId);
    if (!wrapper) return res.json({ ok: false, error: 'Instagram not connected' });
    if (!req.file) return res.json({ ok: false, error: 'No photo provided' });

    const success = await uploadIgPhoto(wrapper, req.file.buffer, caption);
    res.json({ ok: success });
});

// POST /api/instagram/logout
router.post('/logout', (req, res) => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            delete settings.instagramOAuth;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        }
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

module.exports = router;

