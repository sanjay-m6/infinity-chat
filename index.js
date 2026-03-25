require("dotenv").config();
const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const open = require("open").default;
const { Server } = require("socket.io");

const { createWaClient, SETTINGS_FILE } = require("./waClient");
const { setupSocket } = require("./socketManager");
const { createIgClient } = require("./igClient");

const settingsRouter = require("./routes/settings");
const whatsappRouter = require("./routes/whatsapp");
const uploadRouter = require("./routes/upload");
const schedulerRouter = require("./routes/scheduler");
const exportRouter = require("./routes/export");
const analyticsRouter = require("./routes/analytics");
const webhooksRouter = require("./routes/webhooks");
const instagramRouter = require("./routes/instagram");
const { initScheduler } = require("./scheduler");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const clientDist = path.join(__dirname, "client", "dist");
const publicDir = path.join(__dirname, "public");
const staticDir = fs.existsSync(clientDist) ? clientDist : publicDir;
app.use(express.static(staticDir));

app.use("/api", settingsRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api", uploadRouter);
app.use("/api", schedulerRouter);
app.use("/api", exportRouter);
app.use("/api", analyticsRouter);
app.use("/api", webhooksRouter);
app.use("/api/instagram", instagramRouter);

app.get(/.*/, (req, res) => {
  const indexPath = fs.existsSync(clientDist)
    ? path.join(clientDist, "index.html")
    : path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build not found. Please run 'npm run build' inside client/");
  }
});

let initializedInstances = new Set();

function initializeAllInstances() {
  let instances = [{ id: 'default', name: 'Primary Account' }];
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      if (Array.isArray(settings.whatsappInstances) && settings.whatsappInstances.length > 0) {
        instances = settings.whatsappInstances;
      }
    }
  } catch (err) {
    console.error("Error loading instances from settings:", err.message);
  }

  instances.forEach(inst => {
    if (initializedInstances.has(inst.id)) return;
    initializedInstances.add(inst.id);

    console.log(`Initializing WhatsApp account: ${inst.name} (${inst.id})...`);
    const wa = createWaClient(inst.id);
    setupSocket(io, wa, inst.id);

    wa.initialize().catch((err) => {
      const message = err?.message || String(err || "Unknown error");
      io.emit("connection_state", { state: "INIT_ERROR", message, clientId: inst.id });
      console.error(`[${inst.id}] Initialize error:`, message);
    });

    wa.on("ready", () => {
      console.log(`[${inst.id}] WhatsApp account ${inst.id} is ready!`);
      // Initialize Instagram instances after WhatsApp is ready
      initializeInstagramInstances();
      initScheduler(wa, io, inst.id);
    });
  });
}

let igInitialized = false;

async function initializeInstagramInstances() {
  if (igInitialized) return;
  igInitialized = true;

  let igInstances = [];
  let oauthToken = null;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      oauthToken = settings.instagramOAuth?.accessToken;
      if (Array.isArray(settings.instagramInstances)) {
        igInstances = settings.instagramInstances.filter(i => i.username && i.password);
      }
    }
  } catch (err) {
    console.error("Error loading Instagram instances:", err.message);
  }

  if (oauthToken) {
    console.log("[IG] Official OAuth token found, skipping private API startup login.");
    return;
  }


  for (const inst of igInstances) {
    try {
      console.log(`Initializing Instagram account: ${inst.name || inst.username} (${inst.id})...`);
      const wrapper = await createIgClient(inst.id, inst.username, inst.password);
      io.emit('ig_ready', { clientId: inst.id, username: wrapper.username });
      console.log(`[${inst.id}] Instagram ready!`);
    } catch (err) {
      console.error(`[${inst.id}] Instagram init error:`, err.message);
      io.emit('ig_error', { clientId: inst.id, error: err.message });
    }
  }
}

function launchServer(startPort, maxAttempts = 15) {
  let attempts = 0;

  const tryListen = (port) => {
    attempts += 1;
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Web app: ${url}`);
      if (port !== Number(PORT)) {
        console.warn(`Port ${PORT} was busy, running on ${port} instead.`);
      }
      open(url).catch(() => { });
      initializeAllInstances();
    });
  };

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE" && attempts < maxAttempts) {
      const nextPort = Number(startPort) + attempts;
      console.warn(`Port ${nextPort - 1} is in use. Retrying on ${nextPort}...`);
      setTimeout(() => tryListen(nextPort), 250);
      return;
    }
    console.error("Server startup failed:", err);
    process.exit(1);
  });

  tryListen(Number(startPort));
}

launchServer(PORT);
