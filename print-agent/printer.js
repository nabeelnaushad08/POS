const net  = require("net");
const Jimp = require("jimp");

// ── ESC/POS bitmap logo ───────────────────────────────────────────────────────
async function buildLogoBytes(base64Image, maxWidth) {
  try {
    // Strip data URI prefix if present
    const raw = base64Image.replace(/^data:image\/[^;]+;base64,/, "");
    const buf = Buffer.from(raw, "base64");
    const img = await Jimp.read(buf);

    // Scale to fit thermal paper width (max ~256px for 58mm, ~384px for 80mm)
    const targetW = Math.min(maxWidth || 256, img.bitmap.width);
    img.resize(targetW, Jimp.AUTO).greyscale().contrast(0.3);

    const w = img.bitmap.width;
    const h = img.bitmap.height;

    // Convert to 1-bit bitmap row by row (threshold 127)
    const bytesPerRow = Math.ceil(w / 8);
    const rows = [];
    for (let y = 0; y < h; y++) {
      const row = Buffer.alloc(bytesPerRow, 0);
      for (let x = 0; x < w; x++) {
        const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma < 127) row[Math.floor(x / 8)] |= (0x80 >> (x % 8));
      }
      rows.push(row);
    }

    // ESC/POS: GS v 0 — print raster bit image
    const header = Buffer.from([
      0x1d, 0x76, 0x30, 0x00,          // GS v 0 normal
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,  // xL xH
      h & 0xff, (h >> 8) & 0xff,        // yL yH
    ]);
    return Buffer.concat([header, ...rows]);
  } catch {
    return null;
  }
}

// ── ESC/POS byte constants ───────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  ALIGN_LEFT:   Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT:  Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  SIZE_NORMAL:  Buffer.from([GS,  0x21, 0x00]),
  SIZE_DBL_H:   Buffer.from([GS,  0x21, 0x01]),
  SIZE_DBL_W:   Buffer.from([GS,  0x21, 0x10]),
  SIZE_DBL_HW:  Buffer.from([GS,  0x21, 0x11]),
  SIZE_QUAD:    Buffer.from([GS,  0x21, 0x33]),
  FEED:         Buffer.from([0x0a]),
  CUT:          Buffer.from([GS,  0x56, 0x42, 0x03]),
  DRAWER:       Buffer.from([ESC, 0x70, 0x00, 0x19, 0x19]),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function txt(str, maxLen) {
  const s = maxLen ? String(str).substring(0, maxLen) : String(str);
  return Buffer.from(s + "\n", "utf-8");
}

function divider(width, char = "-") {
  return Buffer.from(char.repeat(width) + "\n", "utf-8");
}

function row(left, right, width) {
  const l = String(left);
  const r = String(right);
  const gap = width - l.length - r.length;
  if (gap <= 0) return Buffer.from(l.substring(0, width - r.length - 1) + " " + r + "\n", "utf-8");
  return Buffer.from(l + " ".repeat(gap) + r + "\n", "utf-8");
}

function fmt(amount, sym) {
  const n = parseFloat(amount) || 0;
  return `${sym} ${n.toFixed(2)}`;
}

// ── Receipt builder ──────────────────────────────────────────────────────────
async function buildReceipt(sale, config) {
  const sym   = config.currencySymbol || "Rs.";
  const store = config.systemName     || "POS SYSTEM";
  const w     = config.paperWidth     || 48;
  const f     = (n) => fmt(n, sym);

  // ── helpers ──────────────────────────────────────────────────────
  function twoCol(left, right) {
    const l = String(left), r = String(right);
    if (l.length + r.length + 1 > w) {
      // wrap right to its own line right-aligned
      return Buffer.concat([
        Buffer.from(l.substring(0, w) + "\n", "utf-8"),
        Buffer.from(r.padStart(w) + "\n", "utf-8"),
      ]);
    }
    return Buffer.from(l + " ".repeat(w - l.length - r.length) + r + "\n", "utf-8");
  }

  const p = [];
  p.push(CMD.INIT);

  // ── Cash drawer FIRST (opens as soon as printer receives the job) ──
  const method = (sale.paymentMethod || "CASH").toUpperCase();
  if (method !== "CARD") p.push(CMD.DRAWER);

  p.push(CMD.ALIGN_CENTER);

  // ── Logo (if saved in config) ─────────────────────────────────────
  if (config.logo) {
    const logoBytes = await buildLogoBytes(config.logo, config.paperWidth ? config.paperWidth * 5 : 256);
    if (logoBytes) { p.push(logoBytes); p.push(CMD.FEED); }
  }

  // ── Shop name (large) ─────────────────────────────────────────────
  p.push(CMD.SIZE_DBL_HW, CMD.BOLD_ON);
  p.push(txt(store));
  p.push(CMD.BOLD_OFF, CMD.SIZE_NORMAL);

  // Slogan (if set)
  if (config.slogan) p.push(txt(config.slogan.substring(0, w)));

  // Address, Phone/WhatsApp
  if (config.address) p.push(txt(config.address.substring(0, w)));
  if (config.phone && config.whatsApp) {
    p.push(txt((config.phone + "  WhatsApp: " + config.whatsApp).substring(0, w)));
  } else if (config.phone) {
    p.push(txt(config.phone.substring(0, w)));
  } else if (config.whatsApp) {
    p.push(txt(("WhatsApp: " + config.whatsApp).substring(0, w)));
  }

  p.push(divider(w));

  // ── Date/Time + Invoice side by side ──────────────────────────────
  p.push(CMD.ALIGN_LEFT);
  const saleDate = new Date(sale.createdAt);
  const dateStr  = saleDate.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const timeStr  = saleDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  p.push(twoCol(`Date: ${dateStr}`, sale.billNumber ? `Invoice #: ${sale.billNumber}` : `Ref: ${(sale.receiptNumber||"").slice(-6)}`));
  p.push(twoCol(`Time: ${timeStr}`, `Staff: ${(sale.user && sale.user.name) ? sale.user.name : "-"}`));
  if (sale.customerName) {
    p.push(twoCol(`Customer: ${sale.customerName}`, ""));
  }
  if (sale.customerPhone) {
    p.push(twoCol(`Phone: ${sale.customerPhone}`, ""));
  }

  p.push(divider(w));

  // ── Items header ──────────────────────────────────────────────────
  const colNo   = 3;  // "No."
  const colAmt  = 10; // "AMOUNT" right
  const hdrLine = "No.".padEnd(colNo + 1) + "ITEM".padEnd(w - colNo - 1 - colAmt) + "AMOUNT".padStart(colAmt);
  p.push(CMD.BOLD_ON, Buffer.from(hdrLine.substring(0, w) + "\n", "utf-8"), CMD.BOLD_OFF);
  p.push(divider(w));

  // ── Item rows ─────────────────────────────────────────────────────
  (sale.items || []).forEach((item, idx) => {
    const no      = `${idx + 1}.`;
    const name    = (item.productName || "").substring(0, w - colNo - 2);
    const itemAmt = f(item.subtotal);
    // Line 1: number + name + amount
    const line1 = (no + " " + name).padEnd(w - itemAmt.length) + itemAmt;
    p.push(CMD.BOLD_ON, Buffer.from(line1.substring(0, w) + "\n", "utf-8"), CMD.BOLD_OFF);
    // Line 2: SKU + qty x unit price
    if (item.sku) {
      const detail = `  ${item.sku}   ${item.quantity} x ${f(item.unitPrice)}`;
      p.push(Buffer.from(detail.substring(0, w) + "\n", "utf-8"));
    } else {
      const detail = `    ${item.quantity} x ${f(item.unitPrice)}`;
      p.push(Buffer.from(detail.substring(0, w) + "\n", "utf-8"));
    }
  });

  p.push(divider(w));

  // ── Totals ────────────────────────────────────────────────────────
  const sub   = parseFloat(sale.subtotal) || 0;
  const disc  = parseFloat(sale.discount) || 0;
  const tax   = parseFloat(sale.tax)      || 0;
  const total = parseFloat(sale.total)    || 0;

  p.push(row("GROSS AMOUNT", f(sub), w));
  if (disc > 0) p.push(row("DISCOUNT", `-${f(disc)}`, w));
  if (tax  > 0) p.push(row("TAX",       f(tax),  w));

  p.push(divider(w, "="));
  p.push(CMD.SIZE_DBL_H, CMD.BOLD_ON);
  p.push(row("NET AMOUNT", f(total), w));
  p.push(CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  p.push(divider(w, "="));

  // ── Payment details ───────────────────────────────────────────────
  const cash   = parseFloat(sale.cashAmount) || 0;
  const chg    = parseFloat(sale.change)     || 0;
  const card   = parseFloat(sale.cardAmount) || 0;

  if (method === "CASH") {
    if (cash > 0) p.push(row("CASH TENDERED", f(cash), w));
    if (chg  > 0) p.push(row("CASH BALANCE",  f(chg),  w));
  } else if (method === "CARD") {
    p.push(row("CARD PAYMENT", f(total), w));
  } else if (method === "MIXED") {
    if (cash > 0) p.push(row("CASH TENDERED", f(cash), w));
    if (card > 0) p.push(row("CARD AMOUNT",   f(card), w));
    if (chg  > 0) p.push(row("BALANCE",       f(chg),  w));
  }

  const itemCount = (sale.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  p.push(Buffer.from(`[${itemCount} Item(s)]\n`, "utf-8"));

  // ── Savings banner (if discount) ──────────────────────────────────
  if (disc > 0) {
    p.push(CMD.FEED, CMD.ALIGN_CENTER);
    p.push(CMD.BOLD_ON, CMD.SIZE_DBL_H);
    p.push(txt(`** YOUR SAVING ${sym}${disc.toFixed(2)} **`));
    p.push(CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  }

  // ── Footer ────────────────────────────────────────────────────────
  p.push(CMD.FEED, CMD.ALIGN_CENTER);
  if (config.receiptNote) {
    p.push(divider(w));
    p.push(CMD.BOLD_ON, txt(config.receiptNote.substring(0, w)), CMD.BOLD_OFF);
    p.push(divider(w));
  }
  const ty1 = config.thankYouLine1 || "THANK YOU FOR YOUR VISIT";
  const ty2 = config.thankYouLine2 || "COME AGAIN!";
  p.push(CMD.BOLD_ON, txt(ty1.substring(0, w)), CMD.BOLD_OFF);
  p.push(txt(ty2.substring(0, w)));
  p.push(CMD.FEED);
  // Always fixed software credit
  p.push(txt("(Software by ZENTHOZ - 0779067747)"));
  p.push(CMD.FEED, CMD.FEED, CMD.FEED, CMD.CUT);

  return Buffer.concat(p);
}

// ── KOT builder ──────────────────────────────────────────────────────────────
function buildKOT(sale, config) {
  const store = config.systemName || "POS SYSTEM";
  const w = config.paperWidth || 48;

  const p = [];
  p.push(CMD.INIT, CMD.ALIGN_CENTER);
  p.push(CMD.SIZE_DBL_HW, CMD.BOLD_ON, txt("*** KOT ***"), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  p.push(txt(store, w));
  p.push(CMD.FEED);

  if (sale.billNumber) {
    p.push(CMD.SIZE_QUAD, CMD.BOLD_ON, txt(`No.${sale.billNumber}`), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  }

  const timeStr = new Date(sale.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  p.push(txt(timeStr, w));
  if (sale.customerName) p.push(txt(`Customer: ${sale.customerName}`, w));

  p.push(CMD.ALIGN_LEFT, divider(w, "="));

  (sale.items || []).forEach((item, i) => {
    const qtyTag = `x${item.quantity}`;
    const name   = `${i + 1}. ${item.productName || ""}`;
    const pad    = w - qtyTag.length;
    const line   = name.substring(0, pad - 1).padEnd(pad) + qtyTag;
    p.push(CMD.SIZE_DBL_H, CMD.BOLD_ON, txt(line, w * 2), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  });

  p.push(divider(w, "="), CMD.FEED, CMD.FEED, CMD.FEED, CMD.CUT);
  return Buffer.concat(p);
}

// ── TCP send ─────────────────────────────────────────────────────────────────
function sendToPort(ip, port, data, timeout) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      err ? reject(err) : resolve();
    };

    socket.setTimeout(timeout);
    socket.on("timeout", () => finish(new Error("Connection timed out")));
    socket.on("error",   (e) => finish(e));
    socket.on("close",   ()  => finish());

    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) return finish(err);
        setTimeout(() => finish(), 400);
      });
    });
  });
}

async function sendWithRetry(ip, port, data, maxRetries, timeout) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await sendToPort(ip, port, data, timeout);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ── TCP probe (for status / scanning) ────────────────────────────────────────
function probePort(ip, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.on("connect", () => finish(true));
    socket.on("error",   () => finish(false));
    socket.on("timeout", () => finish(false));
    socket.connect(port, ip);
  });
}

module.exports = { buildReceipt, buildKOT, sendWithRetry, probePort };
