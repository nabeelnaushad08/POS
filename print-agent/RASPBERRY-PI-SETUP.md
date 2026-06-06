# Running Print Agent on Raspberry Pi (Permanent Shared Print Server)

A Raspberry Pi is the best way to run a shared print server for all devices.
It uses almost no power (~3W), runs 24/7, and supports USB thermal printers.

## Requirements
- Raspberry Pi (any model — Pi Zero W, Pi 3, Pi 4)
- Raspberry Pi OS installed
- USB thermal printer OR network printer
- Same WiFi network as your POS devices

## Installation

### Step 1: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
```

### Step 2: Get the print agent
```bash
git clone https://github.com/nabeelnaushad08/POS.git
cd POS/print-agent
npm install
```

### Step 3: Configure printer
If USB printer:
```bash
sudo apt install -y cups
sudo usermod -aG lpadmin pi
```
Then add your printer via CUPS web interface at http://raspberrypi.local:631

### Step 4: Start agent
```bash
npm start
```
Note the LAN IP shown (e.g., http://192.168.1.100:3001). Enter this in POS Settings.

### Step 5: Auto-start on boot (PM2)
```bash
sudo npm install -g pm2
pm2 start index.js --name pos-print-agent
pm2 startup
# Run the command it shows
pm2 save
```

Now the agent starts automatically on every Pi boot.

## Setting up in POS
In Settings → Printer Setup → Print Agent URL:
Enter your Pi's IP: `http://192.168.1.100:3001`
All devices (phones, tablets, laptops) will use this shared agent.
