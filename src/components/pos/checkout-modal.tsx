"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, Blend } from "lucide-react";
import type { CartItem } from "@/types";

type PaymentMethod = "CASH" | "CARD" | "MIXED";

interface CheckoutData {
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  discount: number;
  tax: number;
  change: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  onConfirm: (data: CheckoutData) => Promise<void>;
}

export function CheckoutModal({ open, onClose, items, subtotal, onConfirm }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const discountNum = parseFloat(discount) || 0;
  const taxNum = parseFloat(tax) || 0;
  const cashNum = parseFloat(cashAmount) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const total = Math.max(0, subtotal - discountNum + taxNum);
  const change = paymentMethod === "CASH" ? Math.max(0, cashNum - total) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        paymentMethod,
        cashAmount: cashNum || undefined,
        cardAmount: cardNum || undefined,
        discount: discountNum,
        tax: taxNum,
        change,
        total,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Sale</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700 mb-3">Order Summary</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate flex-1 mr-2">{item.name} × {item.quantity}</span>
                  <span className="text-slate-800 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountNum > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountNum)}</span>
                </div>
              )}
              {taxNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span>{formatCurrency(taxNum)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Discount & Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discount ($)</Label>
              <Input type="number" min={0} step={0.01} placeholder="0.00" className="mt-1 h-9"
                value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tax ($)</Label>
              <Input type="number" min={0} step={0.01} placeholder="0.00" className="mt-1 h-9"
                value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "CASH" as const, label: "Cash", Icon: Banknote },
                { value: "CARD" as const, label: "Card", Icon: CreditCard },
                { value: "MIXED" as const, label: "Mixed", Icon: Blend },
              ].map(({ value, label, Icon }) => (
                <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment amounts */}
          {paymentMethod === "CASH" && (
            <div>
              <Label className="text-xs">Cash Received</Label>
              <Input type="number" min={0} step={0.01} placeholder={total.toFixed(2)}
                value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="mt-1" />
              {cashNum >= total && cashNum > 0 && (
                <p className="text-sm text-green-600 mt-1 font-medium">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>
          )}
          {paymentMethod === "CARD" && (
            <div>
              <Label className="text-xs">Card Amount</Label>
              <Input type="number" value={total.toFixed(2)} readOnly className="mt-1 bg-slate-50" />
            </div>
          )}
          {paymentMethod === "MIXED" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cash Amount</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00"
                  value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Card Amount</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00"
                  value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2 text-sm text-slate-500">
                Combined: {formatCurrency(cashNum + cardNum)} / {formatCurrency(total)}
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer Name</Label>
              <Input placeholder="Optional" className="mt-1 h-9"
                value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input placeholder="Optional" className="mt-1 h-9"
                value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input placeholder="Any notes..." className="mt-1 h-9"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
              {loading ? "Processing..." : `Pay ${formatCurrency(total)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
