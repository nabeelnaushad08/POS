const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "printer-config.json");

const DEFAULTS = {
  printerIp: "",
  printerPort: 9100,
  paperWidth: 48,
  systemName: "POS SYSTEM",
  currencySymbol: "Rs.",
  footer: "Thank you for your purchase!",
  timeout: 6000,
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
  const current = load();
  const merged = { ...current, ...data };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

module.exports = { load, save, DEFAULTS };
