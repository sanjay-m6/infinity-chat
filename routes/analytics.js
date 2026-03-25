const express = require('express');
const router = express.Router();
const { getAnalytics, resetAnalytics } = require('../analytics');

router.get('/analytics', (req, res) => {
    const { clientId } = req.query;
    const data = getAnalytics();
    if (clientId && data.accounts && data.accounts[clientId]) {
        return res.json({ ok: true, analytics: data.accounts[clientId] });
    }
    res.json({ ok: true, analytics: data });
});

router.post('/analytics/reset', (req, res) => {
    resetAnalytics();
    res.json({ ok: true });
});

module.exports = router;
