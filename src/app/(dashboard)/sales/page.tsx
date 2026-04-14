"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Receipt, Search, Eye, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, ShoppingCart, X, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Sale } from "@/types";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-amber-100 text-amber-700",
  VOIDED: "bg-red-100 text-red-700",
};
const PAY_COLORS: Record<string, string> = {
  CASH: "bg-blue-100 text-blue-700",
  CARD: "bg-purple-100 text-purple-700",
  MIXED: "bg-orange-100 text-orange-700",
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [deleteModal, setDeleteModal] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      const res = await fetch(`/api/sales?${params}`);
      const data = await res.json();
      let all: Sale[] = data.data || [];
      if (search) {
        const q = search.toLowerCase();
        all = all.filter((s) =>
          s.receiptNumber.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q))
        );
      }
      setSales(all);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, search]);

  useEffect(() => { load(page); }, [load, page]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales/${deleteModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Sale deleted and stock restored");
      setDeleteModal(null);
      load(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    let ok = 0;
    for (const id of Array.from(selected)) {
      try { await fetch(`/api/sales/${id}`, { method: "DELETE" }); ok++; } catch { /* continue */ }
    }
    toast.success(`${ok} sale(s) deleted`);
    setSelected(new Set());
    setBulkDeleting(false);
    load(page);
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500 text-sm">{totalCount} total transactions</p>
        </div>
        {selected.size > 0 && (
          <Button variant="destructive" loading={bulkDeleting} onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />Delete {selected.size} Selected
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Revenue (current view)", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-emerald-600" },
          { label: "Transactions", value: String(sales.length), icon: ShoppingCart, color: "text-blue-600" },
          { label: "Average Sale", value: formatCurrency(avgSale), icon: Receipt, color: "text-indigo-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border p-4 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-800">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs mb-1 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Receipt # or customer..." className="pl-9 h-9" />
          </div>
        </div>
        <div className="w-36">
          <Label className="text-xs mb-1 block">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="VOIDED">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs mb-1 block">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 w-36" /></div>
        <div><Label className="text-xs mb-1 block">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 w-36" /></div>
        {(dateFrom || dateTo || statusFilter !== "ALL") && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("ALL"); }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="rounded" checked={selected.size === sales.length && sales.length > 0}
                    onChange={() => { if (selected.size === sales.length) setSelected(new Set()); else setSelected(new Set(sales.map((s) => s.id))); }} />
                </th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Receipt #</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Cashier</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Total</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Payment</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Status</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={9} className="px-4 py-3"><div className="h-7 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : sales.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-20 text-slate-400">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium text-slate-500">No sales found</p>
                </td></tr>
              ) : sales.map((sale, i) => (
                <motion.tr key={sale.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded" checked={selected.has(sale.id)} onChange={() => toggleSelect(sale.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{sale.receiptNumber}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{formatDateTime(sale.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{sale.customerName || <span className="text-slate-300 text-xs">Walk-in</span>}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{sale.user?.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PAY_COLORS[sale.paymentMethod] || ""}`}>{sale.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sale.status] || ""}`}>{sale.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewSale(sale)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteModal(sale)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
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

      {/* View Modal */}
      {viewSale && (
        <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-indigo-500" />{viewSale.receiptNumber}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Date</p><p className="font-medium">{formatDateTime(viewSale.createdAt)}</p></div>
                <div><p className="text-xs text-slate-400">Cashier</p><p className="font-medium">{viewSale.user?.name || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Customer</p><p className="font-medium">{viewSale.customerName || "Walk-in"}</p></div>
                <div><p className="text-xs text-slate-400">Phone</p><p className="font-medium">{viewSale.customerPhone || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Payment</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PAY_COLORS[viewSale.paymentMethod]}`}>{viewSale.paymentMethod}</span></div>
                <div><p className="text-xs text-slate-400">Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewSale.status]}`}>{viewSale.status}</span></div>
              </div>
              {viewSale.notes && <p className="text-sm text-slate-500 italic border-t pt-3">Note: {viewSale.notes}</p>}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b">
                    <th className="text-left px-3 py-2 text-xs text-slate-500">Product</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500">Price</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500">Total</th>
                  </tr></thead>
                  <tbody>
                    {(viewSale.items || []).map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2"><p className="font-medium text-slate-700">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1.5 text-sm border-t pt-3">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(viewSale.subtotal)}</span></div>
                {Number(viewSale.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(viewSale.discount)}</span></div>}
                {Number(viewSale.tax) > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(viewSale.tax)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-indigo-600">{formatCurrency(viewSale.total)}</span></div>
                {viewSale.cashAmount && Number(viewSale.cashAmount) > 0 && <div className="flex justify-between text-slate-400 text-xs"><span>Cash Received</span><span>{formatCurrency(viewSale.cashAmount)}</span></div>}
                {viewSale.change && Number(viewSale.change) > 0 && <div className="flex justify-between text-slate-400 text-xs"><span>Change</span><span>{formatCurrency(viewSale.change)}</span></div>}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setDeleteModal(viewSale); setViewSale(null); }} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button onClick={() => setViewSale(null)} className="bg-indigo-600 hover:bg-indigo-700">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />Delete Sale</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Delete <strong>{deleteModal.receiptNumber}</strong>?</p>
              {deleteModal.status === "COMPLETED" && (
                <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">Stock will be restored for all items in this sale.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
