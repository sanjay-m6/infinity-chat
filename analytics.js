const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

function loadAnalytics() {
    if (fs.existsSync(ANALYTICS_FILE)) {
        const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        if (!data.accounts) data.accounts = {};
        return data;
    }
    return { totalSent: 0, totalReceived: 0, aiReplies: 0, tokenEstimate: 0, perChat: {}, perProvider: {}, dailyActivity: {}, accounts: {} };
}

function saveAnalytics(data) {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}

function trackMessage(type, chatId, provider, clientId = 'default') {
    const data = loadAnalytics();
    const today = new Date().toISOString().split('T')[0];

    if (!data.accounts[clientId]) {
        data.accounts[clientId] = { totalSent: 0, totalReceived: 0, aiReplies: 0, tokenEstimate: 0 };
    }
    const acc = data.accounts[clientId];

    if (type === 'sent') { data.totalSent++; acc.totalSent++; }
    else if (type === 'received') { data.totalReceived++; acc.totalReceived++; }
    else if (type === 'ai_reply') {
        data.aiReplies++; acc.aiReplies++;
        data.tokenEstimate += 200; acc.tokenEstimate += 200;
        if (provider) {
            if (!data.perProvider[provider]) data.perProvider[provider] = { replies: 0, tokens: 0 };
            data.perProvider[provider].replies++;
            data.perProvider[provider].tokens += 200;
        }
    }

    if (chatId) {
        const fullChatId = `${clientId}:${chatId}`;
        if (!data.perChat[fullChatId]) data.perChat[fullChatId] = { sent: 0, received: 0, aiReplies: 0 };
        if (type === 'sent') data.perChat[fullChatId].sent++;
        else if (type === 'received') data.perChat[fullChatId].received++;
        else if (type === 'ai_reply') data.perChat[fullChatId].aiReplies++;
    }

    if (!data.dailyActivity[today]) data.dailyActivity[today] = { sent: 0, received: 0, aiReplies: 0 };
    if (type === 'sent') data.dailyActivity[today].sent++;
    else if (type === 'received') data.dailyActivity[today].received++;
    else if (type === 'ai_reply') data.dailyActivity[today].aiReplies++;

    const days = Object.keys(data.dailyActivity).sort();
    if (days.length > 90) {
        days.slice(0, days.length - 90).forEach(d => delete data.dailyActivity[d]);
    }

    saveAnalytics(data);
}

function getAnalytics() {
    return loadAnalytics();
}

function resetAnalytics() {
    const empty = { totalSent: 0, totalReceived: 0, aiReplies: 0, tokenEstimate: 0, perChat: {}, perProvider: {}, dailyActivity: {} };
    saveAnalytics(empty);
    return empty;
}

module.exports = { trackMessage, getAnalytics, resetAnalytics };
