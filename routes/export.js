const express = require('express');
const router = express.Router();
const { client, normalizeWaMessage } = require('../waClient');

router.get('/export/:chatId', async (req, res) => {
    const { chatId } = req.params;
    const format = req.query.format || 'json';
    const limit = Math.max(50, Math.min(10000, Number(req.query.limit || 5000)));

    try {
        const chat = await client.getChatById(chatId);
        const history = await chat.fetchMessages({ limit });
        const messages = history.map(m => normalizeWaMessage(m)).sort((a, b) => a.timestamp - b.timestamp);

        if (format === 'txt') {
            const lines = messages.map(m => {
                const date = new Date(m.timestamp * 1000).toLocaleString();
                const sender = m.isOutbound ? 'You' : (m.from || 'Unknown');
                return `[${date}] ${sender}: ${m.body || (m.hasMedia ? '📎 Media' : '')}`;
            });
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="chat_${chatId}.txt"`);
            res.send(lines.join('\n'));
        } else if (format === 'csv') {
            const header = 'Timestamp,From,To,Body,Type,HasMedia';
            const rows = messages.map(m => {
                const date = new Date(m.timestamp * 1000).toISOString();
                const body = (m.body || '').replace(/"/g, '""');
                return `"${date}","${m.from}","${m.to}","${body}","${m.type}","${m.hasMedia}"`;
            });
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="chat_${chatId}.csv"`);
            res.send([header, ...rows].join('\n'));
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="chat_${chatId}.json"`);
            res.json({ chatId, exportedAt: new Date().toISOString(), messageCount: messages.length, messages });
        }
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
