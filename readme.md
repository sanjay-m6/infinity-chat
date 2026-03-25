# Infinity Chat (formerly Open-TrulyChat)

**Infinity Chat** is a high-performance, self-hosted multi-channel AI automation platform. It allows you to automate WhatsApp and Instagram with a personalized AI digital twin that learns from your chat history.

---

## 🚀 Key Features

- **Multi-Channel Support**: Seamless integration for WhatsApp and Instagram (Private API + Graph API).
- **Style Mimicry**: Learns your unique texting voice from `.txt` chat exports.
- **Multimodal AI (Vision)**: Context-aware image analysis for incoming media.
- **Advanced Dashboard**: Real-time message monitoring, connection states, and analytics.
- **Privacy First**: Local session management and secure configuration.
- **Provider Agility**: Support for OpenAI, Gemini, Nvidia, and OpenRouter.

---

## ⚙️ Prerequisites

- **Node.js**: v18.x or higher
- **Browser**: Chrome or Brave installed (required for WhatsApp Puppeteer)
- **API Keys**: OpenAI, Gemini, or Nvidia API key
- **Meta Developer Account**: For Instagram Graph API integration (optional)

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd open-truly-chat
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Client dependencies
cd client
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri # If using DB storage
# Instagram Graph API
INSTAGRAM_CLIENT_ID=your_facebook_app_id
INSTAGRAM_CLIENT_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/auth/callback
```

### 4. Build the Frontend
```bash
npm run build
```

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode (PM2 Recommended)
```bash
npm run pm2:start
```

---

## 📸 Instagram Graph API Setup

1. Create a Facebook Developer App (Business or Consumer type).
2. Add **Facebook Login for Business** and **Instagram Graph API** products.
3. Configure the **Valid OAuth Redirect URI** in Facebook Login settings.
4. Add your App ID and Secret to `.env`.
5. Authenticate via the "Connect Instagram" button in the dashboard.

---

## 🧪 Advanced Usage

### AI Personas
Configure your bot's personality in `settings.json` or via the UI:
- `toxic_flirty`: Aggressive yet charming "enemies to lovers" vibe.
- `professional`: Precise, corporate, and authority-driven.
- `genz`: unhinged brainrot slang (no cap).

### Image Analysis (Vision)
When a user sends an image, the bot automatically triggers vision processing to "see" the content and respond contextually based on your active persona.

---

## 📝 License
Built with ❤️ by Infinity. Dual-licensed under MIT.
