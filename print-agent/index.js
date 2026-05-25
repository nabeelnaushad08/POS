const express = require("express");
const cors    = require("cors");
const { execSync, execFileSync } = require("child_process");
const fs   = require("fs");
const os   = require("os");
const path = require("path");

const { buildReceipt, buildKOT, sendWithRetry, probePort } = require("./printer");
const { getLocalSubnets, COMMON_OCTETS }                   = require("./scanner");
const { load: loadConfig, save: saveConfig }               = require("./settings");

const app  = express();
const PORT = 3001;
const HOST = "127.0.0.1";

// ── CORS: allow any origin (security is TCP-level, 127.0.0.1 only) ───────────
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ── Localhost-only guard ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const raw = req.socket.remoteAddress || "";
  const ok  = raw === "127.0.0.1" || raw === "::1" || raw === "::ffff:127.0.0.1";
  if (!ok) return res.status(403).json({ error: "localhost only" });
  next();
});

app.use(express.json({ limit: "2mb" }));

// ── List system printers ──────────────────────────────────────────────────────
function listSystemPrinters() {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        'wmic printer get Name,WorkOffline /format:csv 2>nul',
        { encoding: "utf8", timeout: 8000 }
      );
      return out.split("\n")
        .filter(l => l.trim() && !l.startsWith("Node"))
        .map(line => {
          const parts = line.split(",");
          const name    = (parts[1] || "").trim();
          const offline = (parts[2] || "").trim().toUpperCase() === "TRUE";
          return name ? { name, status: offline ? "offline" : "ready" } : null;
        })
        .filter(Boolean);
    } else {
      const out = execSync("lpstat -a 2>/dev/null || true", { encoding: "utf8", timeout: 5000 });
      return out.split("\n")
        .filter(l => l.trim())
        .map(l => ({ name: l.split(" ")[0], status: "ready" }));
    }
  } catch {
    return [];
  }
}

// ── Raw print to local/USB printer ────────────────────────────────────────────
function printToLocalPrinter(printerName, data) {
  const tmpFile = path.join(os.tmpdir(), `pos_${Date.now()}.bin`);
  fs.writeFileSync(tmpFile, data);
  try {
    if (process.platform === "win32") {
      // PowerShell raw print via Windows Spooler API — no driver dialog
      const psScript = `
$ErrorActionPreference = 'Stop'
$bytes = [System.IO.File]::ReadAllBytes('${tmpFile.replace(/\\/g, "\\\\")}')
$pName = '${printerName.replace(/'/g, "''")}'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DOCINFO { public int cbSize; public string pDocName; public string pOutputFile; public string pDataType; public int fwType; }
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr h, int lv, ref DOCINFO di);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
}
'@
$di = New-Object RawPrint+DOCINFO
$di.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($di)
$di.pDocName = 'POS'
$di.pDataType = 'RAW'
$hp = [IntPtr]::Zero
if (-not [RawPrint]::OpenPrinter($pName, [ref]$hp, [IntPtr]::Zero)) { throw "Cannot open: $pName" }
[RawPrint]::StartDocPrinter($hp, 1, [ref]$di) | Out-Null
[RawPrint]::StartPagePrinter($hp) | Out-Null
$w = 0; [RawPrint]::WritePrinter($hp, $bytes, $bytes.Length, [ref]$w) | Out-Null
[RawPrint]::EndPagePrinter($hp) | Out-Null
[RawPrint]::EndDocPrinter($hp) | Out-Null
[RawPrint]::ClosePrinter($hp) | Out-Null`;
      execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", psScript], { timeout: 20000 });
    } else {
      execFileSync("lp", ["-d", printerName, "-o", "raw", tmpFile], { timeout: 15000 });
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ── GET / — health ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  const cfg = loadConfig();
  res.json({ status: "ok", name: "POS Print Agent", version: "1.0.0", printerIp: cfg.printerIp || null, printerName: cfg.printerName || null });
});

// ── GET /status — probe configured printer ────────────────────────────────────
app.get("/status", async (_req, res) => {
  const cfg = loadConfig();
  if (cfg.printerType === "usb" && cfg.printerName) {
    const printers = listSystemPrinters();
    const found = printers.find(p => p.name === cfg.printerName);
    return res.json({ status: found ? found.status : "offline", printerName: cfg.printerName, type: "usb" });
  }
  if (!cfg.printerIp) return res.json({ status: "disabled", ip: null });
  try {
    const online = await probePort(cfg.printerIp, cfg.printerPort || 9100, 2500);
    res.json({ status: online ? "online" : "offline", ip: cfg.printerIp, type: "network" });
  } catch {
    res.json({ status: "offline", ip: cfg.printerIp, type: "network" });
  }
});

// ── GET /printers — list available local/USB printers ────────────────────────
app.get("/printers", (_req, res) => {
  const printers = listSystemPrinters();
  res.json({ printers });
});

// ── POST /print — ESC/POS print (network TCP or local USB) ───────────────────
app.post("/print", async (req, res) => {
  const cfg = loadConfig();
  const { sale, type = "receipt", settings: bodySettings = {} } = req.body;
  if (!sale) return res.status(400).json({ error: "Missing sale data" });

  const printConfig = { ...cfg, ...bodySettings, paperWidth: bodySettings.paperWidth || cfg.paperWidth || 48 };
  const data = type === "kot" ? buildKOT(sale, printConfig) : buildReceipt(sale, printConfig);

  // USB / local printer
  if (cfg.printerType === "usb" && cfg.printerName) {
    try {
      printToLocalPrinter(cfg.printerName, data);
      return res.json({ success: true, type, via: "usb", printer: cfg.printerName });
    } catch (err) {
      console.error("[print/usb]", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Network / TCP printer
  if (!cfg.printerIp) return res.status(400).json({ error: "No printer configured. Set up in POS Settings." });
  try {
    await sendWithRetry(cfg.printerIp, cfg.printerPort || 9100, data, 2, cfg.timeout || 6000);
    res.json({ success: true, type, via: "network", ip: cfg.printerIp });
  } catch (err) {
    console.error("[print/net]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /test-print — send a short test page ────────────────────────────────
app.post("/test-print", async (req, res) => {
  const cfg = loadConfig();
  const { printerName, printerIp } = req.body;
  const ESC = 0x1b, GS = 0x1d;
  const testData = Buffer.concat([
    Buffer.from([ESC, 0x40]),          // init
    Buffer.from([ESC, 0x61, 0x01]),    // center
    Buffer.from("--- TEST PRINT ---\n", "utf-8"),
    Buffer.from("POS Print Agent\n",   "utf-8"),
    Buffer.from(new Date().toLocaleString() + "\n", "utf-8"),
    Buffer.from("------------------\n", "utf-8"),
    Buffer.from([0x0a, 0x0a, 0x0a]),
    Buffer.from([GS, 0x56, 0x42, 0x03]),
  ]);

  const targetName = printerName || cfg.printerName;
  const targetIp   = printerIp   || cfg.printerIp;

  if (targetName) {
    try { printToLocalPrinter(targetName, testData); return res.json({ success: true, via: "usb" }); }
    catch (err) { return res.status(500).json({ error: err.message }); }
  }
  if (targetIp) {
    try { await sendWithRetry(targetIp, cfg.printerPort || 9100, testData, 1, 5000); return res.json({ success: true, via: "network" }); }
    catch (err) { return res.status(500).json({ error: err.message }); }
  }
  res.status(400).json({ error: "No printer target specified" });
});

// ── GET /detect — scan LAN for port-9100 devices ─────────────────────────────
app.get("/detect", async (_req, res) => {
  const subnets = getLocalSubnets();
  if (!subnets.length) return res.json({ serverIPs: [], detectedPrinters: [], primaryIP: null, primarySubnet: null });
  const primary = subnets[0];
  try {
    const results = await Promise.all(COMMON_OCTETS.map(async o => {
      const ip = `${primary.subnet}.${o}`;
      return (await probePort(ip, 9100, 800)) ? ip : null;
    }));
    res.json({ serverIPs: subnets.map(s => s.ip), detectedPrinters: results.filter(Boolean), primaryIP: primary.ip, primarySubnet: primary.subnet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /config + POST /config ────────────────────────────────────────────────
app.get("/config", (_req, res) => res.json(loadConfig()));
app.post("/config", (req, res) => {
  try {
    const saved = saveConfig(req.body);
    console.log(`[config] printerType=${saved.printerType || "network"} ip=${saved.printerIp || "-"} name=${saved.printerName || "-"}`);
    res.json({ success: true, config: saved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  const cfg = loadConfig();
  console.log(`\n🖨  POS Print Agent  v1.0.0`);
  console.log(`   Listening on http://${HOST}:${PORT}  (localhost only)`);
  if (cfg.printerType === "usb" && cfg.printerName) console.log(`   USB Printer: ${cfg.printerName}`);
  else if (cfg.printerIp) console.log(`   Network Printer: ${cfg.printerIp}:${cfg.printerPort || 9100}`);
  else console.log(`   No printer configured — open POS Settings to set up.`);
  console.log();
});
