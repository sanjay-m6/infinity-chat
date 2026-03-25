# Infinity Chat - Frontend (React + Vite)

This directory contains the React-based user interface for Infinity Chat. It is powered by **Vite** for ultra-fast development and optimized production builds.

## 🛠️ Developer Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`. For the API to work, ensure the backend is running at `http://localhost:3000`.

## 📦 Building for Production

```bash
npm run build
```
The output will be in `dist/`. The backend is configured to serve this directory automatically.

## 🎨 UI Architecture

- **Context Stores**: Uses `zustand` for state management (`useInstagramStore`, `useWhatsAppStore`).
- **Components**: Atomic components for chat area, sidebar, and settings.
- **Theming**: Sleek Dark Mode with custom CSS vars for branded "Infinity" aesthetic.

## 📝 Notes
- Ensure `.env` in the root is configured before attempting to connect Instagram.
- Check browser console for detailed WebSocket connection logs.
