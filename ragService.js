const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
}

async function queryRAG(dir, queryText, limit = 5) {
    const files = getFiles(dir);
    if (files.length === 0) return "";

    const chunks = [];
    for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        // Simple windowed chunking
        const paragraphs = content.split(/\n\s*\n/);
        paragraphs.forEach(p => {
            if (p.trim().length > 20) chunks.push({ text: p.trim(), source: file });
        });
    }

    if (chunks.length === 0) return "";

    const queryKeywords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (queryKeywords.length === 0) return chunks.slice(0, limit).map(c => c.text).join("\n\n---\n\n");

    // Rank chunks by keyword frequency
    const scored = chunks.map(chunk => {
        const text = chunk.text.toLowerCase();
        let score = 0;
        queryKeywords.forEach(kw => {
            if (text.includes(kw)) score += 1;
        });
        return { ...chunk, score };
    });

    return scored
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(c => c.text)
        .join("\n\n---\n\n");
}

module.exports = { queryRAG };
