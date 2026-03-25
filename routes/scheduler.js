const express = require('express');
const router = express.Router();
const { addSchedule, cancelSchedule, getSchedules } = require('../scheduler');

router.get('/schedules', (req, res) => {
    const { clientId } = req.query;
    res.json({ ok: true, schedules: getSchedules(clientId) });
});

router.post('/schedules', (req, res) => {
    const { to, message, sendAt, repeat, clientId } = req.body;
    if (!to || !message || !sendAt) {
        return res.status(400).json({ error: 'Missing required fields: to, message, sendAt' });
    }
    try {
        const schedule = addSchedule({ to, message, sendAt, repeat, clientId: clientId || 'default' });
        res.json({ ok: true, schedule });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/schedules/:id', (req, res) => {
    const success = cancelSchedule(req.params.id);
    res.json({ ok: success });
});

module.exports = router;
