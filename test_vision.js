const { getReply } = require('./aiService');
const path = require('path');
const fs = require('fs');

async function testVision() {
    console.log('--- Testing AI Vision ---');
    const filesFolder = path.join(__dirname, 'files');
    if (!fs.existsSync(filesFolder)) fs.mkdirSync(filesFolder);

    // Mock image (small red pixel)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const media = { data: base64Image, mimetype: 'image/png' };
    const userMessage = 'What color is this image? Reply with just the color name.';

    try {
        console.log('Sending vision request...');
        const reply = await getReply(filesFolder, userMessage, [], media);
        console.log('Bot Reply:', reply || '[EMPTY REPLY]');

        if (reply && reply.toLowerCase().includes('red')) {
            console.log('✅ Vision Test Passed!');
        } else if (reply) {
            console.log('⚠️ Vision Test completed, result:', reply);
        } else {
            console.log('❌ Bot returned an empty reply.');
        }
    } catch (e) {
        console.error('❌ Vision Test Failed:', e.message);
    }

}

testVision();
