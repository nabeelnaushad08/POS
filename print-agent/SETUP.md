# POS Print Agent — Setup Guide

The POS Print Agent runs locally on port 3001 and bridges the browser-based POS system to your thermal printer. It must be running for printing to work.

---

## Option A — Windows Service (Recommended for Windows)

Installs the agent as a native Windows service using `node-windows`. The service starts automatically on every boot, even before any user logs in.

**Requirements:** Node.js 18+, Administrator privileges

**Install:**
1. Right-click `install-service.bat` → **Run as Administrator**
2. The service installs and starts immediately.
3. Confirm in Windows Services (`Win + R` → `services.msc`) — look for **POS Print Agent**.

**Uninstall:**
1. Right-click `uninstall-service.bat` → **Run as Administrator**
2. The service stops and is removed from startup.

**Notes:**
- Service restarts automatically if it crashes (up to 10 times).
- To reinstall after changing code: uninstall first, then install again.
- Service logs are stored in the `daemon/` folder created next to `index.js`.

---

## Option B — PM2 Auto-start (Recommended for Mac/Linux, also works on Windows)

PM2 is a cross-platform process manager that keeps the agent running and restarts it on system boot.

**Requirements:** Node.js 18+, npm

### Windows

1. Open Command Prompt as Administrator.
2. Run: `setup-pm2.bat`
3. Follow any on-screen instructions.

### Mac / Linux

```bash
bash setup-pm2.sh
```

After running, copy and execute the `sudo env PATH=...` command that PM2 prints — this registers PM2 with your init system (systemd/launchd).

**Useful PM2 commands:**
```bash
pm2 status                    # Check if agent is running
pm2 logs pos-print-agent      # View live logs
pm2 stop pos-print-agent      # Stop the agent
pm2 start pos-print-agent     # Start the agent
pm2 restart pos-print-agent   # Restart after config changes
pm2 delete pos-print-agent    # Remove from PM2
```

---

## Option C — Manual Start (For Testing Only)

Run the agent manually in a terminal window. It stops when you close the terminal.

```bash
cd print-agent
npm start
```

The agent listens on `http://localhost:3001`.

---

## Troubleshooting

### Agent not responding / POS shows "Print Agent offline"
- Check that the agent is running: open `http://localhost:3001/health` in your browser.
- If using Windows Service: open `services.msc` and check the **POS Print Agent** status.
- If using PM2: run `pm2 status` and `pm2 logs pos-print-agent`.
- Restart the agent and try again.

### Port 3001 already in use
- Another process is using port 3001. Find it: `netstat -ano | findstr :3001` (Windows) or `lsof -i :3001` (Mac/Linux).
- Kill the conflicting process or change the port in `index.js` and update the POS app's print agent URL setting.

### Windows Service fails to install
- Make sure you ran `install-service.bat` as **Administrator** (right-click → Run as Administrator).
- Ensure Node.js is installed system-wide (not just for the current user).
- Check the `daemon/` folder for error logs after attempting installation.

### PM2 not found after reboot
- On Linux/Mac: you may have skipped running the `sudo env PATH=...` command that `pm2 startup` printed. Run `pm2 startup` again and execute the full command it outputs.
- On Windows: run `pm2-startup install` in an Administrator command prompt.

### Printer not printing / wrong format
- Check printer settings in the POS app (Settings → Print Agent).
- Ensure the thermal printer is connected and the TCP port (usually 9100) is correct.
- Test the connection: `node -e "require('./printer').testPrint()"` in the print-agent folder.

### Agent crashes repeatedly
- View logs: `pm2 logs pos-print-agent` or check the `daemon/` folder (Windows Service).
- Common causes: missing printer driver, wrong printer IP/port, Node.js version mismatch.
- Ensure Node.js 18+ is installed: `node --version`.
