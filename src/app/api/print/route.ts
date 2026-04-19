import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import net from "net";

// ─── ESC/POS constants ──────────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

const INIT         = Buffer.from([ESC, 0x40]);
const ALIGN_LEFT   = Buffer.from([ESC, 0x61, 0x00]);
const ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]);
const BOLD_ON      = Buffer.from([ESC, 0x45, 0x01]);
const BOLD_OFF     = Buffer.from([ESC, 0x45, 0x00]);
const SIZE_NORMAL  = Buffer.from([GS, 0x21, 0x00]);
const SIZE_DBL_HW  = Buffer.from([GS, 0x21, 0x11]); // double height + width
const SIZE_DBL_H   = Buffer.from([GS, 0x21, 0x01]); // double height only
const FEED         = Buffer.from([ESC, 0x64, 0x04]); // feed 4 lines
const CUT          = Buffer.from([GS, 0x56, 0x42, 0x03]); // partial cut
const DRAWER       = Buffer.from([ESC, 0x70, 0x00, 0x19, 0x19]); // open cash drawer

function txt(s: string)  { return Buffer.from(s, "utf8"); }
function lf()            { return Buffer.from([0x0a]); }

function padRow(left: string, right: string, cols: number): Buffer {
  const maxLeft = cols - right.length - 1;
  const l = left.substring(0, maxLeft);
  const spaces = cols - l.length - right.length;
  return txt(l + " ".repeat(Math.max(1, spaces)) + right);
}

function divider(char: string, cols: number): Buffer {
  return Buffer.concat([txt(char.repeat(cols)), lf()]);
}

function fmtAmt(n: number | string, symbol: string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `${symbol} ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Receipt builder ────────────────────────────────────────────────────────
function buildReceipt(
  sale: SalePayload,
  opts: { systemName: string; currencySymbol: string; footer?: string | null; cols: number }
): Buffer {
  const { systemName, currencySymbol, footer, cols } = opts;
  const parts: Buffer[] = [];

  parts.push(INIT, ALIGN_CENTER);

  // Store name
  parts.push(BOLD_ON, SIZE_DBL_H, txt(systemName), lf(), SIZE_NORMAL, BOLD_OFF);

  // Bill number (very prominent)
  if (sale.billNumber) {
    parts.push(SIZE_DBL_HW, BOLD_ON, txt(`Bill No. ${sale.billNumber}`), lf(), SIZE_NORMAL, BOLD_OFF);
  }

  // Receipt number + datetime
  parts.push(txt(sale.receiptNumber), lf());
  const dt = new Date(sale.createdAt).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  parts.push(txt(dt), lf());

  if (sale.customerName) {
    parts.push(txt(`Customer: ${sale.customerName}`), lf());
  }

  parts.push(ALIGN_LEFT, divider("-", cols));

  // Items
  for (const item of sale.items || []) {
    const price = fmtAmt(item.subtotal, currencySymbol);
    parts.push(BOLD_ON, padRow(item.productName, price, cols), lf(), BOLD_OFF);
    const detail = `  ${item.quantity} x ${fmtAmt(item.unitPrice, currencySymbol)}`;
    parts.push(txt(detail), lf());
  }

  parts.push(divider("-", cols));

  // Subtotal, discount, tax
  parts.push(padRow("Subtotal", fmtAmt(sale.subtotal, currencySymbol), cols), lf());
  if (Number(sale.discount) > 0) {
    parts.push(padRow("Discount", `-${fmtAmt(sale.discount, currencySymbol)}`, cols), lf());
  }
  if (Number(sale.tax) > 0) {
    parts.push(padRow("Tax", fmtAmt(sale.tax, currencySymbol), cols), lf());
  }

  parts.push(divider("=", cols));

  // Total (large)
  parts.push(ALIGN_CENTER, BOLD_ON, SIZE_DBL_H);
  parts.push(txt(`TOTAL: ${fmtAmt(sale.total, currencySymbol)}`), lf());
  parts.push(SIZE_NORMAL, BOLD_OFF, ALIGN_LEFT);

  // Payment info
  parts.push(txt(`Payment: ${sale.paymentMethod}`), lf());
  if (sale.change != null && Number(sale.change) > 0) {
    parts.push(txt(`Change:  ${fmtAmt(sale.change, currencySymbol)}`), lf());
  }

  // Footer
  if (footer) {
    parts.push(divider("-", cols));
    parts.push(ALIGN_CENTER, txt(footer), lf(), ALIGN_LEFT);
  }

  parts.push(FEED, CUT);

  return Buffer.concat(parts);
}

// ─── KOT builder ────────────────────────────────────────────────────────────
function buildKOT(sale: SalePayload, cols: number): Buffer {
  const parts: Buffer[] = [];
  parts.push(INIT, ALIGN_CENTER);

  parts.push(BOLD_ON, SIZE_DBL_H, txt("*** KITCHEN ORDER ***"), lf(), SIZE_NORMAL, BOLD_OFF);

  if (sale.billNumber) {
    parts.push(SIZE_DBL_HW, BOLD_ON, txt(`No. ${sale.billNumber}`), lf(), SIZE_NORMAL, BOLD_OFF);
  }

  const time = new Date(sale.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  parts.push(txt(time), lf());
  if (sale.customerName) parts.push(txt(sale.customerName), lf());

  parts.push(ALIGN_LEFT, divider("=", cols));

  for (const item of sale.items || []) {
    parts.push(BOLD_ON, SIZE_DBL_H, txt(item.productName.substring(0, cols - 6)), lf(), SIZE_NORMAL, BOLD_OFF);
    parts.push(txt(`    Qty: ${item.quantity}`), lf());
  }

  parts.push(divider("=", cols));
  parts.push(FEED, CUT);

  return Buffer.concat(parts);
}

// ─── TCP sender ─────────────────────────────────────────────────────────────
function sendToPort(ip: string, port: number, data: Buffer, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) { socket.destroy(); reject(err); return; }
        socket.end();
      });
    });
    socket.on("close", () => resolve());
    socket.on("error", (err) => { socket.destroy(); reject(err); });
    socket.on("timeout", () => { socket.destroy(); reject(new Error("Printer connection timed out")); });
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface SaleItem { productName: string; quantity: number; unitPrice: number | string; subtotal: number | string; }
interface SalePayload {
  receiptNumber: string;
  billNumber?: number | null;
  createdAt: string;
  customerName?: string | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paymentMethod: string;
  change?: number | string | null;
  items?: SaleItem[];
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sale, type = "receipt" } = body as { sale: SalePayload; type?: "receipt" | "kot" };

    if (!sale) return NextResponse.json({ error: "Sale data required" }, { status: 400 });

    // Get settings (printer IP, paper size, footer, etc.)
    const [settings, printerSettings] = await Promise.all([
      prisma.systemSettings.findFirst().catch(() => null),
      prisma.printerSettings.findFirst({ where: { type: "POS" } }).catch(() => null),
    ]);

    const printerEnabled = settings?.printerEnabled ?? false;
    const printerIp = settings?.printerIp;

    if (!printerEnabled || !printerIp) {
      return NextResponse.json({ error: "Printer not configured or disabled" }, { status: 400 });
    }

    const paperSize = (printerSettings?.paperSize || "80mm") as "58mm" | "80mm";
    const cols = paperSize === "58mm" ? 32 : 48;
    const currencySymbol = settings?.currencySymbol || "Rs.";
    const systemName = settings?.systemName || "POS System";
    const footer = printerSettings?.showFooter ? (printerSettings?.footer ?? null) : null;

    let printData: Buffer;
    if (type === "kot") {
      printData = buildKOT(sale, cols);
    } else {
      printData = buildReceipt(sale, { systemName, currencySymbol, footer, cols });
    }

    // Send to printer on port 9100 (standard ESC/POS port)
    await sendToPort(printerIp, 9100, printData);

    // Open cash drawer only on receipt print (not KOT), unless card-only
    if (type === "receipt" && sale.paymentMethod !== "CARD") {
      setTimeout(async () => {
        try {
          await sendToPort(printerIp, 9100, DRAWER);
        } catch { /* ignore drawer errors */ }
      }, 500);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Print failed";
    console.error("POST /api/print error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
