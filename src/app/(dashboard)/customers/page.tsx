"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit, Trash2, Users, Phone, Mail, MapPin,
  UserCheck, UserX, ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";
import toast from "react-hot-toast";

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
}

const defaultForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

function validatePhone(phone: string): boolean {
  return /^07\d{8}$/.test(phone.trim());
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<CustomerForm>>({});
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers?limit=200");
      const data = await res.json();
      setCustomers(data.data || []);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (field: keyof CustomerForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setEditCustomer(null);
    setForm(defaultForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      isActive: c.isActive,
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Partial<CustomerForm> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) {
      errs.phone = "Phone is required";
    } else if (!validatePhone(form.phone)) {
      errs.phone = "Must be 10 digits starting with 07 (e.g. 0771234567)";
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = "Invalid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers";
      const method = editCustomer ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          ...(editCustomer ? { isActive: form.isActive } : {}),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to save");
      }
      toast.success(editCustomer ? "Customer updated!" : "Customer created!");
      setShowModal(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Customer removed");
      setDeleteModal(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
            <p className="text-slate-500 text-sm">{customers.length} total customers</p>
          </div>
          {customers.length > 0 && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              {customers.filter((c) => c.isActive).length} active
            </span>
          )}
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, phone, or email..."
          className="pl-9 max-w-md"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Purchases</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Added</th>
                <th className="text-center px-5 py-3 text-xs text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-8 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400">
                    <Users className="h-14 w-14 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium text-slate-500">
                      {search ? "No customers match your search" : "No customers yet"}
                    </p>
                    <p className="text-sm mt-1 mb-5">
                      {search ? "Try a different name or phone number" : "Add your first customer to get started"}
                    </p>
                    {!search && (
                      <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {customer.email ? (
                        <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {customer.email}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        {customer._count?.sales ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <Badge variant={customer.isActive ? "success" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(customer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal(customer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete / Deactivate"
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
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Customer full name"
                className="mt-1"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="e.g. 0771234567"
                className="mt-1"
                maxLength={10}
              />
              <p className="text-xs text-slate-400 mt-1">Sri Lankan format: 07XXXXXXXX (10 digits)</p>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="customer@example.com"
                className="mt-1"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, City"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any notes about this customer..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            {editCustomer && (
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => set("isActive", v)}
                  id="customer-active"
                />
                <Label htmlFor="customer-active" className="cursor-pointer">
                  {form.isActive ? (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <UserCheck className="h-4 w-4" /> Active Customer
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <UserX className="h-4 w-4" /> Inactive
                    </span>
                  )}
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? "Saving..." : editCustomer ? "Update Customer" : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Remove Customer
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-slate-600 text-sm">
                  You are about to remove <span className="font-semibold">{deleteModal.name}</span>.
                </p>
                {(deleteModal._count?.sales ?? 0) > 0 ? (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      This customer has <strong>{deleteModal._count?.sales} purchase(s)</strong> on record.
                      They will be <strong>deactivated</strong> instead of permanently deleted to preserve history.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    This customer has no purchase history and will be permanently deleted.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  {(deleteModal._count?.sales ?? 0) > 0 ? "Deactivate" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
