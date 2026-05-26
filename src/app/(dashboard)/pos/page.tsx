"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Barcode, RefreshCw, Tag, ShoppingCart, Minus, Plus, Trash2,
  Banknote, CreditCard, Blend, X, CheckCircle, Printer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/components/pos/product-card";
import { useCart } from "@/hooks/use-cart";
import { useSettings, useCurrency } from "@/lib/settings-context";
import type { Product } from "@/types";
import toast from "react-hot-toast";

type PaymentMethod = "CASH" | "CARD" | "MIXED";

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color?: string | null }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const cart = useCart();
  const fmt = useCurrency();
  const settings = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Checkout state — inline
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");

  // Customer search
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);

  // Change overlay
  const [changeOverlay, setChangeOverlay] = useState<{
    show: boolean; change: number; total: number; billLabel: string;
  }>({ show: false, change: 0, total: 0, billLabel: "" });

  const discountNum = parseFloat(discount) || 0;
  const taxNum = parseFloat(tax) || 0;
  const cashNum = parseFloat(cashAmount) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const total = Math.max(0, cart.subtotal - discountNum + taxNum);
  const change = paymentMethod === "CASH" ? Math.max(0, cashNum - total) : 0;

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "200", active: "true" });
      if (search) params.set("search", search);
      if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.data || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.data || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const handleAddToCart = (product: Product) => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: typeof product.sellingPrice === "string" ? parseFloat(product.sellingPrice) : product.sellingPrice,
      costPrice: typeof product.costPrice === "string" ? parseFloat(product.costPrice) : product.costPrice,
      quantity: 1,
      stock: product.stock,
      image: product.image,
      unit: product.unit,
    });
    toast.success(`${product.name} added`, { duration: 1000 });
  };

  const handleCustomerSearch = async () => {
    if (searchPhone.length < 3) return;
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

  const handleSelectCustomer = (c: CustomerResult) => {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setShowResults(false);
    setSearchPhone("");
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

  const resetCheckout = () => {
    setPaymentMethod("CASH");
    setDiscount("0");
    setTax("0");
    setCashAmount("");
    setCardAmount("");
    setNotes("");
    handleClearCustomer();
  };

  const handlePay = async () => {
    if (cart.items.length === 0) return;
    setProcessing(true);
    try {
      const body = {
        items: cart.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          costPrice: i.costPrice,
        })),
        subtotal: cart.subtotal,
        discount: discountNum,
        tax: taxNum,
        total,
        paymentMethod,
        cashAmount: cashNum || undefined,
        cardAmount: cardNum || undefined,
        change,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerId: customerId || undefined,
        notes: notes || undefined,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process sale");
      }

      const { data } = await res.json();
      const cfg = settingsRef.current;
      const billLabel = data.billNumber ? `Bill No. ${data.billNumber}` : data.receiptNumber;

      // ── Show change overlay ───────────────────────────────────────────
      setChangeOverlay({ show: true, change, total: Number(data.total), billLabel });

      // ── Silent print via local agent ──────────────────────────────────
      const agentSettings = {
        systemName: cfg.systemName,
        currencySymbol: cfg.currencySymbol,
        paperWidth: 48,
        footer: "Thank you for your purchase!",
      };

      // Always fire print job — agent being reachable is the source of truth
      const printJob = fetch("http://localhost:3001/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sale: data, type: "receipt", settings: agentSettings }),
      }).then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          toast.error(`Print error: ${e.error || r.status}`, { duration: 5000 });
        }
      }).catch(() => {
        // Agent not running — silent, user may not have a printer
      });
      const kotJob = cfg.kotEnabled
        ? fetch("http://localhost:3001/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sale: data, type: "kot", settings: agentSettings }),
          }).catch(() => {})
        : Promise.resolve();
      Promise.all([printJob, kotJob]);

      cart.clearCart();
      resetCheckout();
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process sale");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Products ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Search & Filters */}
        <div className="p-3 bg-white border-b space-y-2 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode..."
                className="pl-9 h-10"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => { setSearch(""); setSelectedCategory("all"); }}
              title="Clear filters"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all" ? "bg-indigo-600 text-white" : "bg-white border text-slate-600 hover:border-indigo-300"
              }`}
            >
              <Tag className="h-3 w-3" />All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? "text-white" : "bg-white border text-slate-600 hover:border-indigo-300"
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color || "#6366f1" } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="pos-product-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Barcode className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">No products found</p>
            </div>
          ) : (
            <div className="pos-product-grid">
              <AnimatePresence>
                {products.map((product, i) => {
                  const cartItem = cart.items.find(c => c.productId === product.id);
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <ProductCard
                        product={product}
                        onAdd={handleAddToCart}
                        isInCart={!!cartItem}
                        cartQty={cartItem?.quantity || 0}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart + Inline Checkout ────────────────────────────── */}
      <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col bg-white border-l overflow-hidden">

        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Cart</h2>
            {cart.items.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {cart.items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          {cart.items.length > 0 && (
            <button onClick={cart.clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Clear All
            </button>
          )}
        </div>

        {/* Cart items */}
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-300">
            <ShoppingCart className="h-16 w-16 mb-3" />
            <p className="font-medium text-slate-400">Cart is empty</p>
            <p className="text-sm text-slate-300 mt-1">Click products to add them</p>
          </div>
        ) : (
          <>
            {/* Items list — compact scrollable */}
            <div className="max-h-[220px] overflow-y-auto p-2 space-y-1.5 border-b shrink-0">
              <AnimatePresence initial={false}>
                {cart.items.map(item => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 bg-slate-50 rounded-xl px-2.5 py-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{fmt(item.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-white border flex items-center justify-center hover:bg-red-50 hover:border-red-200"
                      >
                        <Minus className="h-2.5 w-2.5 text-slate-600" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-5 h-5 rounded bg-white border flex items-center justify-center hover:bg-green-50 hover:border-green-200 disabled:opacity-40"
                      >
                        <Plus className="h-2.5 w-2.5 text-slate-600" />
                      </button>
                    </div>
                    <div className="text-right shrink-0 min-w-[56px]">
                      <p className="text-xs font-bold text-indigo-600">{fmt(item.price * item.quantity)}</p>
                      <button
                        onClick={() => cart.removeItem(item.productId)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Scrollable checkout form */}
            <div className="flex-1 overflow-y-auto">

              {/* Customer section */}
              <div className="px-3 py-2.5 border-b space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      {selectedCustomer.name}
                      <span className="ml-1 text-green-600">· {selectedCustomer.phone}</span>
                    </span>
                    <button onClick={handleClearCustomer} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Search by phone..."
                        className="h-8 text-xs flex-1"
                        value={searchPhone}
                        onChange={e => setSearchPhone(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCustomerSearch()}
                      />
                      <Button
                        type="button" variant="outline" size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={handleCustomerSearch}
                        disabled={searchPhone.length < 3 || searchLoading}
                      >
                        {searchLoading ? "..." : <Search className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {showResults && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        {searchResults.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-slate-500">No customers found</div>
                        ) : (
                          <ul>
                            {searchResults.map(c => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCustomer(c)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                                >
                                  <p className="text-xs font-medium text-slate-800">{c.name}</p>
                                  <p className="text-xs text-slate-400">{c.phone}</p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    placeholder="Name (optional)"
                    className="h-8 text-xs"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    className="h-8 text-xs"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Discount & Tax */}
              <div className="px-3 py-2.5 border-b">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Adjustments</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500">Discount</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0.00"
                      className="h-8 text-xs mt-0.5"
                      value={discount} onChange={e => setDiscount(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Tax</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0.00"
                      className="h-8 text-xs mt-0.5"
                      value={tax} onChange={e => setTax(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="px-3 py-2.5 border-b space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: "CASH" as const, label: "Cash", Icon: Banknote },
                    { value: "CARD" as const, label: "Card", Icon: CreditCard },
                    { value: "MIXED" as const, label: "Mixed", Icon: Blend },
                  ] as const).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all text-xs font-medium ${
                        paymentMethod === value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {paymentMethod === "CASH" && (
                  <div className="space-y-1.5">
                    <Input
                      type="number" min={0} step={0.01}
                      placeholder={`Amount received (${fmt(total)})`}
                      className="h-8 text-xs"
                      value={cashAmount}
                      onChange={e => setCashAmount(e.target.value)}
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {[100, 500, 1000, 5000].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setCashAmount(prev => ((parseFloat(prev) || 0) + d).toFixed(2))}
                          className="py-1 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10px] font-semibold transition-all"
                        >
                          +{d >= 1000 ? `${d/1000}K` : d}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      {cashAmount && (
                        <button type="button" onClick={() => setCashAmount("")}
                          className="text-[10px] text-slate-400 hover:text-red-500">Clear</button>
                      )}
                      <button type="button" onClick={() => setCashAmount(total.toFixed(2))}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium ml-auto">
                        Exact amount
                      </button>
                    </div>
                    {cashNum > 0 && cashNum < total && (
                      <p className="text-xs text-red-500 font-medium">
                        Short by {fmt(total - cashNum)}
                      </p>
                    )}
                    {cashNum >= total && cashNum > 0 && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-green-700 font-medium">Change</span>
                        <span className="text-sm font-bold text-green-700">{fmt(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "CARD" && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                    Card total: <span className="font-bold text-slate-800">{fmt(total)}</span>
                  </div>
                )}

                {paymentMethod === "MIXED" && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <Label className="text-[10px] text-slate-500">Cash</Label>
                        <Input type="number" min={0} step={0.01} placeholder="0.00"
                          className="h-8 text-xs mt-0.5"
                          value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500">Card</Label>
                        <Input type="number" min={0} step={0.01} placeholder="0.00"
                          className="h-8 text-xs mt-0.5"
                          value={cardAmount} onChange={e => setCardAmount(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Combined: {fmt(cashNum + cardNum)} / {fmt(total)}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="px-3 py-2.5 border-b">
                <Input placeholder="Notes (optional)..." className="h-8 text-xs"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Order summary */}
              <div className="px-3 py-2.5 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span><span>{fmt(cart.subtotal)}</span>
                </div>
                {discountNum > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount</span><span>-{fmt(discountNum)}</span>
                  </div>
                )}
                {taxNum > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tax</span><span>{fmt(taxNum)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span className="text-indigo-600">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Pay button — fixed bottom */}
            <div className="p-3 border-t bg-white shrink-0">
              <Button
                onClick={handlePay}
                disabled={processing || cart.items.length === 0}
                className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200"
                loading={processing}
              >
                {processing ? "Processing..." : (
                  <span className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Pay {fmt(total)}
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Change Overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {changeOverlay.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-6"
            onClick={() => setChangeOverlay(s => ({ ...s, show: false }))}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Payment Complete</h2>
              <p className="text-slate-500 text-sm mb-6">{changeOverlay.billLabel}</p>

              {changeOverlay.change > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
                  <p className="text-sm font-medium text-green-700 mb-2">Change to Return</p>
                  <p className="text-5xl font-black text-green-600">{fmt(changeOverlay.change)}</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-slate-500">No change required</p>
                  <p className="text-xl font-bold text-slate-800">{fmt(changeOverlay.total)} paid</p>
                </div>
              )}

              <Button
                onClick={() => setChangeOverlay(s => ({ ...s, show: false }))}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-base"
              >
                New Sale
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
