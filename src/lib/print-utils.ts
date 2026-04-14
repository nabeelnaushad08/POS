import type { Sale } from "@/types";
import { formatAmount } from "@/lib/utils";

function formatDateTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

interface PrintSettings {
  systemName?: string;
  currencySymbol?: string;
  headerTitle?: string;
  footer?: string;
  showFooter?: boolean;
  paperSize?: "58mm" | "80mm";
}

function buildReceiptHTML(sale: Sale, settings: PrintSettings, label = "RECEIPT"): string {
  const sym = settings.currencySymbol || "Rs.";
  const f = (n: number | string) => formatAmount(n, sym);
  const width = settings.paperSize === "58mm" ? "200px" : "280px";
  const billNo = sale.billNumber ? `<div style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:2px;">Bill No. ${sale.billNumber}</div>` : "";

  return `<!DOCTYPE html><html><head><title>${label}</title><style>
    body{font-family:'Courier New',monospace;font-size:11px;max-width:${width};margin:0 auto;padding:10px;}
    .row{display:flex;justify-content:space-between;margin:2px 0;}
    .center{text-align:center;} .bold{font-weight:bold;} .divider{border-top:1px dashed #000;margin:6px 0;}
    .total{font-size:14px;font-weight:bold;} .label{font-size:16px;font-weight:bold;text-align:center;margin:4px 0;}
    @media print{body{margin:0;padding:5px;}}
  </style></head><body>
    <div class="label">${settings.systemName || "POS SYSTEM"}</div>
    ${billNo}
    <div class="center" style="font-size:13px;font-weight:bold;margin-bottom:2px;">${label}</div>
    <div class="center" style="color:#666;font-size:10px;">${formatDateTime(sale.createdAt)}</div>
    <div class="center" style="color:#999;font-size:9px;">${sale.receiptNumber}</div>
    ${sale.customerName ? `<div class="center" style="margin-top:3px;">Customer: <b>${sale.customerName}</b></div>` : ""}
    <div class="divider"></div>
    ${(sale.items || []).map(item => `
      <div class="row bold"><span>${item.productName.substring(0, 22)}</span><span>${f(Number(item.subtotal))}</span></div>
      <div class="row" style="color:#666"><span>  ${item.quantity} × ${f(Number(item.unitPrice))}</span></div>
    `).join("")}
    <div class="divider"></div>
    <div class="row"><span>Subtotal</span><span>${f(Number(sale.subtotal))}</span></div>
    ${Number(sale.discount) > 0 ? `<div class="row" style="color:green"><span>Discount</span><span>-${f(Number(sale.discount))}</span></div>` : ""}
    ${Number(sale.tax) > 0 ? `<div class="row"><span>Tax</span><span>${f(Number(sale.tax))}</span></div>` : ""}
    <div class="divider"></div>
    <div class="row total"><span>TOTAL</span><span>${f(Number(sale.total))}</span></div>
    <div class="center" style="margin-top:4px;font-size:10px;">Payment: ${sale.paymentMethod}${Number(sale.change) > 0 ? ` | Change: ${f(Number(sale.change))}` : ""}</div>
    ${settings.showFooter && settings.footer ? `<div class="divider"></div><div class="center" style="color:#555;font-size:10px;">${settings.footer}</div>` : ""}
    <div style="margin-top:6px;text-align:center;color:#999;font-size:9px;">${settings.paperSize || "80mm"} | ${new Date().toLocaleDateString()}</div>
  </body></html>`;
}

function buildKOTHTML(sale: Sale, settings: PrintSettings): string {
  const width = settings.paperSize === "58mm" ? "200px" : "280px";
  const billNo = sale.billNumber ? `<div style="text-align:center;font-size:22px;font-weight:bold;margin:4px 0;">Bill No. ${sale.billNumber}</div>` : "";

  return `<!DOCTYPE html><html><head><title>KOT</title><style>
    body{font-family:'Courier New',monospace;font-size:13px;max-width:${width};margin:0 auto;padding:10px;}
    .row{display:flex;justify-content:space-between;margin:3px 0;font-size:14px;font-weight:bold;}
    .center{text-align:center;} .divider{border-top:2px dashed #000;margin:8px 0;}
    @media print{body{margin:0;padding:5px;}}
  </style></head><body>
    <div style="text-align:center;font-size:16px;font-weight:bold;border:2px solid #000;padding:4px;margin-bottom:6px;">
      *** KITCHEN ORDER ***
    </div>
    ${billNo}
    <div class="center" style="font-size:11px;color:#666;">${new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit"}).format(new Date(sale.createdAt))}</div>
    ${sale.customerName ? `<div class="center" style="font-size:12px;margin:2px 0;">Customer: <b>${sale.customerName}</b></div>` : ""}
    <div class="divider"></div>
    ${(sale.items || []).map((item, i) => `
      <div class="row"><span>${i + 1}. ${item.productName.substring(0, 20)}</span><span>× ${item.quantity}</span></div>
    `).join("")}
    <div class="divider"></div>
    <div class="center" style="font-size:10px;color:#999;">${sale.receiptNumber}</div>
  </body></html>`;
}

export async function printReceipt(sale: Sale, settings: PrintSettings = {}) {
  const html = buildReceiptHTML(sale, settings);
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
    setTimeout(() => win.close(), 500);
  };
}

export async function printKOT(sale: Sale, settings: PrintSettings = {}) {
  const html = buildKOTHTML(sale, settings);
  const win = window.open("", "_blank", "width=400,height=500");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
    setTimeout(() => win.close(), 500);
  };
}
