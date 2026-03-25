const fs = require('fs');
const settingsPath = 'd:/infinity_chat/open-truly-chat/settings.json';
try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.dummy) {
        delete settings.dummy;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log('Successfully removed dummy data from settings.json');
    } else {
        console.log('No dummy data found in settings.json');
    }
} catch (err) {
    console.error('Error cleaning settings.json:', err.message);
}
