const express = require("express");
const cors    = require("cors");

const { buildReceipt, buildKOT, sendWithRetry, probePort } = require("./printer");
const { getLocalSubnets, scanSubnet, COMMON_OCTETS }       = require("./scanner");
const { load: loadConfig, save: saveConfig }               = require("./settings");

const app  = express();
const PORT = 3001;
const HOST = "127.0.0.1"; // listen on loopback only

// ── CORS: allow any origin ───────────────────────────────────────────────────
// Security is enforced at TCP level — agent only binds to 127.0.0.1 so
// nothing outside this machine can connect regardless of origin header.
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ── Extra guard: reject non-localhost TCP connections ────────────────────────
app.use((req, res, next) => {
  const raw = req.socket.remoteAddress || "";
  const isLocal = raw === "127.0.0.1" || raw === "::1" || raw === "::ffff:127.0.0.1";
  if (!isLocal) return res.status(403).json({ error: "Access denied: localhost only" });
  next();
});

app.use(express.json({ limit: "2mb" }));

// ── GET / — health check ─────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  const cfg = loadConfig();
  res.json({
    status: "ok",
    name: "POS Print Agent",
    version: "1.0.0",
    printerIp: cfg.printerIp || null,
  });
});

// ── GET /status — TCP-probe the configured printer ───────────────────────────
app.get("/status", async (_req, res) => {
  const cfg = loadConfig();
  if (!cfg.printerIp) {
    return res.json({ status: "disabled", ip: null });
  }
  try {
    const online = await probePort(cfg.printerIp, cfg.printerPort || 9100, 2500);
    res.json({ status: online ? "online" : "offline", ip: cfg.printerIp });
  } catch {
    res.json({ status: "offline", ip: cfg.printerIp });
  }
});

// ── POST /print — format ESC/POS and send to printer via TCP ─────────────────
app.post("/print", async (req, res) => {
  const cfg = loadConfig();
  const { sale, type = "receipt", settings: bodySettings = {} } = req.body;

  if (!sale) return res.status(400).json({ error: "Missing sale data" });

  const ip   = cfg.printerIp;
  const port = cfg.printerPort || 9100;
  if (!ip)   return res.status(400).json({ error: "Printer IP not configured. Use POST /config or the settings page." });

  // Merge config-file settings with any overrides from the request body
  const printConfig = {
    ...cfg,
    ...bodySettings,
    paperWidth: bodySettings.paperWidth || cfg.paperWidth || 48,
  };

  try {
    const data = type === "kot"
      ? buildKOT(sale, printConfig)
      : buildReceipt(sale, printConfig);

    await sendWithRetry(ip, port, data, 2, cfg.timeout || 6000);
    res.json({ success: true, type, ip });
  } catch (err) {
    console.error(`[print] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /detect — scan local network for port-9100 devices ───────────────────
app.get("/detect", async (_req, res) => {
  const subnets = getLocalSubnets();
  if (subnets.length === 0) {
    return res.json({ serverIPs: [], detectedPrinters: [], primaryIP: null, primarySubnet: null });
  }

  const primary = subnets[0];

  try {
    // Fast scan: only common octets, 800 ms timeout each, 25 parallel
    const results = await Promise.all(
      COMMON_OCTETS.map(async (o) => {
        const ip = `${primary.subnet}.${o}`;
        const ok = await probePort(ip, 9100, 800);
        return ok ? ip : null;
      })
    );
    const detectedPrinters = results.filter(Boolean);

    // If nothing found in common octets, try full range (slower, background)
    if (detectedPrinters.length === 0) {
      const full = await scanSubnet(primary.subnet, 9100, 800, 30);
      full.forEach((ip) => detectedPrinters.push(ip));
    }

    res.json({
      serverIPs:        subnets.map((s) => s.ip),
      detectedPrinters,
      primaryIP:        primary.ip,
      primarySubnet:    primary.subnet,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /config — return current config ──────────────────────────────────────
app.get("/config", (_req, res) => {
  res.json(loadConfig());
});

// ── POST /config — save config ────────────────────────────────────────────────
app.post("/config", (req, res) => {
  try {
    const saved = saveConfig(req.body);
    console.log(`[config] Saved — printer: ${saved.printerIp || "(none)"}`);
    res.json({ success: true, config: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  const cfg = loadConfig();
  console.log(`\n🖨  POS Print Agent  v1.0.0`);
  console.log(`   Listening on http://${HOST}:${PORT}  (localhost only)`);
  if (cfg.printerIp) {
    console.log(`   Printer: ${cfg.printerIp}:${cfg.printerPort || 9100}`);
  } else {
    console.log(`   No printer configured yet.`);
    console.log(`   → Open POS Settings → Network Printer to scan and configure.`);
  }
  console.log();
});
