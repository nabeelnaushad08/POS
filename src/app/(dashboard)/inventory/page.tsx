"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Upload, Edit, Trash2, Package, AlertTriangle,
  ChevronLeft, ChevronRight, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductFormModal } from "@/components/inventory/product-form-modal";
import { BulkImportModal } from "@/components/inventory/bulk-import-modal";
import { formatCurrency } from "@/lib/utils";
import type { Product, Category } from "@/types";
import toast from "react-hot-toast";
import Image from "next/image";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const LIMIT = 20;

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: LIMIT.toString() });
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (stockFilter === "low") params.set("lowStock", "true");
      else if (stockFilter === "active") params.set("active", "true");

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      let filtered = data.data || [];
      if (stockFilter === "low") {
        filtered = filtered.filter((p: Product) => p.stock <= p.minimumStock);
      }
      setProducts(filtered);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, stockFilter, page]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      toast.success("Product deactivated");
      loadProducts();
    } catch {
      toast.error("Failed to deactivate product");
    }
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock <= minStock) return <Badge variant="warning">Low: {stock}</Badge>;
    return <Badge variant="success">{stock}</Badge>;
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm">{total} products total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, SKU, barcode..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low / Out of Stock</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Product</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Category</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Cost</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Price</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Stock</th>
                <th className="text-center px-5 py-3 text-xs text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-8 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <Package className="h-12 w-12 mx-auto mb-3" />
                    <p className="font-medium">No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product, i) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 line-clamp-1">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-slate-400 font-mono">{product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {product.category ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: product.category.color || "#6366f1" }}
                        >
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(Number(product.costPrice))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatCurrency(Number(product.sellingPrice))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStockBadge(product.stock, product.minimumStock)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditProduct(product)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Low stock warning */}
      {products.some((p) => p.stock <= p.minimumStock) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Low stock warning:</span> {products.filter(p => p.stock <= p.minimumStock).length} product(s) need restocking.
          </p>
        </motion.div>
      )}

      {/* Modals */}
      <ProductFormModal
        open={showAddModal || !!editProduct}
        onClose={() => { setShowAddModal(false); setEditProduct(null); }}
        product={editProduct}
        categories={categories}
        onSuccess={() => { loadProducts(); setShowAddModal(false); setEditProduct(null); }}
      />
      <BulkImportModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => { loadProducts(); setShowBulkModal(false); }}
      />
    </div>
  );
}
