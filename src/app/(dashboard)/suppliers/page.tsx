"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Truck, Plus, Search, Edit, Trash2, Eye, Phone, Mail, MapPin,
  ChevronLeft, ChevronRight, Package, ShoppingBag, X, Link, Unlink,
  DollarSign, CreditCard, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Supplier, Product, SupplierPayment } from "@/types";
import toast from "react-hot-toast";

interface SupplierForm { name: string; contactPerson: string; phone: string; email: string; address: string; notes: string; isActive: boolean; }
const defaultForm: SupplierForm = { name: "", contactPerson: "", phone: "", email: "", address: "", notes: "", isActive: true };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<SupplierForm>>({});
  const [saving, setSaving] = useState(false);

  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "products" | "payments">("info");
  const [supplierProducts, setSupplierProducts] = useState<{ id: string; product: Product }[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [linkingProduct, setLinkingProduct] = useState<string>("");
  const [savingLink, setSavingLink] = useState(false);

  // Payment form
  const [payForm, setPayForm] = useState({ amount: "", method: "CASH", notes: "" });
  const [savingPay, setSavingPay] = useState(false);

  // Delete
  const [deleteModal, setDeleteModal] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers?limit=200");
      const data = await res.json();
      setSuppliers(data.data || []);
    } catch { toast.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (field: keyof SupplierForm, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => { setEditSupplier(null); setForm(defaultForm); setErrors({}); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ name: s.name, contactPerson: s.contactPerson || "", phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "", isActive: s.isActive });
    setErrors({}); setShowForm(true);
  };

  const validate = () => {
    const errs: Partial<SupplierForm> = {};
    if (!form.name.trim()) errs.name = "Company/Name is required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editSupplier ? `/api/suppliers/${editSupplier.id}` : "/api/suppliers";
      const method = editSupplier ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), contactPerson: form.contactPerson || null, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null, ...(editSupplier ? { isActive: form.isActive } : {}) }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success(editSupplier ? "Supplier updated!" : "Supplier created!");
      setShowForm(false);
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const openDetail = async (s: Supplier) => {
    setDetailSupplier(s); setDetailTab("info"); setLoadingDetail(true);
    try {
      const [pRes, payRes, aRes] = await Promise.all([
        fetch(`/api/suppliers/${s.id}/products`),
        fetch(`/api/suppliers/${s.id}/payments`),
        fetch("/api/products?limit=500&isActive=true"),
      ]);
      const pData = await pRes.json(); setSupplierProducts(pData.data || []);
      const payData = await payRes.json(); setSupplierPayments(payData.data || []);
      const aData = await aRes.json(); setAllProducts(aData.data || []);
    } catch { toast.error("Failed to load supplier details"); }
    finally { setLoadingDetail(false); }
  };

  const handleLinkProduct = async () => {
    if (!linkingProduct || !detailSupplier) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/suppliers/${detailSupplier.id}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: linkingProduct }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success("Product linked!");
      setLinkingProduct("");
      const pRes = await fetch(`/api/suppliers/${detailSupplier.id}/products`);
      const pData = await pRes.json(); setSupplierProducts(pData.data || []);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingLink(false); }
  };

  const handleUnlinkProduct = async (productId: string) => {
    if (!detailSupplier) return;
    try {
      await fetch(`/api/suppliers/${detailSupplier.id}/products`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      setSupplierProducts((p) => p.filter((x) => x.product.id !== productId));
      toast.success("Product unlinked");
    } catch { toast.error("Failed to unlink product"); }
  };

  const handleAddPayment = async () => {
    if (!detailSupplier || !payForm.amount) return;
    setSavingPay(true);
    try {
      const res = await fetch(`/api/suppliers/${detailSupplier.id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: parseFloat(payForm.amount), method: payForm.method, notes: payForm.notes || null }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success("Payment recorded!");
      setPayForm({ amount: "", method: "CASH", notes: "" });
      const payRes = await fetch(`/api/suppliers/${detailSupplier.id}/payments`);
      const payData = await payRes.json(); setSupplierPayments(payData.data || []);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingPay(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${deleteModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Supplier removed");
      setDeleteModal(null); load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setDeleting(false); }
  };

  const linkedProductIds = new Set(supplierProducts.map((sp) => sp.product.id));
  const unlinkable = allProducts.filter((p) => !linkedProductIds.has(p.id));
  const filteredUnlinkable = productSearch ? unlinkable.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())) : unlinkable;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Suppliers</h1><p className="text-slate-500 text-sm">{suppliers.length} suppliers</p></div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, or email..." className="pl-9 max-w-md" />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Company / Name</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Contact</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Phone</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Products</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Orders</th>
              <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Status</th>
              <th className="text-center px-5 py-3 text-xs text-slate-500 font-semibold">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={7} className="px-5 py-3"><div className="h-8 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-slate-400">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium text-slate-500">{search ? "No suppliers match your search" : "No suppliers yet"}</p>
                  {!search && <Button onClick={openAdd} className="mt-4 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>}
                </td></tr>
              ) : paginated.map((supplier, i) => (
                <motion.tr key={supplier.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{supplier.name}</p>
                        {supplier.address && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{supplier.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{supplier.contactPerson || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {supplier.phone && <span className="flex items-center gap-1.5 text-slate-500 text-sm"><Phone className="h-3.5 w-3.5 text-slate-400" />{supplier.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="inline-flex items-center gap-1 text-slate-600"><Package className="h-3.5 w-3.5 text-slate-400" />{supplier._count?.products ?? 0}</span></td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="inline-flex items-center gap-1 text-slate-600"><ShoppingBag className="h-3.5 w-3.5 text-slate-400" />{supplier._count?.purchases ?? 0}</span></td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={supplier.isActive ? "success" : "secondary"}>{supplier.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(supplier)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="View Details"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(supplier)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteModal(supplier)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company / Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. ABC Traders" className="mt-1" />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}</div>
            <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="e.g. Mr. Perera" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" className="mt-1" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="supplier@mail.com" className="mt-1" />{errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}</div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="No. 1, Main St, Colombo" className="mt-1" /></div>
            <div><Label>Notes</Label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Any notes..." className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" /></div>
            {editSupplier && <div className="flex items-center gap-3 pt-1"><Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="sup-active" /><Label htmlFor="sup-active">{form.isActive ? "Active" : "Inactive"}</Label></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? "Saving..." : editSupplier ? "Update" : "Create Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {detailSupplier && (
        <Dialog open={!!detailSupplier} onOpenChange={() => setDetailSupplier(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{detailSupplier.name.charAt(0)}</div>
                {detailSupplier.name}
              </DialogTitle>
            </DialogHeader>
            {/* Tabs */}
            <div className="flex border-b">
              {(["info", "products", "payments"] as const).map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${detailTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                  {tab} {tab === "products" ? `(${supplierProducts.length})` : tab === "payments" ? `(${supplierPayments.length})` : ""}
                </button>
              ))}
            </div>

            {loadingDetail ? <div className="py-10 text-center text-slate-400">Loading...</div> : (
              <>
                {detailTab === "info" && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Contact Person", value: detailSupplier.contactPerson },
                        { label: "Phone", value: detailSupplier.phone, icon: <Phone className="h-3.5 w-3.5" /> },
                        { label: "Email", value: detailSupplier.email, icon: <Mail className="h-3.5 w-3.5" /> },
                        { label: "Address", value: detailSupplier.address, icon: <MapPin className="h-3.5 w-3.5" /> },
                      ].map(({ label, value, icon }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                            {icon && <span className="text-slate-400">{icon}</span>}
                            {value || <span className="text-slate-300">—</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                    {detailSupplier.notes && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400 mb-1">Notes</p><p className="text-slate-600">{detailSupplier.notes}</p></div>}
                    <p className="text-xs text-slate-400">Supplier since: {formatDate(detailSupplier.createdAt)}</p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => { setDetailSupplier(null); openEdit(detailSupplier); }}><Edit className="h-4 w-4 mr-1" />Edit Info</Button>
                    </div>
                  </div>
                )}

                {detailTab === "products" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to link..." className="h-9" />
                      </div>
                      <Select value={linkingProduct} onValueChange={setLinkingProduct}>
                        <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Select product..." /></SelectTrigger>
                        <SelectContent>
                          {filteredUnlinkable.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleLinkProduct} disabled={!linkingProduct} loading={savingLink} className="bg-indigo-600 hover:bg-indigo-700 h-9">
                        <Link className="h-4 w-4 mr-1" />Link
                      </Button>
                    </div>
                    {supplierProducts.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">No products linked yet</p>
                    ) : (
                      <div className="space-y-2">
                        {supplierProducts.map((sp) => (
                          <div key={sp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="font-medium text-sm text-slate-700">{sp.product.name}</p>
                              <p className="text-xs text-slate-400">{sp.product.sku} · Stock: {sp.product.stock} · {formatCurrency(sp.product.sellingPrice)}</p>
                            </div>
                            <button onClick={() => handleUnlinkProduct(sp.product.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Unlink className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "payments" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-700">Record Payment</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Input type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="h-9" />
                        <Select value={payForm.method} onValueChange={(v) => setPayForm((p) => ({ ...p, method: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddPayment} disabled={!payForm.amount} loading={savingPay} className="bg-indigo-600 hover:bg-indigo-700 h-9">Add</Button>
                      </div>
                      <Input value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Reference / notes..." className="h-9" />
                    </div>
                    {supplierPayments.length === 0 ? (
                      <p className="text-center text-slate-400 py-6">No payments recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {supplierPayments.map((pay) => (
                          <div key={pay.id} className="flex items-center justify-between p-3 border rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pay.method === "CASH" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                                {pay.method === "CASH" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{formatCurrency(pay.amount)}</p>
                                <p className="text-xs text-slate-400">{formatDateTime(pay.createdAt)}{pay.notes && ` · ${pay.notes}`}</p>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400">{pay.method}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold border-t pt-3 mt-2">
                          <span className="text-slate-600 flex items-center gap-1"><DollarSign className="h-4 w-4" />Total Paid</span>
                          <span className="text-indigo-600">{formatCurrency(supplierPayments.reduce((s, p) => s + Number(p.amount), 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailSupplier(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />Remove Supplier</DialogTitle></DialogHeader>
            <p className="text-slate-600 text-sm">Remove <strong>{deleteModal.name}</strong>? If they have purchase history they will be deactivated instead of deleted.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={handleDelete}>Remove</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
