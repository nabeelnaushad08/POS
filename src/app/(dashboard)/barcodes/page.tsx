"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Printer, RefreshCw, Barcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

export default function BarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "200", active: "true" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/products?${params}`);
        const d = await res.json();
        setProducts(d.data || []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectAll = () => setSelected(new Set(products.map(p => p.id)));
  const clearAll = () => setSelected(new Set());
  const selectedProducts = products.filter(p => selected.has(p.id));

  // Generate SVG barcode using simple binary bar representation
  function genBarcode(value: string): string {
    const bars = Array.from(value)
      .map(c => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
    const w = Math.max(200, bars.length * 2);
    let rects = "";
    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === "1") {
        rects += `<rect x="${i * 2}" y="0" width="2" height="60" fill="black"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="80" viewBox="0 0 ${w} 80">
      <rect width="${w}" height="80" fill="white"/>
      ${rects}
      <text x="${w / 2}" y="76" text-anchor="middle" font-size="10" font-family="monospace">${value}</text>
    </svg>`;
  }

  const handlePrint = () => window.print();

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barcode Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and print barcodes for your products
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-4 h-4" />
              Print {selected.size} Barcode{selected.size !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 print:hidden">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
          <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            Copies per label:
            <input
              type="number"
              min={1}
              max={20}
              value={copies}
              onChange={e => setCopies(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1.5 border rounded-lg text-sm text-center"
            />
          </label>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Product grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Barcode className="w-10 h-10 mb-2" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {products.map(product => (
              <label
                key={product.id}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${
                  selected.has(product.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    SKU: {product.sku}
                    {product.barcode ? ` | Barcode: ${product.barcode}` : ""}
                  </p>
                </div>
                {(product.barcode || product.sku) && (
                  <div className="text-right">
                    <div
                      className="inline-block border rounded p-1"
                      dangerouslySetInnerHTML={{
                        __html: genBarcode(product.barcode || product.sku),
                      }}
                      style={{ width: 120, height: 50, overflow: "hidden" }}
                    />
                  </div>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Print sheet — only visible during print */}
      {selectedProducts.length > 0 && (
        <div ref={printRef} className="hidden print:block">
          <div className="grid grid-cols-4 gap-4">
            {selectedProducts.flatMap(p =>
              Array.from({ length: copies }, (_, i) => (
                <div key={`${p.id}-${i}`} className="border border-gray-300 rounded p-3 text-center">
                  <p className="text-xs font-bold mb-1 truncate">{p.name}</p>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: genBarcode(p.barcode || p.sku),
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">{p.barcode || p.sku}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          body {
            background: white !important;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
