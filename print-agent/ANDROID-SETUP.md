# Running Print Agent on Android (Termux)

This allows your Android tablet/phone to directly control a USB or network printer.

## Requirements
- Android 7+ tablet or phone
- Termux app (install from F-Droid — NOT from Play Store, that version is outdated)
- USB OTG adapter (if using USB printer)
- OR: Network/WiFi printer

## Installation Steps

### Step 1: Install Termux
Download from: https://f-droid.org/en/packages/com.termux/

### Step 2: Install Node.js in Termux
Open Termux and run:
```
pkg update && pkg upgrade
pkg install nodejs git
```

### Step 3: Get the print agent
```
git clone https://github.com/nabeelnaushad08/POS.git
cd POS/print-agent
npm install
```

### Step 4: Start the agent
```
npm start
```

You'll see the LAN IP address. Enter that in POS Settings → Print Agent URL.

### Step 5: Auto-start on Android boot
Install Termux:Boot from F-Droid, then create:
```
mkdir -p ~/.termux/boot
echo '#!/data/data/com.termux/files/usr/bin/sh
cd ~/POS/print-agent && node index.js &' > ~/.termux/boot/start-pos-agent.sh
chmod +x ~/.termux/boot/start-pos-agent.sh
```

## Notes
- USB printing on Android requires root OR a USB thermal printer that supports network mode
- Network/WiFi printing works without root
- Keep Termux running in the background (don't swipe away)
