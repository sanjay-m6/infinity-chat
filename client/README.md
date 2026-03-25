<h1 align="center">🎨 Infinity Chat UI</h1>

<p align="center">
  <strong>High-Performance React Interface for AI Multi-Channel Chat</strong>
</p>

---

## 🚀 Development Mode

The frontend is built with **React 18** and **Vite** for maximum speed.

```bash
# Install and start
cd client
npm install
npm run dev
```

- **Dashboard**: `http://localhost:5173`
- **Backend Link**: Ensure the core server is running on `http://localhost:3000`.

---

## 🏗️ UI Architecture

This frontend is designed for real-time responsiveness and low latency:

- **⚡ State Management**: Powered by `Zustand` with persistent storage for session tokens and UI preferences.
- **🎨 Styling**: Vanilla **Tailwind CSS v4** with a custom design system focused on dark-mode glassmorphism.
- **🔌 Real-time**: Bi-directional communication via `Socket.io-client` for instant message updates.
- **🧩 Component Strategy**: Atomic design using modular components in `src/components/`.

---

## 📦 Production Delivery

To package the UI for production use:

```bash
npm run build
```

This generates a highly optimized `dist/` folder. The Infinity Chat backend is pre-configured to serve these static assets automatically on port 3000.

---

## 🛠️ Key Components

- **`ChatArea.jsx`**: Handles multi-channel message rendering and AI response streaming.
- **`Sidebar.jsx`**: Dynamic account switcher and contact list with status indicators.
- **`SettingsPanel.jsx`**: Central hub for AI provider configuration and persona selection.

---

Built with 🖤 for the **Infinity** ecosystem.
