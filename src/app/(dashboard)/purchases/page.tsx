"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, Plus, Search, Eye, Trash2, Printer, ChevronLeft, ChevronRight,
  X, ChevronDown, ChevronUp, Package, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Purchase, Supplier, Product } from "@/types";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface PurchaseItemRow { productId: string; productName: string; sku: string; quantity: string; unitCost: string; currentStock: number; }

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [deleteModal, setDeleteModal] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // New purchase form
  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<PurchaseItemRow[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [extraProductId, setExtraProductId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const LIMIT = 20;

  const loadSuppliers = async () => {
    const res = await fetch("/api/suppliers?limit=200");
    const data = await res.json();
    setSuppliers(data.data || []);
  };

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (supplierFilter) params.set("supplierId", supplierFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/purchases?${params}`);
      const data = await res.json();
      setPurchases(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error("Failed to load purchases"); }
    finally { setLoading(false); }
  }, [supplierFilter, dateFrom, dateTo]);

  useEffect(() => { load(page); loadSuppliers(); }, [load, page]);

  const openNew = async () => {
    setStep(1); setSelectedSupplier(null); setRows([]); setDiscount("0"); setNotes(""); setSupplierSearch("");
    const res = await fetch("/api/products?limit=500&isActive=true");
    const data = await res.json(); setAllProducts(data.data || []);
    setShowNew(true);
  };

  const selectSupplier = async (s: Supplier) => {
    setSelectedSupplier(s);
    const res = await fetch(`/api/suppliers/${s.id}/products`);
    const data = await res.json();
    const prods: Product[] = (data.data || []).map((sp: { product: Product }) => sp.product);
    setSupplierProducts(prods);
    setRows(prods.map((p) => ({ productId: p.id, productName: p.name, sku: p.sku, quantity: "", unitCost: String(Number(p.costPrice)), currentStock: p.stock })));
    setStep(2);
  };

  const addExtraProduct = () => {
    const p = allProducts.find((x) => x.id === extraProductId);
    if (!p) return;
    if (rows.find((r) => r.productId === p.id)) { toast.error("Product already added"); return; }
    setRows((r) => [...r, { productId: p.id, productName: p.name, sku: p.sku, quantity: "", unitCost: String(Number(p.costPrice)), currentStock: p.stock }]);
    setExtraProductId("");
  };

  const updateRow = (idx: number, field: "quantity" | "unitCost", value: string) =>
    setRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));

  const activeRows = rows.filter((r) => r.quantity && parseFloat(r.quantity) > 0);
  const subtotal = activeRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitCost) || 0), 0);
  const discountNum = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  const handleCreate = async () => {
    if (!selectedSupplier || activeRows.length === 0) { toast.error("Select supplier and add at least one item with quantity"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          items: activeRows.map((r) => ({ productId: r.productId, productName: r.productName, sku: r.sku, quantity: parseInt(r.quantity), unitCost: parseFloat(r.unitCost) })),
          discount: discountNum,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Purchase ${data.data.purchaseNumber} created! Stock updated.`);
      setShowNew(false);
      load(1); setPage(1);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setCreating(false); }
  };

  const openView = async (p: Purchase) => {
    const res = await fetch(`/api/purchases/${p.id}`);
    const data = await res.json();
    setViewPurchase(data.data || p);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${deleteModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Purchase deleted and stock reversed");
      setDeleteModal(null); load(page);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setDeleting(false); }
  };

  const printPurchase = (p: Purchase) => {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    const items = (p.items || []).map((item) => `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.unitCost)}</td><td style="text-align:right">${formatCurrency(item.subtotal)}</td></tr>`).join("");
    win.document.write(`<html><head><title>Purchase Receipt</title><style>body{font-family:monospace;font-size:12px;width:300px;margin:0 auto;padding:10px} table{width:100%;border-collapse:collapse} td{padding:3px 4px;border-bottom:1px dashed #ccc} .total{font-weight:bold;font-size:14px} .center{text-align:center} .right{text-align:right} h2{text-align:center;margin:0} hr{border:1px dashed #000}</style></head><body><h2>PURCHASE ORDER</h2><p class="center">${p.purchaseNumber}</p><hr/><p><b>Supplier:</b> ${p.supplier?.name || ""}<br/>${p.supplier?.phone ? `Phone: ${p.supplier.phone}` : ""}</p><hr/><p><b>Date:</b> ${formatDateTime(p.createdAt)}</p><hr/><table><tr><th style="text-align:left">Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Cost</th><th style="text-align:right">Total</th></tr>${items}</table><hr/><p class="right">Subtotal: ${formatCurrency(p.subtotal)}</p>${Number(p.discount) > 0 ? `<p class="right">Discount: -${formatCurrency(p.discount)}</p>` : ""}<p class="right total">Total: ${formatCurrency(p.total)}</p><hr/><p class="center">Authorized Signature: ____________</p></body></html>`);
    win.document.close(); win.print();
  };

  const filteredSuppliers = supplierSearch ? suppliers.filter((s) => s.name.toLowerCase().includes(supplierSearch.toLowerCase())) : suppliers;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Purchases</h1><p className="text-slate-500 text-sm">Stock purchase orders from suppliers</p></div>
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <Label className="text-xs mb-1 block">Supplier</Label>
          <Select value={supplierFilter || "ALL"} onValueChange={(v) => { setSupplierFilter(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Suppliers</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs mb-1 block">From</Label><Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 w-36" /></div>
        <div><Label className="text-xs mb-1 block">To</Label><Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 w-36" /></div>
        {(supplierFilter || dateFrom || dateTo) && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setSupplierFilter(""); setDateFrom(""); setDateTo(""); }}><X className="h-4 w-4 mr-1" />Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">PO #</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Date</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Supplier</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Items</th>
              <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Total</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Status</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={7} className="px-4 py-3"><div className="h-7 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : purchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-slate-400">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium text-slate-500">No purchases yet</p>
                  <Button onClick={openNew} className="mt-4 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
                </td></tr>
              ) : purchases.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{p.purchaseNumber}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{p.supplier?.name}</td>
                  <td className="px-4 py-3 text-center text-slate-500 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5 text-slate-400" />{(p as Purchase & { _count?: { items: number } })._count?.items ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ""}`}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openView(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => printPurchase(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Printer className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteModal(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-indigo-500" />New Purchase Order {step === 2 && selectedSupplier && `— ${selectedSupplier.name}`}</DialogTitle></DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Select the supplier you are purchasing from:</p>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {filteredSuppliers.filter((s) => s.isActive).map((s) => (
                  <button key={s.id} onClick={() => selectSupplier(s)}
                    className="flex items-center gap-3 p-3 border rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">{s.name.charAt(0)}</div>
                    <div><p className="font-semibold text-slate-700">{s.name}</p>{s.phone && <p className="text-xs text-slate-400">{s.phone}</p>}</div>
                  </button>
                ))}
                {filteredSuppliers.filter((s) => s.isActive).length === 0 && <p className="col-span-2 text-center text-slate-400 py-8">No suppliers found</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <button onClick={() => { setStep(1); setSelectedSupplier(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ChevronLeft className="h-4 w-4" />Back to supplier selection
              </button>

              {/* Extra product add */}
              <div className="flex gap-2">
                <Select value={extraProductId} onValueChange={setExtraProductId}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Add extra product not in supplier list..." /></SelectTrigger>
                  <SelectContent>
                    {allProducts.filter((p) => !rows.find((r) => r.productId === p.id)).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addExtraProduct} disabled={!extraProductId} className="h-9"><Plus className="h-4 w-4" /></Button>
              </div>

              {rows.length === 0 ? (
                <p className="text-center text-slate-400 py-8">This supplier has no linked products. Add products above.</p>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 border-b">
                      <th className="text-left px-3 py-2 text-xs text-slate-500">Product</th>
                      <th className="text-center px-3 py-2 text-xs text-slate-500">Stock</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 w-24">Qty</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 w-28">Unit Cost</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500">Subtotal</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr></thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.productId} className="border-b last:border-0">
                          <td className="px-3 py-2"><p className="font-medium text-slate-700">{row.productName}</p><p className="text-xs text-slate-400">{row.sku}</p></td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs font-medium ${row.currentStock <= 5 ? "text-red-600" : "text-slate-500"}`}>{row.currentStock}</span></td>
                          <td className="px-3 py-2"><Input type="number" min={1} value={row.quantity} onChange={(e) => updateRow(i, "quantity", e.target.value)} placeholder="0" className="h-8 text-right w-24 ml-auto" /></td>
                          <td className="px-3 py-2"><Input type="number" min={0} step={0.01} value={row.unitCost} onChange={(e) => updateRow(i, "unitCost", e.target.value)} placeholder="0.00" className="h-8 text-right w-28 ml-auto" /></td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">
                            {row.quantity && row.unitCost ? formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.unitCost) || 0)) : "—"}
                          </td>
                          <td className="px-2 py-2"><button onClick={() => removeRow(i)} className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-xs">Discount (Rs.)</Label>
                  <Input type="number" min={0} step={0.01} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." className="mt-1 h-9" />
                </div>
              </div>

              {activeRows.length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {discountNum > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discountNum)}</span></div>}
                  <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span className="text-indigo-700">{formatCurrency(total)}</span></div>
                  <p className="text-xs text-slate-400 pt-1 flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" />{activeRows.length} product(s) · stock will be incremented on save</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            {step === 2 && <Button onClick={handleCreate} loading={creating} disabled={activeRows.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {creating ? "Creating..." : `Create Purchase (${formatCurrency(total)})`}
            </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Modal */}
      {viewPurchase && (
        <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-indigo-500" />{viewPurchase.purchaseNumber}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Date</p><p className="font-medium">{formatDateTime(viewPurchase.createdAt)}</p></div>
                <div><p className="text-xs text-slate-400">Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewPurchase.status]}`}>{viewPurchase.status}</span></div>
                <div><p className="text-xs text-slate-400">Supplier</p><p className="font-medium">{viewPurchase.supplier?.name}</p></div>
                <div><p className="text-xs text-slate-400">Created By</p><p className="font-medium">{viewPurchase.user?.name}</p></div>
              </div>
              {viewPurchase.supplier?.phone && <p className="text-sm text-slate-500 flex items-center gap-1">📞 {viewPurchase.supplier.phone}</p>}
              {viewPurchase.notes && <p className="text-sm text-slate-500 italic border-t pt-3">Note: {viewPurchase.notes}</p>}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b">
                    <th className="text-left px-3 py-2 text-xs text-slate-500">Product</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500">Unit Cost</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500">Total</th>
                  </tr></thead>
                  <tbody>
                    {(viewPurchase.items || []).map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2"><p className="font-medium text-slate-700">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unitCost)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1.5 text-sm border-t pt-3">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(viewPurchase.subtotal)}</span></div>
                {Number(viewPurchase.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(viewPurchase.discount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-indigo-600">{formatCurrency(viewPurchase.total)}</span></div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setDeleteModal(viewPurchase); setViewPurchase(null); }} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              <Button variant="outline" onClick={() => printPurchase(viewPurchase)}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button onClick={() => setViewPurchase(null)} className="bg-indigo-600 hover:bg-indigo-700">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />Delete Purchase</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Delete <strong>{deleteModal.purchaseNumber}</strong>?</p>
              <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">Stock quantities that were added by this purchase will be reversed.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={handleDelete}>Delete & Reverse Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
