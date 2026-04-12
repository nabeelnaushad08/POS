"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, UserX, Users, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import type { User, Role } from "@/types";
import toast from "react-hot-toast";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  isActive: boolean;
}

const defaultForm: UserForm = { name: "", email: "", password: "", role: "CASHIER", phone: "", isActive: true };

const roleConfig: Record<string, { badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  ADMIN: { badgeClass: "bg-red-100 text-red-700 border-red-200", icon: Shield },
  MANAGER: { badgeClass: "bg-blue-100 text-blue-700 border-blue-200", icon: UserCheck },
  CASHIER: { badgeClass: "bg-green-100 text-green-700 border-green-200", icon: Users },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<UserForm>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: keyof UserForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditUser(null);
    setForm(defaultForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, phone: user.phone || "", isActive: user.isActive });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Partial<UserForm> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (!editUser && !form.password) errs.password = "Password is required";
    if (form.password && form.password.length < 6) errs.password = "Min 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name, email: form.email, role: form.role,
        phone: form.phone || null, isActive: form.isActive,
      };
      if (form.password) body.password = form.password;

      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editUser ? "User updated!" : "User created!");
      setShowModal(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate user "${name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("User deactivated");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500 text-sm">{users.length} total users</p>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />Add User
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(["ADMIN", "MANAGER", "CASHIER"] as Role[]).map((r) => {
          const count = users.filter((u) => u.role === r && u.isActive).length;
          const { icon: Icon } = roleConfig[r];
          return (
            <div key={r} className="bg-white rounded-2xl border p-4 shadow-sm text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">{r}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">User</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Role</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Joined</th>
                <th className="text-center px-5 py-3 text-xs text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={6} className="px-5 py-4"><div className="h-8 bg-slate-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : (
                users.map((user, i) => {
                  const config = roleConfig[user.role] || roleConfig.CASHIER;
                  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-800">{user.name}</p>
                            {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{user.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <Badge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeactivate(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Deactivate">
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className="mt-1" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" className="mt-1" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>{editUser ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                placeholder={editUser ? "Leave blank to keep current" : "Min 6 characters"} className="mt-1" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASHIER">Cashier – POS access only</SelectItem>
                  <SelectItem value="MANAGER">Manager – Inventory + Reports</SelectItem>
                  <SelectItem value="ADMIN">Admin – Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone (for WhatsApp notifications)</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1234567890" className="mt-1" />
            </div>
            {editUser && (
              <div className="flex items-center gap-3">
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
                <Label>Active Account</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
