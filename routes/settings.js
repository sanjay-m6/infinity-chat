const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getSettings } = require('../aiService');
const { SETTINGS_FILE } = require('../waClient');
const FILES_FOLDER = path.join(__dirname, '../files');

router.get("/config", (req, res) => {
    let hasChats = false;
    let hasClosestPerson = false;
    let hasApiKey = false;
    try {
        if (fs.existsSync(FILES_FOLDER)) {
            const files = fs.readdirSync(FILES_FOLDER).filter((f) => f.endsWith(".txt"));
            hasChats = files.length > 0;
            hasClosestPerson = files.includes("closest-person.txt");
        }
        const settings = getSettings ? getSettings() :
            fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) : null;
        hasApiKey = settings && settings.providers && settings.activeProvider && settings.providers[settings.activeProvider].apiKey;
    } catch (_) { }
    res.json({ hasApiKey, hasChats, hasClosestPerson });
});

router.get("/settings", (req, res) => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
        } else {
            res.json({});
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/settings", (req, res) => {
    try {
        if (!req.body) throw new Error("No settings data provided");
        console.log(`[Settings] POST received. Payload size: ${JSON.stringify(req.body).length} bytes`);
        console.log(`[Settings] Active Provider: ${req.body.activeProvider}`);

        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
        console.log(`[Settings] Updated successfully.`);
        res.json({ ok: true });

    } catch (e) {
        console.error(`[Settings] Save failed:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
