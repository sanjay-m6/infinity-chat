const express = require('express');
const router = express.Router();
const { addWebhook, removeWebhook, toggleWebhook, getWebhooks } = require('../webhooks');

router.get('/webhooks', (req, res) => {
    const { clientId } = req.query;
    res.json({ ok: true, webhooks: getWebhooks(clientId) });
});

router.post('/webhooks', (req, res) => {
    const { name, url, keywords, chatIds, events, clientId } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing required field: url' });
    try {
        const webhook = addWebhook({ name, url, keywords, chatIds, events, clientId });
        res.json({ ok: true, webhook });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/webhooks/:id', (req, res) => {
    const { enabled } = req.body;
    const result = toggleWebhook(req.params.id, enabled);
    res.json({ ok: !!result, webhook: result });
});

router.delete('/webhooks/:id', (req, res) => {
    removeWebhook(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
