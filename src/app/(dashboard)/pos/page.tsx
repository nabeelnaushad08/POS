"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Barcode, RefreshCw, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/pos/product-card";
import { Cart } from "@/components/pos/cart";
import { CheckoutModal } from "@/components/pos/checkout-modal";
import { useCart } from "@/hooks/use-cart";
import { useSettings } from "@/lib/settings-context";
import type { Product } from "@/types";
import toast from "react-hot-toast";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color?: string | null }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const cart = useCart();
  // Use ref for settings so handleCheckout always gets fresh values
  // without the POS component re-rendering every time settings change
  const settings = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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
    toast.success(`${product.name} added to cart`, { duration: 1500 });
  };

  const handleCheckout = async (checkoutData: {
    paymentMethod: "CASH" | "CARD" | "MIXED";
    cashAmount?: number;
    cardAmount?: number;
    discount: number;
    tax: number;
    change: number;
    total: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }) => {
    try {
      const body = {
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          costPrice: i.costPrice,
        })),
        subtotal: cart.subtotal,
        discount: checkoutData.discount,
        tax: checkoutData.tax,
        total: checkoutData.total,
        paymentMethod: checkoutData.paymentMethod,
        cashAmount: checkoutData.cashAmount,
        cardAmount: checkoutData.cardAmount,
        change: checkoutData.change,
        customerName: checkoutData.customerName,
        customerPhone: checkoutData.customerPhone,
        notes: checkoutData.notes,
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
      cart.clearCart();
      setShowCheckout(false);

      const cfg = settingsRef.current;
      const billLabel = data.billNumber ? `Bill No. ${data.billNumber}` : data.receiptNumber;
      const amtLabel = `${cfg.currencySymbol} ${Number(data.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

      if (cfg.printerEnabled && cfg.printerIp) {
        // ─── Silent ESC/POS print via local print agent (localhost:3001) ─
        const agentSettings = {
          systemName:     cfg.systemName,
          currencySymbol: cfg.currencySymbol,
          paperWidth:     48,
          footer:         "Thank you for your purchase!",
        };
        const printJob = fetch("http://localhost:3001/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sale: data, type: "receipt", settings: agentSettings }),
        });

        const kotJob = cfg.kotEnabled
          ? fetch("http://localhost:3001/print", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sale: data, type: "kot", settings: agentSettings }),
            })
          : Promise.resolve();

        // Fire-and-forget — don't block the success toast
        Promise.all([printJob, kotJob]).catch((err) => {
          console.error("Print failed:", err);
          toast.error("Print failed — is the Print Agent running?", { duration: 4000 });
        });

        toast.success(`${billLabel} · ${amtLabel}`, { duration: 5000, icon: "🧾" });
      } else {
        // ─── Fallback: browser print window if no network printer ──────
        const { printReceipt, printKOT } = await import("@/lib/print-utils");
        const fallbackSettings = {
          systemName: cfg.systemName,
          currencySymbol: cfg.currencySymbol,
          paperSize: "80mm" as const,
          footer: "Thank you for your purchase!",
          showFooter: true,
        };
        printReceipt(data, fallbackSettings);
        if (cfg.kotEnabled) {
          setTimeout(() => printKOT(data, fallbackSettings), 1200);
        }
        toast.success(`${billLabel} · ${amtLabel}`, { duration: 5000, icon: "🧾" });
      }

      loadProducts(); // refresh stock
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process sale";
      toast.error(message);
      throw err;
    }
  };

  return (
    <div className="flex h-full gap-0">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Search & Filters */}
        <div className="p-4 bg-white border-b space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode..."
                className="pl-9 h-11"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => { setSearch(""); setSelectedCategory("all"); }}
              title="Clear filters"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white border text-slate-600 hover:border-indigo-300"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "text-white"
                    : "bg-white border text-slate-600 hover:border-indigo-300"
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color || "#6366f1" } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4">
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
              <p className="text-sm">Try a different search or category</p>
            </div>
          ) : (
            <div className="pos-product-grid">
              <AnimatePresence>
                {products.map((product, i) => {
                  const cartItem = cart.items.find((c) => c.productId === product.id);
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

      {/* Cart Panel */}
      <div className="w-80 lg:w-96 shrink-0 p-4 bg-white border-l">
        <Cart
          items={cart.items}
          subtotal={cart.subtotal}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
          onCheckout={() => setShowCheckout(true)}
          onClear={cart.clearCart}
          discount={0}
          tax={0}
        />
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        items={cart.items}
        subtotal={cart.subtotal}
        onConfirm={handleCheckout}
      />

    </div>
  );
}
