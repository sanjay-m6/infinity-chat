const { getReply } = require('./aiService.js');
const fs = require('fs');

async function run() {
  fs.writeFileSync(__dirname + '/out.txt', "Started...", 'utf8');
  try {
    const res = await getReply(__dirname + '/files', 'Hello! how are you?');
    fs.writeFileSync(__dirname + '/out.txt', "Success: " + res, 'utf8');
  } catch (err) {
    fs.writeFileSync(__dirname + '/out.txt', "Test failed: " + err.stack, 'utf8');
  }
}

run();