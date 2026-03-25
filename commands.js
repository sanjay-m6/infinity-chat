const COMMANDS = {
    '/help': {
        description: 'Show available commands',
        handler: () => `Available commands:\n/help - Show this list\n/summarize - Summarize the conversation\n/translate [lang] [text] - Translate text\n/tone [style] - Change reply tone (casual, formal, funny)\n/reset - Clear conversation memory\n/status - Show bot status`
    },
    '/summarize': {
        description: 'Summarize conversation',
        handler: (args, context) => {
            if (!context.history || context.history.length === 0) return 'No conversation history to summarize.';
            const msgs = context.history.map(h => `${h.isOutbound ? 'Bot' : 'User'}: ${h.body}`).join('\n');
            return `[AI_TASK] Summarize this conversation concisely:\n${msgs}`;
        }
    },
    '/translate': {
        description: 'Translate text to a language',
        handler: (args) => {
            if (!args || args.length < 2) return 'Usage: /translate [language] [text]\nExample: /translate spanish Hello how are you';
            const lang = args[0];
            const text = args.slice(1).join(' ');
            return `[AI_TASK] Translate the following text to ${lang}. Only respond with the translation, nothing else:\n${text}`;
        }
    },
    '/tone': {
        description: 'Set reply tone',
        handler: (args, context) => {
            const tone = (args && args[0]) || 'casual';
            const validTones = ['casual', 'formal', 'funny', 'sarcastic', 'professional', 'friendly'];
            if (!validTones.includes(tone.toLowerCase())) return `Invalid tone. Choose from: ${validTones.join(', ')}`;
            return `__TONE_SET:${tone.toLowerCase()}__`;
        }
    },
    '/reset': {
        description: 'Clear conversation memory',
        handler: (args, context) => {
            if (context.clearMemory) context.clearMemory();
            return '🧹 Conversation memory cleared.';
        }
    },
    '/status': {
        description: 'Show bot status',
        handler: (args, context) => {
            const memCount = context.historyLength || 0;
            return `🤖 Bot Status:\n• Memory: ${memCount} messages buffered\n• Provider: ${context.provider || 'unknown'}\n• Model: ${context.model || 'unknown'}\n• Uptime: ${Math.floor(process.uptime() / 60)} minutes`;
        }
    }
};

function parseCommand(text) {
    if (!text || !text.startsWith('/')) return null;
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (COMMANDS[cmd]) return { command: cmd, args, handler: COMMANDS[cmd].handler };
    return null;
}

function isAiTask(result) {
    return result && result.startsWith('[AI_TASK]');
}

function extractAiTask(result) {
    return result.replace('[AI_TASK] ', '');
}

module.exports = { parseCommand, isAiTask, extractAiTask, COMMANDS };
