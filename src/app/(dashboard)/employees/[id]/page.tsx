"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit, User, Calendar, Clock, DollarSign,
  Star, Phone, Mail, MapPin, AlertTriangle, Award,
  FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Plus, Building2, Briefcase, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCurrency } from "@/lib/settings-context";
import toast from "react-hot-toast";

const POSITIONS = ["Cashier", "Store Keeper", "Inventory Manager", "Supervisor", "Accountant", "Manager", "Owner"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY"];
const PERFORMANCE_TYPES = ["NOTE", "WARNING", "COMMENDATION"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  notes?: string | null;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number | string;
  workingDays: number;
  presentDays: number;
  overtimeHours: number | string;
  overtimeRate: number | string;
  allowances: number | string;
  deductions: number | string;
  bonus: number | string;
  advance: number | string;
  netSalary: number | string;
  status: string;
  paidAt?: string | null;
  notes?: string | null;
}

interface PerformanceRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
}

const statusColors: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-yellow-100 text-yellow-700",
  HALF_DAY: "bg-orange-100 text-orange-700",
};

const perfColors: Record<string, string> = {
  NOTE: "bg-blue-100 text-blue-700 border-blue-200",
  WARNING: "bg-red-100 text-red-700 border-red-200",
  COMMENDATION: "bg-green-100 text-green-700 border-green-200",
};

const perfIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  NOTE: FileText,
  WARNING: AlertTriangle,
  COMMENDATION: Award,
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fmt = useCurrency();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Attendance state
  const today = new Date();
  const [attendanceMonth, setAttendanceMonth] = useState(today.getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(today.getFullYear());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState({ date: new Date().toISOString().split("T")[0], checkIn: "", checkOut: "", status: "PRESENT", notes: "" });
  const [savingAtt, setSavingAtt] = useState(false);

  // Payroll state
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [editPayroll, setEditPayroll] = useState<PayrollRecord | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
    basicSalary: "0",
    workingDays: "26",
    presentDays: "26",
    overtimeHours: "0",
    overtimeRate: "0",
    allowances: "0",
    deductions: "0",
    bonus: "0",
    advance: "0",
    notes: "",
    status: "PENDING",
  });
  const [netSalaryPreview, setNetSalaryPreview] = useState(0);
  const [savingPayroll, setSavingPayroll] = useState(false);

  // Performance state
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [perfForm, setPerfForm] = useState({ type: "NOTE", title: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [savingPerf, setSavingPerf] = useState(false);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee & { dateOfBirth: string; dateJoined: string; basicSalary: string }>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      if (data.data) setEmployee(data.data);
      else toast.error("Employee not found");
    } catch {
      toast.error("Failed to load employee");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/employees/${id}/attendance?month=${attendanceMonth}&year=${attendanceYear}`);
      const data = await res.json();
      setAttendance(data.data || []);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoadingAttendance(false);
    }
  }, [id, attendanceMonth, attendanceYear]);

  const loadPayroll = useCallback(async () => {
    setLoadingPayroll(true);
    try {
      const res = await fetch(`/api/employees/${id}/payroll`);
      const data = await res.json();
      setPayrolls(data.data || []);
    } catch {
      toast.error("Failed to load payroll");
    } finally {
      setLoadingPayroll(false);
    }
  }, [id]);

  const loadPerformance = useCallback(async () => {
    setLoadingPerf(true);
    try {
      const res = await fetch(`/api/employees/${id}/performance`);
      const data = await res.json();
      setPerformance(data.data || []);
    } catch {
      toast.error("Failed to load performance notes");
    } finally {
      setLoadingPerf(false);
    }
  }, [id]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);
  useEffect(() => { if (activeTab === "attendance") loadAttendance(); }, [activeTab, loadAttendance]);
  useEffect(() => { if (activeTab === "attendance") loadAttendance(); }, [attendanceMonth, attendanceYear]);
  useEffect(() => { if (activeTab === "payroll") loadPayroll(); }, [activeTab, loadPayroll]);
  useEffect(() => { if (activeTab === "performance") loadPerformance(); }, [activeTab, loadPerformance]);

  // Net salary preview
  useEffect(() => {
    const basic = parseFloat(payrollForm.basicSalary) || 0;
    const working = parseInt(payrollForm.workingDays) || 1;
    const present = parseInt(payrollForm.presentDays) || 0;
    const otHours = parseFloat(payrollForm.overtimeHours) || 0;
    const otRate = parseFloat(payrollForm.overtimeRate) || 0;
    const allowances = parseFloat(payrollForm.allowances) || 0;
    const deductions = parseFloat(payrollForm.deductions) || 0;
    const bonus = parseFloat(payrollForm.bonus) || 0;
    const advance = parseFloat(payrollForm.advance) || 0;
    const dailyRate = working > 0 ? basic / working : 0;
    const earned = dailyRate * present;
    const ot = otHours * otRate;
    setNetSalaryPreview(earned + ot + allowances + bonus - deductions - advance);
  }, [payrollForm]);

  const openEditProfile = () => {
    if (!employee) return;
    setEditForm({
      fullName: employee.fullName,
      nicNumber: employee.nicNumber || "",
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split("T")[0] : "",
      gender: employee.gender || "",
      contactNumber: employee.contactNumber || "",
      email: employee.email || "",
      address: employee.address || "",
      emergencyContact: employee.emergencyContact || "",
      dateJoined: new Date(employee.dateJoined).toISOString().split("T")[0],
      position: employee.position,
      department: employee.department || "",
      basicSalary: String(employee.basicSalary),
      employmentType: employee.employmentType,
      notes: employee.notes || "",
      isActive: employee.isActive,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.fullName?.trim()) { toast.error("Full name is required"); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          basicSalary: parseFloat(String(editForm.basicSalary)) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated");
      setShowEditModal(false);
      loadEmployee();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAtt(true);
    try {
      const res = await fetch(`/api/employees/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Attendance saved");
      setShowAttModal(false);
      loadAttendance();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSavingAtt(false);
    }
  };

  const openPayrollForm = (pr?: PayrollRecord) => {
    if (pr) {
      setEditPayroll(pr);
      setPayrollForm({
        month: String(pr.month),
        year: String(pr.year),
        basicSalary: String(pr.basicSalary),
        workingDays: String(pr.workingDays),
        presentDays: String(pr.presentDays),
        overtimeHours: String(pr.overtimeHours),
        overtimeRate: String(pr.overtimeRate),
        allowances: String(pr.allowances),
        deductions: String(pr.deductions),
        bonus: String(pr.bonus),
        advance: String(pr.advance),
        notes: pr.notes || "",
        status: pr.status,
      });
    } else {
      setEditPayroll(null);
      setPayrollForm({
        month: String(today.getMonth() + 1),
        year: String(today.getFullYear()),
        basicSalary: String(employee?.basicSalary || "0"),
        workingDays: "26",
        presentDays: "26",
        overtimeHours: "0",
        overtimeRate: "0",
        allowances: "0",
        deductions: "0",
        bonus: "0",
        advance: "0",
        notes: "",
        status: "PENDING",
      });
    }
    setShowPayrollModal(true);
  };

  const handleSavePayroll = async () => {
    setSavingPayroll(true);
    try {
      const res = await fetch(`/api/employees/${id}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payrollForm,
          month: parseInt(payrollForm.month),
          year: parseInt(payrollForm.year),
          basicSalary: parseFloat(payrollForm.basicSalary),
          workingDays: parseInt(payrollForm.workingDays),
          presentDays: parseInt(payrollForm.presentDays),
          overtimeHours: parseFloat(payrollForm.overtimeHours),
          overtimeRate: parseFloat(payrollForm.overtimeRate),
          allowances: parseFloat(payrollForm.allowances),
          deductions: parseFloat(payrollForm.deductions),
          bonus: parseFloat(payrollForm.bonus),
          advance: parseFloat(payrollForm.advance),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payroll saved");
      setShowPayrollModal(false);
      loadPayroll();
    } catch {
      toast.error("Failed to save payroll");
    } finally {
      setSavingPayroll(false);
    }
  };

  const handleMarkPaid = async (pr: PayrollRecord) => {
    if (!confirm("Mark this payroll as PAID?")) return;
    try {
      const res = await fetch(`/api/employees/${id}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: pr.month,
          year: pr.year,
          basicSalary: pr.basicSalary,
          workingDays: pr.workingDays,
          presentDays: pr.presentDays,
          overtimeHours: pr.overtimeHours,
          overtimeRate: pr.overtimeRate,
          allowances: pr.allowances,
          deductions: pr.deductions,
          bonus: pr.bonus,
          advance: pr.advance,
          status: "PAID",
          paidAt: new Date().toISOString(),
          notes: pr.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked as paid");
      loadPayroll();
    } catch {
      toast.error("Failed to update payroll status");
    }
  };

  const handleSavePerformance = async () => {
    if (!perfForm.title.trim()) { toast.error("Title is required"); return; }
    if (!perfForm.description.trim()) { toast.error("Description is required"); return; }
    setSavingPerf(true);
    try {
      const res = await fetch(`/api/employees/${id}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Performance note added");
      setShowPerfModal(false);
      setPerfForm({ type: "NOTE", title: "", description: "", date: new Date().toISOString().split("T")[0] });
      loadPerformance();
    } catch {
      toast.error("Failed to save performance note");
    } finally {
      setSavingPerf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Employee not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/employees")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-14 w-14">
            {employee.photo ? (
              <img src={employee.photo} alt={employee.fullName} className="h-full w-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                {employee.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-500 font-mono">{employee.employeeId}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm text-slate-600">{employee.position}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${employee.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {employee.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  Personal Information
                </h2>
                <Button variant="outline" size="sm" onClick={openEditProfile} className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ProfileField label="NIC Number" value={employee.nicNumber} />
                <ProfileField label="Gender" value={employee.gender} />
                <ProfileField label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null} />
                <ProfileField label="Date Joined" value={formatDate(employee.dateJoined)} />
                <div className="col-span-2">
                  <ProfileField label="Address" value={employee.address} />
                </div>
                <div className="col-span-2">
                  <ProfileField label="Emergency Contact" value={employee.emergencyContact} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                Employment Details
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ProfileField label="Position" value={employee.position} />
                <ProfileField label="Department" value={employee.department} />
                <ProfileField label="Employment Type" value={employee.employmentType?.replace("_", " ")} />
                <ProfileField label="Basic Salary" value={fmt(Number(employee.basicSalary))} />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-medium text-slate-500 mb-2">CONTACT</h3>
                <div className="space-y-2">
                  {employee.contactNumber && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {employee.contactNumber}
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {employee.email}
                    </div>
                  )}
                </div>
              </div>
              {employee.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-medium text-slate-500 mb-1">NOTES</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{employee.notes}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Select value={String(attendanceMonth)} onValueChange={v => setAttendanceMonth(parseInt(v))}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(attendanceYear)} onValueChange={v => setAttendanceYear(parseInt(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowAttModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1" size="sm">
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            </div>
            {loadingAttendance ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Calendar className="h-10 w-10 mb-2" />
                <p>No attendance records for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Check In</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Check Out</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{formatDate(r.date)}</td>
                        <td className="px-4 py-3 text-slate-600">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || "bg-slate-100 text-slate-600"}`}>
                            {r.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{r.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Summary */}
            {attendance.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-6 text-sm">
                <span className="text-slate-600">Present: <strong className="text-green-700">{attendance.filter(r => r.status === "PRESENT").length}</strong></span>
                <span className="text-slate-600">Absent: <strong className="text-red-700">{attendance.filter(r => r.status === "ABSENT").length}</strong></span>
                <span className="text-slate-600">Late: <strong className="text-yellow-700">{attendance.filter(r => r.status === "LATE").length}</strong></span>
                <span className="text-slate-600">Half Day: <strong className="text-orange-700">{attendance.filter(r => r.status === "HALF_DAY").length}</strong></span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Payroll History</h2>
              <Button onClick={() => openPayrollForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1" size="sm">
                <Plus className="h-4 w-4" />
                Generate Payroll
              </Button>
            </div>
            {loadingPayroll ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : payrolls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <DollarSign className="h-10 w-10 mb-2" />
                <p>No payroll records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Basic</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Days</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Allowances</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Deductions</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Net Salary</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrolls.map(pr => (
                      <tr key={pr.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{MONTHS[pr.month - 1]} {pr.year}</td>
                        <td className="px-4 py-3 text-slate-600">{fmt(Number(pr.basicSalary))}</td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{pr.presentDays}/{pr.workingDays}</td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{fmt(Number(pr.allowances))}</td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{fmt(Number(pr.deductions))}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{fmt(Number(pr.netSalary))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pr.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openPayrollForm(pr)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                            {pr.status !== "PAID" && (
                              <button onClick={() => handleMarkPaid(pr)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-green-600 transition-colors" title="Mark Paid">
                                <CheckCircle className="h-4 w-4" />
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
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Performance Notes</h2>
              <Button onClick={() => setShowPerfModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1" size="sm">
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            </div>
            {loadingPerf ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : performance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white rounded-xl border border-slate-200">
                <Star className="h-10 w-10 mb-2" />
                <p>No performance notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {performance.map(note => {
                  const Icon = perfIcons[note.type] || FileText;
                  return (
                    <div key={note.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${note.type === "NOTE" ? "bg-blue-100" : note.type === "WARNING" ? "bg-red-100" : "bg-green-100"}`}>
                          <Icon className={`h-4 w-4 ${note.type === "NOTE" ? "text-blue-600" : note.type === "WARNING" ? "text-red-600" : "text-green-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${perfColors[note.type]}`}>
                              {note.type}
                            </span>
                            <span className="text-xs text-slate-400">{formatDate(note.date)}</span>
                          </div>
                          <h3 className="font-medium text-slate-900 text-sm">{note.title}</h3>
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{note.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={editForm.fullName || ""} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>NIC Number</Label>
              <Input value={editForm.nicNumber || ""} onChange={e => setEditForm(f => ({ ...f, nicNumber: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={editForm.dateOfBirth || ""} onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={editForm.gender || "none"} onValueChange={v => setEditForm(f => ({ ...f, gender: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select gender</SelectItem>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact Number</Label>
              <Input value={editForm.contactNumber || ""} onChange={e => setEditForm(f => ({ ...f, contactNumber: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input value={editForm.address || ""} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Emergency Contact</Label>
              <Input value={editForm.emergencyContact || ""} onChange={e => setEditForm(f => ({ ...f, emergencyContact: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Position</Label>
              <Select value={editForm.position || "Cashier"} onValueChange={v => setEditForm(f => ({ ...f, position: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Input value={editForm.department || ""} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select value={editForm.employmentType || "FULL_TIME"} onValueChange={v => setEditForm(f => ({ ...f, employmentType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Basic Salary</Label>
              <Input type="number" value={editForm.basicSalary || "0"} onChange={e => setEditForm(f => ({ ...f, basicSalary: e.target.value }))} min="0" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <textarea value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Modal */}
      <Dialog open={showAttModal} onOpenChange={setShowAttModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={attForm.status} onValueChange={v => setAttForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check In</Label>
                <Input type="time" value={attForm.checkIn} onChange={e => setAttForm(f => ({ ...f, checkIn: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Check Out</Label>
                <Input type="time" value={attForm.checkOut} onChange={e => setAttForm(f => ({ ...f, checkOut: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={attForm.notes} onChange={e => setAttForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttModal(false)}>Cancel</Button>
            <Button onClick={handleSaveAttendance} disabled={savingAtt} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingAtt ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Modal */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPayroll ? "Edit Payroll" : "Generate Payroll"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select value={payrollForm.month} onValueChange={v => setPayrollForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={payrollForm.year} onChange={e => setPayrollForm(f => ({ ...f, year: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Basic Salary</Label>
              <Input type="number" value={payrollForm.basicSalary} onChange={e => setPayrollForm(f => ({ ...f, basicSalary: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Working Days</Label>
                <Input type="number" value={payrollForm.workingDays} onChange={e => setPayrollForm(f => ({ ...f, workingDays: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Present Days</Label>
                <Input type="number" value={payrollForm.presentDays} onChange={e => setPayrollForm(f => ({ ...f, presentDays: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Overtime Hours</Label>
                <Input type="number" value={payrollForm.overtimeHours} onChange={e => setPayrollForm(f => ({ ...f, overtimeHours: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Overtime Rate</Label>
                <Input type="number" value={payrollForm.overtimeRate} onChange={e => setPayrollForm(f => ({ ...f, overtimeRate: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Allowances</Label>
                <Input type="number" value={payrollForm.allowances} onChange={e => setPayrollForm(f => ({ ...f, allowances: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Bonus</Label>
                <Input type="number" value={payrollForm.bonus} onChange={e => setPayrollForm(f => ({ ...f, bonus: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deductions</Label>
                <Input type="number" value={payrollForm.deductions} onChange={e => setPayrollForm(f => ({ ...f, deductions: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Advance</Label>
                <Input type="number" value={payrollForm.advance} onChange={e => setPayrollForm(f => ({ ...f, advance: e.target.value }))} className="mt-1" />
              </div>
            </div>
            {/* Net Salary Preview */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <span className="font-medium text-indigo-900">Net Salary (Preview)</span>
              <span className="text-xl font-bold text-indigo-700">{fmt(netSalaryPreview)}</span>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={payrollForm.notes} onChange={e => setPayrollForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
            <Button onClick={handleSavePayroll} disabled={savingPayroll} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingPayroll ? "Saving..." : "Save Payroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Note Modal */}
      <Dialog open={showPerfModal} onOpenChange={setShowPerfModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Performance Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={perfForm.type} onValueChange={v => setPerfForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={perfForm.title} onChange={e => setPerfForm(f => ({ ...f, title: e.target.value }))} placeholder="Note title" className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={perfForm.date} onChange={e => setPerfForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={perfForm.description}
                onChange={e => setPerfForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Describe the performance note..."
                className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerfModal(false)}>Cancel</Button>
            <Button onClick={handleSavePerformance} disabled={savingPerf} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingPerf ? "Saving..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value || <span className="text-slate-400 italic">Not set</span>}</p>
    </div>
  );
}
