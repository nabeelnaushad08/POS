const net = require("net");

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
function buildReceipt(sale, config) {
  const sym = config.currencySymbol || "Rs.";
  const store = config.systemName || "POS SYSTEM";
  const w = config.paperWidth || 48;
  const f = (n) => fmt(n, sym);

  const p = [];

  // Init + center
  p.push(CMD.INIT, CMD.ALIGN_CENTER);

  // Store name — double height+width
  p.push(CMD.SIZE_DBL_HW, CMD.BOLD_ON, txt(store, w * 2), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  if (config.address) p.push(txt(config.address.substring(0, w)));
  if (config.phone)   p.push(txt(config.phone.substring(0, w)));
  p.push(CMD.FEED);

  // Bill number — quad size
  if (sale.billNumber) {
    p.push(CMD.SIZE_QUAD, CMD.BOLD_ON, txt(`No.${sale.billNumber}`), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  }
  p.push(txt("RECEIPT"));
  p.push(txt(new Date(sale.createdAt).toLocaleString("en-US", { hour12: true }).substring(0, w)));
  p.push(txt(sale.receiptNumber, w));

  if (sale.customerName) {
    p.push(CMD.FEED, CMD.ALIGN_LEFT, txt(`Customer: ${sale.customerName}`, w));
  }

  p.push(CMD.ALIGN_LEFT, divider(w));

  // Items
  (sale.items || []).forEach((item) => {
    const name = (item.productName || "").substring(0, w - 10);
    p.push(CMD.BOLD_ON, txt(name, w), CMD.BOLD_OFF);
    const qtyPart  = `  ${item.quantity} x ${f(item.unitPrice)}`;
    const subPart  = f(item.subtotal);
    const space    = w - qtyPart.length - subPart.length;
    const itemLine = qtyPart + (space > 0 ? " ".repeat(space) : " ") + subPart;
    p.push(txt(itemLine.substring(0, w)));
  });

  p.push(divider(w));

  // Totals
  const sub  = parseFloat(sale.subtotal) || 0;
  const disc = parseFloat(sale.discount) || 0;
  const tax  = parseFloat(sale.tax)      || 0;
  const total= parseFloat(sale.total)    || 0;

  if (disc > 0 || tax > 0) p.push(row("Subtotal", f(sub), w));
  if (disc > 0) p.push(row("Discount", `-${f(disc)}`, w));
  if (tax  > 0) p.push(row("Tax",       f(tax),  w));

  p.push(divider(w, "="));
  p.push(CMD.SIZE_DBL_H, CMD.BOLD_ON, row("TOTAL", f(total), w), CMD.BOLD_OFF, CMD.SIZE_NORMAL);
  p.push(divider(w, "="));

  // Payment line
  p.push(row("Payment", sale.paymentMethod || "CASH", w));
  const cash   = parseFloat(sale.cashAmount) || 0;
  const change = parseFloat(sale.change)     || 0;
  if (sale.paymentMethod === "CASH" && cash > 0) {
    p.push(row("Cash received", f(cash), w));
    if (change > 0) p.push(row("Change", f(change), w));
  }

  // Footer
  p.push(CMD.FEED, CMD.ALIGN_CENTER);
  const footer = config.footer || "Thank you for your purchase!";
  p.push(txt(footer.substring(0, w)));
  p.push(CMD.FEED, CMD.FEED, CMD.FEED);
  p.push(CMD.CUT);

  // Cash drawer — skip for card payments
  if ((sale.paymentMethod || "CASH") !== "CARD") {
    p.push(CMD.DRAWER);
  }

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
