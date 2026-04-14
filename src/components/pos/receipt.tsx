"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { useCurrency, useSettings } from "@/lib/settings-context";
import { Printer, Download, X } from "lucide-react";
import type { Sale } from "@/types";

interface ReceiptProps {
  sale: Sale;
  onClose: () => void;
}

export function Receipt({ sale, onClose }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const fmt = useCurrency();
  const { systemName, currencySymbol } = useSettings();

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const win = window.open("", "_blank");
    if (win && content) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt #${sale.receiptNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 10px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .center { text-align: center; }
            .total { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `);
      win.document.close();
      win.print();
    }
  };

  const handleDownloadPDF = async () => {
    const sym = currencySymbol;
    const { formatAmount } = await import("@/lib/utils");
    const f = (n: number | string) => formatAmount(n, sym);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: [80, 200] });

    let y = 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(systemName || "POS SYSTEM", 40, y, { align: "center" });

    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt: ${sale.receiptNumber}`, 40, y, { align: "center" });

    y += 5;
    doc.text(formatDateTime(sale.createdAt), 40, y, { align: "center" });

    y += 5;
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFontSize(9);
    (sale.items || []).forEach((item) => {
      const name = item.productName.substring(0, 20);
      const amount = f(Number(item.subtotal));
      doc.text(`${name}`, 5, y);
      doc.text(amount, 75, y, { align: "right" });
      y += 4;
      doc.text(`  ${item.quantity} × ${f(Number(item.unitPrice))}`, 5, y);
      y += 5;
    });

    doc.line(5, y, 75, y);
    y += 5;

    if (Number(sale.discount) > 0) {
      doc.text("Discount:", 5, y);
      doc.text(`-${f(Number(sale.discount))}`, 75, y, { align: "right" });
      y += 5;
    }
    if (Number(sale.tax) > 0) {
      doc.text("Tax:", 5, y);
      doc.text(f(Number(sale.tax)), 75, y, { align: "right" });
      y += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", 5, y);
    doc.text(f(Number(sale.total)), 75, y, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Payment: ${sale.paymentMethod}`, 40, y, { align: "center" });
    if (Number(sale.change) > 0) {
      y += 4;
      doc.text(`Change: ${f(Number(sale.change))}`, 40, y, { align: "center" });
    }

    y += 7;
    doc.text("Thank you for shopping!", 40, y, { align: "center" });

    doc.save(`receipt-${sale.receiptNumber}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl border max-w-sm w-full mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
        <div>
          <h3 className="text-white font-bold">Sale Complete!</h3>
          <p className="text-indigo-200 text-xs">{sale.receiptNumber}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Printable receipt */}
      <div ref={printRef} className="p-5">
        <div className="text-center mb-4">
          <p className="font-bold text-lg">{systemName || "POS SYSTEM"}</p>
          <p className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</p>
          <p className="text-xs text-slate-400">{sale.receiptNumber}</p>
          {sale.customerName && (
            <p className="text-sm font-medium mt-1">Customer: {sale.customerName}</p>
          )}
        </div>

        <div className="border-t border-dashed my-3" />

        <div className="space-y-2">
          {(sale.items || []).map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm font-medium">
                <span className="truncate flex-1 mr-2">{item.productName}</span>
                <span>{fmt(Number(item.subtotal))}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{item.quantity} × {fmt(Number(item.unitPrice))}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed my-3" />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{fmt(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{fmt(Number(sale.discount))}</span>
            </div>
          )}
          {Number(sale.tax) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{fmt(Number(sale.tax))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>TOTAL</span>
            <span className="text-indigo-600">{fmt(Number(sale.total))}</span>
          </div>
        </div>

        <div className="border-t border-dashed my-3" />

        <div className="text-sm text-slate-600 space-y-0.5 text-center">
          <p>Payment: <span className="font-medium">{sale.paymentMethod}</span></p>
          {Number(sale.change) > 0 && (
            <p>Change: <span className="font-medium text-green-600">{fmt(Number(sale.change))}</span></p>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">Thank you for shopping!</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-5">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={onClose}>
          New Sale
        </Button>
      </div>
    </motion.div>
  );
}
