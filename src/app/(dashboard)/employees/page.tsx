"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, Search, Edit, UserX, Users, Eye, Phone, Mail,
  Briefcase, Building2, UserCheck, UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/lib/settings-context";
import toast from "react-hot-toast";

const POSITIONS = ["Cashier", "Store Keeper", "Inventory Manager", "Supervisor", "Accountant", "Manager", "Owner"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  nicNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  dateJoined: string;
  position: string;
  department?: string | null;
  basicSalary: number | string;
  employmentType: string;
  photo?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

interface EmployeeForm {
  fullName: string;
  nicNumber: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email: string;
  address: string;
  emergencyContact: string;
  dateJoined: string;
  position: string;
  department: string;
  basicSalary: string;
  employmentType: string;
  notes: string;
}

const defaultForm: EmployeeForm = {
  fullName: "",
  nicNumber: "",
  dateOfBirth: "",
  gender: "",
  contactNumber: "",
  email: "",
  address: "",
  emergencyContact: "",
  dateJoined: new Date().toISOString().split("T")[0],
  position: "Cashier",
  department: "",
  basicSalary: "0",
  employmentType: "FULL_TIME",
  notes: "",
};

const employmentTypeBadge: Record<string, string> = {
  FULL_TIME: "bg-blue-100 text-blue-700 border-blue-200",
  PART_TIME: "bg-yellow-100 text-yellow-700 border-yellow-200",
  CONTRACT: "bg-purple-100 text-purple-700 border-purple-200",
  TEMPORARY: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function EmployeesPage() {
  const router = useRouter();
  const fmt = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<EmployeeForm>>({});

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (positionFilter !== "all") params.set("position", positionFilter);
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, positionFilter, page]);

  const loadStats = useCallback(async () => {
    try {
      const [all, active, inactive] = await Promise.all([
        fetch("/api/employees?limit=1").then(r => r.json()),
        fetch("/api/employees?status=true&limit=1").then(r => r.json()),
        fetch("/api/employees?status=false&limit=1").then(r => r.json()),
      ]);
      setStats({ total: all.total || 0, active: active.total || 0, inactive: inactive.total || 0 });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadEmployees, 300);
    return () => clearTimeout(t);
  }, [loadEmployees]);

  const set = (field: keyof EmployeeForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Partial<EmployeeForm> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openAdd = () => {
    setEditEmployee(null);
    setForm(defaultForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setForm({
      fullName: emp.fullName,
      nicNumber: emp.nicNumber || "",
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split("T")[0] : "",
      gender: emp.gender || "",
      contactNumber: emp.contactNumber || "",
      email: emp.email || "",
      address: emp.address || "",
      emergencyContact: emp.emergencyContact || "",
      dateJoined: new Date(emp.dateJoined).toISOString().split("T")[0],
      position: emp.position,
      department: emp.department || "",
      basicSalary: String(emp.basicSalary),
      employmentType: emp.employmentType,
      notes: emp.notes || "",
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        nicNumber: form.nicNumber || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        contactNumber: form.contactNumber || null,
        email: form.email || null,
        address: form.address || null,
        emergencyContact: form.emergencyContact || null,
        dateJoined: form.dateJoined,
        position: form.position,
        department: form.department || null,
        basicSalary: parseFloat(form.basicSalary) || 0,
        employmentType: form.employmentType,
        notes: form.notes || null,
      };

      if (editEmployee) {
        await fetch(`/api/employees/${editEmployee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Employee updated");
      } else {
        await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Employee added");
      }
      setShowModal(false);
      loadEmployees();
      loadStats();
    } catch {
      toast.error("Failed to save employee");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Deactivate "${emp.fullName}"?`)) return;
    try {
      await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
      toast.success("Employee deactivated");
      loadEmployees();
      loadStats();
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your team, attendance and payroll</p>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <UserMinus className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Inactive</p>
              <p className="text-xl font-bold text-slate-900">{stats.inactive}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">On Payroll</p>
              <p className="text-xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={positionFilter} onValueChange={v => { setPositionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Users className="h-10 w-10 mb-2" />
            <p>No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden xl:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/employees/${emp.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.fullName} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                              {emp.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium text-slate-900">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-slate-700">{emp.position}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{emp.department || "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {emp.contactNumber && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="h-3 w-3" />
                            <span className="text-xs">{emp.contactNumber}</span>
                          </div>
                        )}
                        {emp.email && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{emp.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${employmentTypeBadge[emp.employmentType] || "bg-slate-100 text-slate-600"}`}>
                        {emp.employmentType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/employees/${emp.id}`)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {emp.isActive && (
                          <button
                            onClick={() => handleDeactivate(emp)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Full Name */}
            <div className="md:col-span-2">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Enter full name" className="mt-1" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>
            {/* NIC */}
            <div>
              <Label>NIC Number</Label>
              <Input value={form.nicNumber} onChange={e => set("nicNumber", e.target.value)} placeholder="e.g. 123456789V" className="mt-1" />
            </div>
            {/* Date of Birth */}
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} className="mt-1" />
            </div>
            {/* Gender */}
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || "none"} onValueChange={v => set("gender", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select gender</SelectItem>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Contact */}
            <div>
              <Label>Contact Number</Label>
              <Input value={form.contactNumber} onChange={e => set("contactNumber", e.target.value)} placeholder="+94 77 123 4567" className="mt-1" />
            </div>
            {/* Email */}
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@example.com" className="mt-1" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            {/* Address */}
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Home address" className="mt-1" />
            </div>
            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={e => set("emergencyContact", e.target.value)} placeholder="Name & phone" className="mt-1" />
            </div>
            {/* Date Joined */}
            <div>
              <Label>Date Joined</Label>
              <Input type="date" value={form.dateJoined} onChange={e => set("dateJoined", e.target.value)} className="mt-1" />
            </div>
            {/* Position */}
            <div>
              <Label>Position</Label>
              <Select value={form.position} onValueChange={v => set("position", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Department */}
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Operations" className="mt-1" />
            </div>
            {/* Employment Type */}
            <div>
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={v => set("employmentType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Basic Salary */}
            <div>
              <Label>Basic Salary</Label>
              <Input type="number" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} min="0" className="mt-1" />
            </div>
            {/* Notes */}
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving..." : editEmployee ? "Update" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
