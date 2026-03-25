const { IgApiClient, IgCheckpointError, IgLoginBadPasswordError, IgActionSpamError } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '.ig_auth');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const igClients = new Map();
const loginInProgress = new Set();

function getIgIntegrationOptions() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return { autoReplyEnabled: true, aiEnabledChats: [] };
        }
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        const ig = settings?.integrations?.instagram || {};
        return {
            autoReplyEnabled: ig.autoReplyEnabled !== false,
            botPersona: ig.botPersona || 'toxic_mimic',
            aiEnabledChats: Array.isArray(ig.aiEnabledChats) ? ig.aiEnabledChats : [],
            replyToAllChats: ig.replyToAllChats === true,
        };
    } catch (_) {
        return { autoReplyEnabled: true, aiEnabledChats: [], replyToAllChats: false };
    }
}

function getSessionPath(clientId) {
    return path.join(AUTH_DIR, `${clientId}.json`);
}

function saveSession(clientId, ig) {
    const sessionPath = getSessionPath(clientId);
    const serialized = ig.state.serialize();
    // Remove unnecessary large data
    delete serialized.constants;
    fs.writeFileSync(sessionPath, JSON.stringify(serialized));
}

async function loadSession(clientId, ig) {
    const sessionPath = getSessionPath(clientId);
    if (!fs.existsSync(sessionPath)) return false;
    try {
        const serialized = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        await ig.state.deserialize(serialized);
        return true;
    } catch (e) {
        console.error(`[IG:${clientId}] Failed to load session:`, e.message);
        return false;
    }
}

async function createIgClient(clientId, username, password, sessionData = null) {
    if (igClients.has(clientId)) return igClients.get(clientId);
    if (loginInProgress.has(clientId)) {
        throw new Error('Login already in progress for this account. Please wait.');
    }

    loginInProgress.add(clientId);
    try {
        const ig = new IgApiClient();
        ig.state.generateDevice(username);

        if (sessionData) {
            console.log(`[IG:${clientId}] Attempting manual session/cookie import...`);
            try {
                let cookieString = '';
                if (typeof sessionData === 'string') {
                    if (sessionData.includes('sessionid=')) {
                        cookieString = sessionData;
                    } else if (sessionData.length > 20) {
                        // Assume it's a raw sessionid value
                        cookieString = `sessionid=${sessionData};`;
                    }
                }

                if (cookieString) {
                    await ig.state.deserializeCookieJar(cookieString);
                } else {
                    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
                    await ig.state.deserialize(parsed);
                }

                // Set a generic User-Agent that matches common browser sessions to reduce checkpoint risk
                ig.state.userAgent = 'Instagram 269.1.0.18.231 Android (29/10; 480dpi; 1080x2270; Meizu; 16th; 16th; qcom; en_US; 443423048)';

                await ig.account.currentUser();
                console.log(`[IG:${clientId}] Manual session import successful!`);
                saveSession(clientId, ig);
            } catch (e) {
                console.error(`[IG:${clientId}] Session import failed:`, e.message);

                const isCheckpoint = e.message?.includes('checkpoint_required') || e?.response?.body?.message === 'checkpoint_required';

                if (isCheckpoint) {
                    throw new Error('Checkpoint required. Open your Instagram Mobile App and tap "It was me" to verify this session, then try Import again.');
                }

                throw new Error('Failed to import session. Please ensure your "sessionid" is correct and fresh.');
            }
        } else {
            const hasSession = await loadSession(clientId, ig);

            const performLogin = async () => {
                try {
                    await ig.simulate.preLoginFlow();
                    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
                    await ig.account.login(username, password);
                    await ig.simulate.postLoginFlow();
                    saveSession(clientId, ig);
                    console.log(`[IG:${clientId}] Logged in as @${username}`);
                } catch (e) {
                    const igErrorBody = e?.response?.body || {};
                    const errorLog = `[${new Date().toISOString()}] Login error: ${e.message}\nBody: ${JSON.stringify(igErrorBody, null, 2)}\n\n`;
                    fs.appendFileSync('login_debug.log', errorLog);

                    if (e instanceof IgCheckpointError || igErrorBody.message === 'checkpoint_required') {
                        throw new Error('Checkpoint required. Verify in the Instagram app.');
                    } else if (e instanceof IgLoginBadPasswordError || igErrorBody.error_type === 'bad_password') {
                        throw new Error('Invalid password. Check credentials.');
                    } else {
                        throw new Error(igErrorBody.message || e.message || 'Login failed');
                    }
                }
            };

            if (hasSession) {
                try {
                    if (!ig.state.cookieUserId) throw new Error('ds_user_id not found');
                    await ig.account.currentUser();
                    console.log(`[IG:${clientId}] Restored session for @${username}`);
                } catch (e) {
                    console.log(`[IG:${clientId}] Session corrupted (${e.message}), re-logging...`);
                    try { const p = getSessionPath(clientId); if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) { }
                    await performLogin();
                }
            } else {
                console.log(`[IG:${clientId}] No session found, logging...`);
                await performLogin();
            }
        }

        // Common setup for both paths
        ig.request.end$.subscribe(() => {
            try { saveSession(clientId, ig); } catch (_) { }
        });

        const wrapper = { ig, clientId, username, loggedInUserId: ig.state.cookieUserId };
        igClients.set(clientId, wrapper);
        return wrapper;
    } catch (err) {
        throw err;
    } finally {
        loginInProgress.delete(clientId);
    }
}

async function getIgInbox(igWrapper) {
    try {
        const inboxFeed = igWrapper.ig.feed.directInbox();
        const threads = await inboxFeed.items();
        return threads.map(thread => ({
            threadId: thread.thread_id,
            threadTitle: thread.thread_title || '',
            users: (thread.users || []).map(u => ({
                pk: u.pk,
                username: u.username,
                fullName: u.full_name,
                profilePicUrl: u.profile_pic_url,
            })),
            lastMessage: thread.last_permanent_item ? {
                text: thread.last_permanent_item.text || '',
                timestamp: thread.last_permanent_item.timestamp,
                userId: thread.last_permanent_item.user_id,
                itemType: thread.last_permanent_item.item_type,
            } : null,
            isGroup: (thread.users || []).length > 1,
            lastActivityAt: thread.last_activity_at,
        }));
    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Inbox error:`, e.message);
        return [];
    }
}

async function getIgThread(igWrapper, threadId) {
    try {
        const threadFeed = igWrapper.ig.feed.directThread({ thread_id: threadId });
        const items = await threadFeed.items();
        return items.map(item => ({
            itemId: item.item_id,
            text: item.text || '',
            timestamp: item.timestamp,
            userId: item.user_id,
            itemType: item.item_type,
            isOutbound: String(item.user_id) === String(igWrapper.loggedInUserId),
            media: item.media ? {
                url: item.media.image_versions2?.candidates[0]?.url,
                type: 'image'
            } : null
        }));

    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Thread error:`, e.message);
        return [];
    }
}

async function sendIgDM(igWrapper, threadId, text) {
    try {
        const thread = igWrapper.ig.entity.directThread(threadId);
        await thread.broadcastText(text);
        return true;
    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Send DM error:`, e.message);
        return false;
    }
}

async function getIgProfile(igWrapper) {
    try {
        const user = await igWrapper.ig.account.currentUser();
        return {
            pk: user.pk,
            username: user.username,
            fullName: user.full_name,
            profilePicUrl: user.profile_pic_url,
            biography: user.biography,
            followerCount: user.follower_count,
            followingCount: user.following_count,
            mediaCount: user.media_count,
            isPrivate: user.is_private,
            isBusiness: user.is_business,
        };
    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Profile error:`, e.message);
        return null;
    }
}

async function getIgFeed(igWrapper, maxItems = 20) {
    try {
        const feed = igWrapper.ig.feed.timeline();
        const items = await feed.items();
        return items.slice(0, maxItems).map(item => ({
            id: item.id,
            mediaType: item.media_type,
            imageUrl: item.image_versions2?.candidates?.[0]?.url || '',
            caption: item.caption?.text || '',
            likeCount: item.like_count || 0,
            commentCount: item.comment_count || 0,
            user: {
                pk: item.user?.pk,
                username: item.user?.username,
                fullName: item.user?.full_name,
                profilePicUrl: item.user?.profile_pic_url,
            },
            takenAt: item.taken_at,
            hasLiked: !!item.has_liked,
        }));
    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Feed error:`, e.message);
        return [];
    }
}

async function uploadIgPhoto(igWrapper, photoBuffer, caption) {
    try {
        await igWrapper.ig.publish.photo({
            file: photoBuffer,
            caption: caption,
        });
        return true;
    } catch (e) {
        console.error(`[IG:${igWrapper.clientId}] Upload error:`, e.message);
        return false;
    }
}

async function getGraphAccount(token) {
    try {
        console.log('[IG Graph] Discovering accounts...');
        // 1. Get managed pages
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
        const pageData = await pageRes.json();
        if (!pageData.data || pageData.data.length === 0) return null;

        // 2. Find page with linked IG account
        for (const page of pageData.data) {
            const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${token}`);
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
                return igData.instagram_business_account.id;
            }
        }
    } catch (e) {
        console.error('[IG Graph] Discovery failed:', e.message);
    }
    return null;
}

async function getOfficialProfile(token, isGraph) {
    try {
        console.log('[IG Official] Fetching profile...');

        // Auto-detect if it's a legacy Basic Display token or Graph token
        const looksLikeBasic = token.startsWith('IGAA');
        const effectiveIsGraph = isGraph && !looksLikeBasic;

        if (effectiveIsGraph) {
            const igId = await getGraphAccount(token);
            if (!igId) throw new Error('No linked Instagram Business account found.');
            const res = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=id,username,name,profile_picture_url,biography,media_count,followers_count,follows_count&access_token=${token}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return {
                id: data.id,
                username: data.username,
                fullName: data.name,
                profilePicUrl: data.profile_picture_url,
                biography: data.biography,
                mediaCount: data.media_count,
                followerCount: data.followers_count,
                followingCount: data.follows_count,
                isBusiness: true
            };
        } else {
            // Instagram Basic Display API
            const res = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return {
                pk: data.id,
                id: data.id,
                username: data.username,
                fullName: data.username,
                profilePicUrl: '',
                isBusiness: data.account_type === 'BUSINESS' || data.account_type === 'CREATOR',
                mediaCount: data.media_count || 0,
                followerCount: 0,
                followingCount: 0,
                biography: 'Instagram Basic API doesn\'t provide bio.',
                official: true,
                isBasicToken: true
            };
        }
    } catch (e) {
        console.error('[IG Official] Profile error:', e.message);
        return null;
    }
}

async function getOfficialFeed(token, isGraph) {
    try {
        console.log('[IG Official] Fetching feed...');
        const url = isGraph
            ? `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp&access_token=${token}`
            : `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp&access_token=${token}`;

        const res = await fetch(url);
        const data = await res.json();
        console.log('[IG Official] Feed items:', data.data?.length || 0);
        if (data.error) throw new Error(data.error.message);
        return (data.data || []).map(item => ({
            id: item.id,
            mediaType: item.media_type,
            imageUrl: item.media_url,
            caption: item.caption || '',
            user: { username: item.username },
            takenAt: Math.floor(new Date(item.timestamp).getTime() / 1000),
            official: true
        }));
    } catch (e) {
        console.error('[IG Official] Feed error:', e.message);
        return [];
    }
}

async function getOfficialInbox(token) {
    try {
        const igId = await getGraphAccount(token);
        if (!igId) return [];
        const res = await fetch(`https://graph.facebook.com/v19.0/${igId}/conversations?fields=id,participants,updated_time,messages.limit(1){message,from,created_time}&access_token=${token}`);
        const data = await res.json();
        return (data.data || []).map(conv => ({
            threadId: conv.id,
            users: conv.participants.data.map(p => ({ username: p.username || p.name, fullName: p.name })),
            lastMessage: conv.messages?.data[0] ? { text: conv.messages.data[0].message, timestamp: new Date(conv.messages.data[0].created_time).getTime() / 1000 } : null,
            updatedAt: conv.updated_time,
            official: true
        }));
    } catch (e) {
        console.error('[IG Official] Inbox error:', e.message);
        return [];
    }
}

async function getOfficialMessages(token, threadId) {
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${threadId}/messages?fields=id,message,from,created_time&access_token=${token}`);
        const data = await res.json();
        return (data.data || []).map(m => ({
            id: m.id,
            text: m.message,
            timestamp: new Date(m.created_time).getTime() / 1000,
            isOutbound: false, // Determine if outbound by checking from ID
            official: true
        })).reverse();
    } catch (e) {
        console.error('[IG Official] Messages error:', e.message);
        return [];
    }
}

async function sendOfficialMessage(token, recipientId, text) {
    try {
        const igId = await getGraphAccount(token);
        if (!igId) throw new Error('No linked Business account found.');
        const res = await fetch(`https://graph.facebook.com/v19.0/${igId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text },
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { ok: true, messageId: data.message_id };
    } catch (e) {
        console.error('[IG Official] Send error:', e.message);
        return { ok: false, error: e.message };
    }
}




module.exports = {
    igClients,
    createIgClient,
    getIgIntegrationOptions,
    getIgInbox,
    getIgThread,
    sendIgDM,
    getIgProfile,
    getIgFeed,
    uploadIgPhoto,
    getOfficialProfile,
    getOfficialFeed,
    getOfficialInbox,
    getOfficialMessages,
    sendOfficialMessage,
    SETTINGS_FILE,
};




