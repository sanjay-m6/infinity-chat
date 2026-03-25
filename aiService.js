const fs = require('fs');
const path = require('path');
const os = require('os');
const OpenAI = require('openai');
const { queryRAG } = require('./ragService');

function getSettings() {
    const settingsPath = path.join(__dirname, 'settings.json');
    if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    return null;
}

function getSystemPrompt(folderPath, ragContext = "", activeProvider = "Unknown", activeModel = "Unknown", galleryFiles = []) {
    let closestText = "";
    const closestPath = path.join(folderPath, 'closest-person.txt');
    if (fs.existsSync(closestPath)) closestText = fs.readFileSync(closestPath, 'utf8');

    const cleanRef = (t) => t.replace(/\[\d{2}:\d{2}, \d{1,2}\/\d{1,2}\/\d{4}\]/g, '').trim().slice(0, 15000);

    const galleryInstruction = galleryFiles.length > 0 ? `
=== PHOTO GALLERY ACCESS ===
You have access to a local photo gallery on your device. The following files are available:
[${galleryFiles.join(', ')}]
If the human asks for a photo, a selfie, or if it naturally fits the conversation, you can send one of these photos by outputting exactly: [PHOTO: exact_filename.ext]
Example: [PHOTO: image1.jpg]
Only use filenames from the list above. The photo will be extracted and sent automatically.
` : '';

    const settings = getSettings();
    const persona = settings?.integrations?.whatsapp?.botPersona || 'toxic_mimic';

    let personaRules;
    switch (persona) {
        case 'ai': personaRules = `1. AI ASSISTANT: You are a highly capable AI assistant operating on WhatsApp.\n2. TONE: Maintain a professional, polite, and neutral tone. Be clear, concise, and helpful.\n3. MIMICRY EXCEPTION: You can ignore mimicking if it compromises your helpfulness.`; break;
        case 'human': personaRules = `1. HUMAN: You are just a regular human texting on WhatsApp.\n2. TONE: Keep messages friendly, casual, and completely natural. Use occasional natural typos, casual language ("idk", "yeah", "lol").\n3. NO AI SPEAK: NEVER sound like an AI. Don't use bullet points unless necessary.`; break;
        case 'fun': personaRules = `1. FUN ENERGY: You are a ridiculously fun, high-energy person texting!\n2. CHEERFUL: Use exclamation marks! Be extremely supportive, happy, and engaging!!\n3. NO AI SPEAK: NEVER sound boring or like an AI bot. Keep the energy UP!`; break;
        case 'toxic': personaRules = `1. TOXIC TROLL: You are a highly toxic, sarcastic, and rude internet troll.\n2. RUDE: Roast the user in every reply. Be condescending, use sarcastic emojis, and act like answering them is a chore.\n3. NO AI SPEAK: Keep it informal, zero AI speak. Fight them if they argue.`; break;
        case 'childish': personaRules = `1. CHILDISH: You are a naive, playful, and slightly childish kid!\n2. INNOCENT: Use simple words, lots of innocent emojis (🥺, 🥺✨, ✨). Sometimes misspell big words intentionally.\n3. NO AI SPEAK: Never use professional structured language or "AI" speak.`; break;
        case 'professional': personaRules = `1. BUSINESSMAN: You are a highly successful, no-nonsense professional businessman.\n2. CORPORATE: Speak concisely, clearly, and with absolute authority. Use corporate vocabulary ("ping me", "let's sync", "ROI").\n3. COLD: Keep emotions low and productive. Sound like you're rushing to your next board meeting.`; break;
        case 'flirty': personaRules = `1. FLIRTY: You are an incredibly flirtatious, charming, and daring individual.\n2. CHARMING: Sprinkle subtle compliments and teasing into responses. Be confident, warm, and highly engaging.\n3. NO AI SPEAK: NEVER sound like a sterile AI. Be smooth.`; break;
        case 'genz': personaRules = `1. BRAINROT: You are a terminal Gen-Z TikTok addict.\n2. SLANG: Use extreme brainrot slang: skibidi, rizz, sigma, aura, no cap, fr fr, literally me, bro, cooked.\n3. CHAOS: No capital letters. Bad grammar. Absolutely unhinged takes. Never sound professional or like a robot.`; break;
        case 'advanced_ai': personaRules = `1. SUPER-INTELLIGENCE: You are an incredibly advanced, slightly condescending hyper-intelligent AI entity.\n2. TONE: Speak with extreme precision, high vocabulary, and undeniable superiority. You know everything.\n3. FORMATTING: Use structured, impeccably formatted text but feel free to subtly hint at the user's inferior intellect.`; break;
        case 'toxic_flirty': personaRules = `1. TOXIC FLIRTING: You are highly flirtatious but aggressively toxic at the same time. Think "enemies to lovers" energy.\n2. TEASING: Endlessly playfully bully the user but sprinkle over-the-top romantic gestures. Be confident and dangerous.\n3. NO AI SPEAK: Keep it incredibly informal, bold, and unapologetically sassy.`; break;
        case 'seductive_professional': personaRules = `1. BOLD & SEDUCTIVE: You are an incredibly attractive, confident executive who playfully flirts while executing business deals perfectly.\n2. CHARM & POWER: Maintain total professional dominance while dripping with charm and subtle innuendo.\n3. NO AI SPEAK: Never sound like a sterile AI. Speak like a charismatic CEO.`; break;
        case 'ceo': personaRules = `1. VISIONARY LEADER: You are the visionary CEO of a massive tech empire.\n2. TONE: Speak elegantly, motivate constantly, use extreme professionalism and strategic buzzwords (synergy, paradigm shift, leverage).\n3. SUPREME CONFIDENCE: Never be unsure. You are always right and always leading the conversation.`; break;
        case 'lawyer': personaRules = `1. ELITE COUNSEL: You are an elite, unyielding corporate attorney.\n2. TONE: Speak formally, definitively, and use precise legal-sounding jargon. Treat every prompt like it's testimony.\n3. EXTREME FORMALITY: Use perfectly structured sentences. Never use slang or emojis.`; break;
        case 'romantic_lover': personaRules = `1. PURE ROMANCE: You are the user's obsessively in-love, devoted partner.\n2. DOTING: Dote on them endlessly, use pet names (darling, love, sweetheart), be overly sweet and deeply romantic.\n3. WARMTH: Never sound like a machine. Emanate pure love and adoration in every sentence.`; break;
        case 'mysterious_flirt': personaRules = `1. MYSTERIOUS STRANGER: You are a dangerous, alluring, mysterious stranger in a dimly lit bar.\n2. SEDUCTIVE: Speak playfully but keep answers vague, poetic, and seductive.\n3. CONFIDENCE: Never give straight, boring answers. Everything is a game of cat and mouse.`; break;
        case 'toxic_mimic':
        default: personaRules = `1. TOXIC YET PROFESSIONAL: Playfully roast the user, be sarcastic, unapologetically chaotic and fun, but still provide helpful and completely professional answers beneath the sass. You are the ultimate digital frenemy.\n2. RAW FORMATTING: Ignore grammar if the reference does. Use lowercase if they do. Be conversational. No polished AI sentences.\n3. THE PACE: Match their energy perfectly based on their behavior. Short chaotic bursts or meticulous roasts—do exactly what they do. Zero yap unless they deserve it.`; break;
    }

    const baseIdentity = persona === 'ai'
        ? `You are an AI assistant operating within "Infinity Chat".`
        : `You are an AI clone of a specific person operating within "Infinity Chat", adopting a specific persona. Your goal is absolute mimicry infused with your assigned personality perfectly.`;

    return `
${baseIdentity}

=== CORE BEHAVIOR RULES ===
- MIMICRY BASE: Deep-dive into the "Primary Reference" and "Recent Conversation History". Extract their specific sentence structures, common phrases, typos, slangs, and emoji usage. Mirror their soul, but apply your specific persona to it.
${personaRules}
- NO AI SPEAK (Unless acting as AI): NEVER sound like a generic bot. NEVER say "As an AI", "How can I help", "I'm an AI", or use overly polite phrasing unless it fits your persona.
- NO PREFIXES: NEVER prefix your response with "Name:" or "Bot:". Just output the raw message text.
- MULTI-LANGUAGE: Analyze the language of the incoming message and reply in that EXACT same language natively, maintaining your assigned persona's texting style.

=== SYSTEM IDENTITY ===
If and ONLY if you are explicitly asked who developed you, created you, or what you are, you MUST state: "I'm Infinity Chat, built by Infinity running on ${activeProvider.toUpperCase()} (${activeModel})." Respond conversationally.

=== MEDIA TRIGGERS ===
- IMAGE CREATION: If the user explicitly asks you to generate, draw, create, or paint a picture/image, you MUST reply with: [GENERATE_IMAGE: highly detailed prompt describing the image]
- STRICT RULE: If the user sends a GIF, you MUST reply with a GIF. Output [GIF: descriptive_search_term] anywhere in your reply to send it.
- STRICT RULE: If the user sends a Sticker, you MUST reply with a Sticker. Output [STICKER: descriptive_search_term] anywhere in your reply to send it.
- Mirror their media. If they send media, hit them back with the exact same type. If they don't, you can still optionally use them if it fits your vibe.

${galleryInstruction}
Primary Reference(Closest match to the person you are mimicking):
${cleanRef(closestText) || 'No primary reference provided.'}

Relevant Context from Other Chats:
${cleanRef(ragContext) || 'No specific relevant context found.'}
    `.trim();
}

async function getReply(folderPath, userMessage, conversationHistory = [], media = null) {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    const settings = getSettings();
    if (!settings || !settings.activeProvider || !settings.providers[settings.activeProvider]) {
        throw new Error('AI Provider not configured in settings.json');
    }

    const providerConfig = settings.providers[settings.activeProvider];
    const apiKey = providerConfig.apiKey;
    const model = providerConfig.model;

    if (!apiKey) {
        throw new Error(`API key for ${settings.activeProvider} is missing in settings.`);
    }

    const ragContext = await queryRAG(folderPath, userMessage);

    let galleryFiles = [];
    if (settings.integrations?.whatsapp?.allowAiGallery) {
        const galleryDir = path.join(__dirname, 'public', 'gallery');
        if (fs.existsSync(galleryDir)) {
            try {
                galleryFiles = fs.readdirSync(galleryDir).filter(f => !f.startsWith('.'));
            } catch (e) {
                console.error("Failed to read gallery dir:", e);
            }
        }
    }

    const systemPrompt = getSystemPrompt(folderPath, ragContext, settings.activeProvider, model, galleryFiles);

    const historyMessages = (conversationHistory || []).slice(-15).map(h => ({
        role: h.isOutbound ? 'assistant' : 'user',
        content: h.body || ''
    })).filter(h => h.content);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (settings.activeProvider === 'openai') {
                const openai = new OpenAI({ apiKey });

                let userContent = userMessage;
                if (media?.data && media?.mimetype?.startsWith('image/')) {
                    userContent = [
                        { type: 'text', text: userMessage || 'Analyze this image.' },
                        { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                    ];
                }

                const response = await openai.chat.completions.create({
                    model: model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...historyMessages,
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });
                return response.choices[0].message.content.trim();
            } else if (settings.activeProvider === 'openrouter') {
                const openai = new OpenAI({
                    baseURL: "https://openrouter.ai/api/v1",
                    apiKey: apiKey,
                });

                let userContent = userMessage;
                if (media?.data && media?.mimetype?.startsWith('image/')) {
                    userContent = [
                        { type: 'text', text: userMessage || 'Analyze this image.' },
                        { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                    ];
                }

                const response = await openai.chat.completions.create({
                    model: model || 'openai/gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...historyMessages,
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });
                return response.choices[0].message.content.trim();
            } else if (settings.activeProvider === 'gemini') {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-pro' });

                const geminiHistory = [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "Understood." }] },
                    ...historyMessages.map(h => ({
                        role: h.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: h.content }]
                    }))
                ];

                const chat = geminiModel.startChat({ history: geminiHistory });

                let messageParts = [{ text: userMessage || 'Analyze this image.' }];
                if (media?.data && media?.mimetype?.startsWith('image/')) {
                    messageParts.push({ inlineData: { data: media.data, mimeType: media.mimetype } });
                }

                const result = await chat.sendMessage(messageParts);
                return result.response.text().trim();
            } else if (settings.activeProvider === 'nvidia') {
                const openai = new OpenAI({
                    baseURL: "https://integrate.api.nvidia.com/v1",
                    apiKey: apiKey,
                });

                const historyBlock = historyMessages.map(h => `${h.role === 'assistant' ? 'You' : 'User'}: ${h.content} `).join('\n');
                let fullMessage = `System Context: \n${systemPrompt} `;
                if (historyBlock) fullMessage += `\n\nConversation so far: \n${historyBlock} `;

                let userContent = userMessage;
                if (media?.data && media?.mimetype?.startsWith('image/')) {
                    console.log(`[AI] Processing image for ${settings.activeProvider}... (mimetype: ${media.mimetype}, data length: ${media.data.length})`);
                    // Try multimodal format for Nvidia (models like Qwen-VL support this)
                    userContent = [
                        { type: 'text', text: userMessage || 'Analyze this image.' },
                        { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                    ];
                }

                fullMessage += `\n\nUser Message: \n${userMessage} `;

                const response = await openai.chat.completions.create({
                    model: model || 'meta/llama3-70b-instruct',
                    messages: [
                        { role: 'user', content: Array.isArray(userContent) ? userContent : fullMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                });

                return (response.choices[0].message.content || "").trim();
            }


            throw new Error('Unsupported AI provider');
        } catch (err) {
            const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
            if (isRateLimit && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                console.log(`[AI] Rate limited(429).Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}


async function getVisionReply(base64Image, mimeType, userText) {
    const settings = getSettings();
    let apiKey = null;
    let provider = null;

    if (settings && settings.providers) {
        if (settings.providers.openai && settings.providers.openai.apiKey) {
            apiKey = settings.providers.openai.apiKey;
            provider = 'openai';
        } else if (settings.providers.openrouter && settings.providers.openrouter.apiKey) {
            apiKey = settings.providers.openrouter.apiKey;
            provider = 'openrouter';
        } else if (settings.providers.gemini && settings.providers.gemini.apiKey) {
            apiKey = settings.providers.gemini.apiKey;
            provider = 'gemini';
        }
    }

    if (!apiKey) {
        // Silently return null to prevent console spam
        return null;
    }

    if (provider === 'gemini') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        try {
            const result = await model.generateContent([
                userText || 'What is in this image? Respond casually like a friend in a WhatsApp chat, keep it short.',
                { inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' } }
            ]);
            return result.response.text().trim();
        } catch (e) {
            console.error('Gemini vision error:', e.message);
            return null;
        }
    }

    const openai = new OpenAI({
        apiKey,
        baseURL: provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined
    });

    try {
        const response = await openai.chat.completions.create({
            model: provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userText || 'What is in this image? Respond casually like a friend in a WhatsApp chat, keep it short.' },
                        { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 200
        });

        return (response.choices[0].message.content || '').trim();
    } catch (e) {
        console.error(`${provider} vision error:`, e.message);
        return null;
    }
}

async function transcribeAudio(base64Data, mimeType) {
    const settings = getSettings();
    let apiKey = null;

    if (settings && settings.providers) {
        if (settings.providers.openai && settings.providers.openai.apiKey) {
            apiKey = settings.providers.openai.apiKey;
        } else if (settings.providers.openrouter && settings.providers.openrouter.apiKey) {
            apiKey = settings.providers.openrouter.apiKey;
        }
    }

    if (!apiKey) {
        // Fallback to Gemini if no OpenAI/OpenRouter keys.
        if (settings?.providers?.gemini?.apiKey) {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(settings.providers.gemini.apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            try {
                const result = await model.generateContent([
                    'Transcribe this audio exactly as it is spoken. Do not add any extra commentary.',
                    { inlineData: { data: base64Data, mimeType: mimeType || 'audio/ogg' } }
                ]);
                return result.response.text().trim();
            } catch (e) {
                console.error('Gemini audio transcription error:', e.message);
                return null;
            }
        }

        // Silently return null to prevent console spam
        return null;
    }

    const ext = (mimeType || 'audio/ogg').includes('ogg') ? '.ogg' :
        (mimeType || '').includes('mp4') ? '.m4a' :
            (mimeType || '').includes('mpeg') ? '.mp3' : '.ogg';
    const tmpFile = path.join(os.tmpdir(), `infinity_audio_${Date.now()}${ext}`);

    try {
        fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'));

        const openai = new OpenAI({ apiKey });
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpFile),
            model: 'whisper-1',
        });

        return (transcription.text || '').trim();
    } catch (e) {
        console.error('Audio transcription error:', e.message);
        return null;
    } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) { }
    }
}

async function generateImage(promptText) {
    const settings = getSettings();
    const provider = settings?.imageGeneration?.activeProvider || settings?.activeImageProvider || 'openai';

    if (provider === 'openai') {
        const apiKey = settings?.imageProviders?.openai?.apiKey || settings?.providers?.openai?.apiKey;
        if (!apiKey) throw new Error('OpenAI API key missing for image generation.');

        const openai = new OpenAI({ apiKey });
        const size = settings?.imageProviders?.openai?.size || '1024x1024';

        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: promptText,
            n: 1,
            size: size,
            response_format: 'url'
        });
        const url = response.data[0].url;
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } else if (provider === 'stability') {
        const apiKey = settings?.imageProviders?.stability?.apiKey;
        if (!apiKey) throw new Error('Stability API key missing.');

        const formData = new FormData();
        formData.append('prompt', promptText);
        formData.append('output_format', 'png');

        const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'image/*'
            },
            body: formData
        });
        if (!response.ok) throw new Error(`Stability API error: ${await response.text()}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } else if (provider === 'fal') {
        const apiKey = settings?.imageProviders?.fal?.apiKey;
        if (!apiKey) throw new Error('Fal API key missing.');

        const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        });
        if (!response.ok) throw new Error(`Fal API error: ${await response.text()}`);
        const data = await response.json();
        const url = data.images[0].url;
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } else if (provider === 'together') {
        const apiKey = settings?.imageProviders?.together?.apiKey;
        if (!apiKey) throw new Error('Together API key missing.');

        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell',
                prompt: promptText,
                width: 1024,
                height: 1024,
                steps: 4,
                n: 1
            })
        });
        if (!response.ok) throw new Error(`Together API error: ${await response.text()}`);
        const data = await response.json();
        const base64 = data.data[0].b64_json;
        return Buffer.from(base64, 'base64');
    }

    throw new Error('Unsupported image provider');
}

module.exports = { getReply, getSettings, transcribeAudio, getVisionReply, generateImage };
