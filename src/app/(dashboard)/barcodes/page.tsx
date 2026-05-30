"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Printer, RefreshCw, Barcode, Download, Wand2, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import toast from "react-hot-toast";

export default function BarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState<Record<string, number>>({});

  // Map of product id -> canvas ref
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Fetch products
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

  // Render barcodes whenever products change
  useEffect(() => {
    if (loading) return;
    // Dynamically import bwip-js to keep it client-side only
    import("bwip-js").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bwipjs: any = mod.default || mod;
      products.forEach((product) => {
        const canvas = canvasRefs.current.get(product.id);
        if (!canvas) return;
        const barcodeText = product.barcode || product.sku;
        try {
          bwipjs.toCanvas(canvas, {
            bcid: "code128",
            text: barcodeText,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: "center",
            backgroundcolor: "ffffff",
          });
        } catch {
          // Fallback: clear the canvas and draw placeholder text
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 200;
            canvas.height = 60;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#9ca3af";
            ctx.font = "11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(barcodeText, 100, 35);
          }
        }
      });
    });
  }, [products, loading]);

  const setCanvasRef = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(id, el);
    } else {
      canvasRefs.current.delete(id);
    }
  }, []);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectAll = () => setSelected(new Set(products.map((p) => p.id)));
  const clearAll = () => setSelected(new Set());
  const selectedProducts = products.filter((p) => selected.has(p.id));

  function getCopies(id: string) {
    return copies[id] ?? 1;
  }
  function setCopyCount(id: string, count: number) {
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, Math.min(20, count)) }));
  }

  function downloadBarcode(product: Product) {
    const canvas = canvasRefs.current.get(product.id);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `barcode-${product.sku}-${product.name.replace(/[^a-z0-9]/gi, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function assignBarcodes() {
    setAssigning(true);
    try {
      const res = await fetch("/api/products/assign-barcodes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || `Updated ${data.updated} product(s)`);
      // Refresh products
      const params = new URLSearchParams({ limit: "200", active: "true" });
      if (search) params.set("search", search);
      const r = await fetch(`/api/products?${params}`);
      const d = await r.json();
      setProducts(d.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign barcodes");
    } finally {
      setAssigning(false);
    }
  }

  const handlePrint = () => window.print();

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barcode Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and print professional Code128 barcodes for your products
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={assignBarcodes}
            disabled={assigning}
            className="flex items-center gap-2"
          >
            {assigning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate Barcodes
          </Button>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAll} className="flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} className="flex items-center gap-1.5">
            <Square className="w-4 h-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {products.map((product) => {
              const barcodeValue = product.barcode || product.sku;
              const isSelected = selected.has(product.id);
              return (
                <div
                  key={product.id}
                  className={`relative border rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-sm"
                  }`}
                  onClick={() => toggleSelect(product.id)}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-3 right-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-indigo-600"
                    />
                  </div>

                  {/* Product info */}
                  <div className="pr-6">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                    {product.barcode ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {product.barcode}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-500">No barcode — using SKU</p>
                    )}
                  </div>

                  {/* Barcode canvas */}
                  <div className="flex justify-center bg-white rounded-lg p-2 border border-gray-100">
                    <canvas
                      ref={(el) => setCanvasRef(product.id, el)}
                      id={`bc-${product.id}`}
                      className="max-w-full"
                    />
                  </div>

                  {/* Barcode value label */}
                  <p className="text-center text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                    {barcodeValue}
                  </p>

                  {/* Controls row */}
                  <div
                    className="flex items-center gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Copies:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={getCopies(product.id)}
                      onChange={(e) => setCopyCount(product.id, parseInt(e.target.value) || 1)}
                      className="w-14 px-2 py-1 border rounded text-xs text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-1.5 text-xs"
                      onClick={() => downloadBarcode(product)}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PNG
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print sheet — only visible during print */}
      {selectedProducts.length > 0 && (
        <div className="hidden print:block">
          <div className="grid grid-cols-4 gap-4">
            {selectedProducts.flatMap((p) =>
              Array.from({ length: getCopies(p.id) }, (_, i) => {
                const srcCanvas = canvasRefs.current.get(p.id);
                const imgSrc = srcCanvas ? srcCanvas.toDataURL("image/png") : "";
                return (
                  <div
                    key={`${p.id}-${i}`}
                    className="border border-gray-300 rounded p-3 text-center"
                  >
                    <p className="text-xs font-bold mb-1 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 mb-1">{p.sku}</p>
                    {imgSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgSrc} alt={`barcode-${p.sku}`} className="mx-auto max-w-full" />
                    ) : (
                      <p className="text-xs font-mono">{p.barcode || p.sku}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 font-mono">{p.barcode || p.sku}</p>
                  </div>
                );
              })
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
