"use client";
import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, Blend, Search, X } from "lucide-react";
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
  customerId?: string;
  notes?: string;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
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
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  // Customer search state
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const discountNum = parseFloat(discount) || 0;
  const taxNum = parseFloat(tax) || 0;
  const cashNum = parseFloat(cashAmount) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const total = Math.max(0, subtotal - discountNum + taxNum);
  const change = paymentMethod === "CASH" ? Math.max(0, cashNum - total) : 0;

  const handleCustomerSearch = async () => {
    if (searchPhone.length < 5) return;
    setSearchLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(searchPhone)}&limit=5`);
      const data = await res.json();
      setSearchResults(data.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomerSearch();
    }
  };

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowResults(false);
    setSearchPhone("");
    setSearchResults([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerId(undefined);
    setCustomerName("");
    setCustomerPhone("");
    setSearchPhone("");
    setSearchResults([]);
    setShowResults(false);
  };

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
        customerId: customerId || undefined,
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

          {/* Customer Lookup */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Search Customer</Label>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  {selectedCustomer.name}
                  {selectedCustomer.phone && (
                    <span className="ml-1 text-green-600">· {selectedCustomer.phone}</span>
                  )}
                </span>
              </div>
            ) : (
              <div ref={searchRef} className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone number..."
                    className="h-9 flex-1"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                    onClick={handleCustomerSearch}
                    disabled={searchPhone.length < 5 || searchLoading}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {searchLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">No customers found</div>
                    ) : (
                      <ul>
                        {searchResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-slate-800">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
