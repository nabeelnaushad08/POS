# POS Print Agent

A lightweight Node.js/Express service that runs **locally on the cashier's PC** and acts as a bridge between the browser-based POS and an ESC/POS thermal printer connected over Wi-Fi or LAN (port 9100).

---

## Why is this needed?

Browsers cannot open raw TCP connections, so they cannot talk to a network thermal printer directly. This agent runs on the same machine as the browser and accepts HTTP requests from the POS, formats them as ESC/POS bytes, and delivers them to the printer via TCP port 9100 — producing **completely silent printing** with no browser print dialog.

---

## Requirements

- Node.js 18 or later
- The thermal printer must be on the **same local network** as this PC
- The printer must accept connections on **TCP port 9100** (all Epson TM-series, most generic 80mm/58mm thermal printers)

---

## Setup (one-time)

```bash
# 1. Open a terminal and go to the print-agent folder
cd path/to/POS/print-agent

# 2. Install dependencies (only express and cors — no native addons)
npm install

# 3. Start the agent
npm start
```

You should see:
```
🖨  POS Print Agent  v1.0.0
   Listening on http://127.0.0.1:3001  (localhost only)
   No printer configured yet.
   → Open POS Settings → Network Printer to scan and configure.
```

---

## Configure the printer IP

**Option A — Through the POS settings page (recommended):**
1. Open the POS in your browser
2. Go to **Settings → Network Printer**
3. Enable the toggle
4. Click **Scan Network** — detected printers on port 9100 will appear as chips
5. Click the chip to auto-fill the IP, then click **Test Connection**
6. Click **Save Changes**
7. The agent's `printer-config.json` is updated automatically

**Option B — Manual config file:**
Create `print-agent/printer-config.json`:
```json
{
  "printerIp": "192.168.1.100",
  "printerPort": 9100,
  "paperWidth": 48,
  "systemName": "My Store",
  "currencySymbol": "Rs.",
  "footer": "Thank you for your purchase!"
}
```
Then restart the agent (`npm start`).

---

## Paper width setting

| Printer paper | `paperWidth` value |
|---|---|
| 80 mm | `48` (default) |
| 58 mm | `32` |

---

## API endpoints

All endpoints only accept connections from `localhost` / `127.0.0.1`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns version + configured IP |
| `GET` | `/status` | TCP-probe the configured printer, returns `online`/`offline`/`disabled` |
| `POST` | `/print` | Print a receipt or KOT — body: `{ sale, type, settings }` |
| `GET` | `/detect` | Scan local network for devices on port 9100 |
| `GET` | `/config` | Return current config |
| `POST` | `/config` | Save config (POS settings page calls this automatically) |

---

## Run as a background service (optional)

### Windows — using `pm2`
```bash
npm install -g pm2
pm2 start index.js --name pos-print-agent
pm2 save
pm2 startup   # follow the instructions to auto-start on boot
```

### macOS — using `pm2`
```bash
npm install -g pm2
pm2 start index.js --name pos-print-agent
pm2 save
pm2 startup
```

### Linux — using `pm2`
```bash
npm install -g pm2
pm2 start index.js --name pos-print-agent
pm2 save
pm2 startup systemd
```

---

## Troubleshooting

**Print Agent not running** — The POS Settings page will show "Print Agent not running" when you click Scan Network. Start the agent with `npm start`.

**Printer Offline** — Verify the printer is powered on, connected to the same Wi-Fi/LAN router, and the IP is correct. Use `ping <printer-ip>` to check network connectivity.

**Wrong characters / garbled output** — The printer must support UTF-8 or Latin-1. Most Epson TM-series do. Avoid special Unicode characters in product names.

**Cash drawer not opening** — Ensure the drawer is connected to the RJ11 port on the printer. The agent sends `ESC p` after every non-CARD payment.

**Port 3001 already in use** — Change `const PORT = 3001` in `index.js` to another port (e.g. `3002`), and update all `localhost:3001` references in the POS source code accordingly.
