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
  if (process.platform !== "win32") {
    try {
      const out = execSync("lpstat -a 2>/dev/null || true", { encoding: "utf8", timeout: 5000 });
      return out.split("\n").filter(l => l.trim()).map(l => ({ name: l.split(" ")[0], status: "ready" }));
    } catch { return []; }
  }

  // Windows: try PowerShell Get-Printer first (works on Win10 + Win11)
  try {
    const ps = `Get-Printer | Select-Object Name,PrinterStatus | ConvertTo-Json -Compress`;
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps],
      { encoding: "utf8", timeout: 10000 });
    const parsed = JSON.parse(out.trim());
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter(p => p && p.Name)
      .map(p => ({
        name: p.Name.trim(),
        // PrinterStatus 0 = Idle/Ready, 3 = offline
        status: (p.PrinterStatus === 3 || p.PrinterStatus === "Offline") ? "offline" : "ready",
      }));
  } catch { /* fall through to wmic */ }

  // Fallback: wmic (deprecated on Win11 but still present on Win10)
  try {
    const out = execSync('wmic printer get Name,WorkOffline /format:csv 2>nul',
      { encoding: "utf8", timeout: 8000 });
    return out.split("\n")
      .map(l => l.replace(/\r/g, "").trim())
      .filter(l => l && !l.startsWith("Node"))
      .map(line => {
        const parts = line.split(",");
        const name    = (parts[1] || "").trim();
        const offline = (parts[2] || "").trim().toUpperCase() === "TRUE";
        return name ? { name, status: offline ? "offline" : "ready" } : null;
      })
      .filter(Boolean);
  } catch { return []; }
}

// ── Pre-compiled print DLL path (persists across print jobs for speed) ─────────
const RAWPRINT_DLL = path.join(os.homedir(), ".pos_rawprint.dll");

function ensurePrintDll() {
  if (fs.existsSync(RAWPRINT_DLL)) return; // Already compiled, reuse it
  console.log("   [usb] Compiling print driver (one-time, ~5 sec)...");
  const csCode = `
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
    }
    [DllImport("winspool.drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA pDocInfo);
    [DllImport("winspool.drv", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true, ExactSpelling=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true, ExactSpelling=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    [DllImport("winspool.drv", SetLastError=true, ExactSpelling=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    public static bool Send(string printerName, byte[] bytes) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        DOCINFOA di = new DOCINFOA(); di.pDocName = "POS"; di.pDatatype = "RAW";
        bool ok = false;
        if (StartDocPrinter(hPrinter, 1, di) > 0) {
            if (StartPagePrinter(hPrinter)) {
                IntPtr pBuf = Marshal.AllocCoTaskMem(bytes.Length);
                Marshal.Copy(bytes, 0, pBuf, bytes.Length);
                int written;
                ok = WritePrinter(hPrinter, pBuf, bytes.Length, out written);
                Marshal.FreeCoTaskMem(pBuf);
                EndPagePrinter(hPrinter);
            }
            EndDocPrinter(hPrinter);
        }
        ClosePrinter(hPrinter);
        return ok;
    }
}`;
  const dllPath = RAWPRINT_DLL.replace(/\\/g, "\\\\");
  const psCompile = `Add-Type -TypeDefinition @'\n${csCode}\n'@ -OutputAssembly '${dllPath}'`;
  execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCompile],
    { timeout: 60000 });
  console.log("   [usb] Print driver compiled OK.");
}

// ── Raw print to local/USB printer ────────────────────────────────────────────
function printToLocalPrinter(printerName, data) {
  const tmpFile = path.join(os.tmpdir(), `pos_${Date.now()}.bin`);
  fs.writeFileSync(tmpFile, data);
  try {
    if (process.platform === "win32") {
      // Ensure the compiled DLL exists (compiles once, reuses forever)
      try { ensurePrintDll(); } catch (e) {
        // If DLL compilation failed, delete and retry once
        try { fs.unlinkSync(RAWPRINT_DLL); } catch {}
        ensurePrintDll();
      }

      const safeName = printerName.replace(/'/g, "''");
      const safePath = tmpFile.replace(/\\/g, "\\\\");
      const safeDll  = RAWPRINT_DLL.replace(/\\/g, "\\\\");

      const psScript = `
$ErrorActionPreference = 'Stop'
$bytes = [System.IO.File]::ReadAllBytes('${safePath}')
Add-Type -Path '${safeDll}'
if (-not [RawPrinter]::Send('${safeName}', $bytes)) { throw "Print failed — check printer is online: ${safeName}" }`;

      execFileSync("powershell",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { timeout: 20000 });
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
  const data = await (type === "kot" ? buildKOT(sale, printConfig) : buildReceipt(sale, printConfig));

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

  // Pre-compile USB print driver on Windows so first print is instant
  if (process.platform === "win32") {
    setImmediate(() => {
      try { ensurePrintDll(); }
      catch (e) { console.log("   [usb] Print driver init failed:", e.message.split("\n")[0]); }
    });
  }
});
