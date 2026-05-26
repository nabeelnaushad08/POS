const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "printer-config.json");

const DEFAULTS = {
  printerType: "network",
  printerIp: "",
  printerPort: 9100,
  printerName: "",
  paperWidth: 48,
  systemName: "POS SYSTEM",
  currencySymbol: "Rs.",
  footer: "Thank you for your purchase!",
  timeout: 6000,
  slogan: "",
  whatsApp: "",
  receiptNote: "",
  thankYouLine1: "THANK YOU FOR YOUR VISIT",
  thankYouLine2: "COME AGAIN!",
};

function load() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) };
    }
  } catch (e) {
    console.error("Config read error:", e.message);
  }
  return { ...DEFAULTS };
}

function save(data) {
  const merged = { ...load(), ...data };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

module.exports = { load, save, DEFAULTS };
