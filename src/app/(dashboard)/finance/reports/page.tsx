"use client";
import { useState } from "react";
import { FileText, Download, RefreshCw, BarChart2, TrendingUp, DollarSign, Package, Building2 } from "lucide-react";
import { useCurrency } from "@/lib/settings-context";
import * as XLSX from "xlsx";

type ReportType = "pl" | "cashflow" | "expense" | "investment" | "asset";

interface PLReport {
  type: "pl";
  period: { start: string; end: string };
  revenue: number;
  discount: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  payroll: number;
  netProfit: number;
  expenseBreakdown: Array<{ name: string; amount: number }>;
}

interface CashFlowReport {
  type: "cashflow";
  period: { start: string; end: string };
  inflows: number;
  outflows: number;
  purchaseOutflows: number;
  expenseOutflows: number;
  netCashFlow: number;
  transactions: Array<{ date: string | Date; type: string; description: string; amount: number }>;
}

interface ExpenseReport {
  type: "expense";
  period: { start: string; end: string };
  total: number;
  byCategory: Array<{ name: string; amount: number }>;
  items: Array<{ date: string | Date; title: string; category: string; amount: number; method: string; reference: string | null }>;
}

interface InvestmentReport {
  type: "investment";
  period: { start: string; end: string };
  total: number;
  items: Array<{ date: string | Date; title: string; type: string; amount: number; description: string | null }>;
}

interface AssetReport {
  type: "asset";
  period: { start: string; end: string };
  totalCost: number;
  totalValue: number;
  depreciation: number;
  items: Array<{ name: string; type: string; purchaseDate: string | Date; purchaseCost: number; currentValue: number; notes: string | null; isActive: boolean }>;
}

type ReportData = PLReport | CashFlowReport | ExpenseReport | InvestmentReport | AssetReport;

const REPORT_TYPES: Array<{ type: ReportType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { type: "pl",         label: "P&L Statement",    icon: TrendingUp,  desc: "Profit & Loss overview" },
  { type: "cashflow",   label: "Cash Flow",         icon: DollarSign,  desc: "Money in and out" },
  { type: "expense",    label: "Expense Report",    icon: BarChart2,   desc: "All expenses by category" },
  { type: "investment", label: "Investment Report", icon: TrendingUp,  desc: "Capital investments" },
  { type: "asset",      label: "Asset Register",    icon: Building2,   desc: "Business assets" },
];

export default function FinanceReportsPage() {
  const fmt = useCurrency();
  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [activeType, setActiveType] = useState<ReportType>("pl");
  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/finance/reports?type=${activeType}&start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setReport(json.data as ReportData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const exportPDF = async () => {
    if (!report) return;
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();

    const title = REPORT_TYPES.find(r => r.type === activeType)?.label || "Financial Report";
    const periodStr = `Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`;

    doc.setFontSize(18);
    doc.setTextColor(60, 60, 60);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(periodStr, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    let y = 45;

    if (report.type === "pl") {
      const rows = [
        ["Revenue", fmt(report.revenue)],
        ["Less: Discounts", fmt(report.discount)],
        ["Cost of Goods Sold", fmt(report.cogs)],
        ["Gross Profit", fmt(report.grossProfit)],
        ["Operating Expenses", fmt(report.expenses)],
        ["Payroll", fmt(report.payroll)],
        ["Net Profit", fmt(report.netProfit)],
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({ startY: y, head: [["Description", "Amount"]], body: rows, theme: "striped" });
    } else if (report.type === "cashflow") {
      const rows = report.transactions.map(t => [new Date(t.date).toLocaleDateString(), t.type, t.description, fmt(t.amount)]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({ startY: y, head: [["Date", "Type", "Description", "Amount"]], body: rows, theme: "striped" });
    } else if (report.type === "expense") {
      const rows = report.items.map(e => [new Date(e.date).toLocaleDateString(), e.title, e.category, fmt(e.amount), e.method, e.reference || ""]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({ startY: y, head: [["Date", "Title", "Category", "Amount", "Method", "Reference"]], body: rows, theme: "striped" });
    } else if (report.type === "investment") {
      const rows = report.items.map(i => [new Date(i.date).toLocaleDateString(), i.title, i.type, fmt(i.amount), i.description || ""]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({ startY: y, head: [["Date", "Title", "Type", "Amount", "Description"]], body: rows, theme: "striped" });
    } else if (report.type === "asset") {
      const rows = report.items.map(a => [a.name, a.type, new Date(a.purchaseDate).toLocaleDateString(), fmt(a.purchaseCost), fmt(a.currentValue), a.isActive ? "Active" : "Inactive"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({ startY: y, head: [["Name", "Type", "Purchase Date", "Cost", "Current Value", "Status"]], body: rows, theme: "striped" });
    }

    doc.save(`${activeType}-report-${today}.pdf`);
  };

  const exportExcel = () => {
    if (!report) return;
    let rows: Array<Record<string, unknown>> = [];

    if (report.type === "pl") {
      rows = [
        { Description: "Revenue", Amount: report.revenue },
        { Description: "Discounts", Amount: report.discount },
        { Description: "COGS", Amount: report.cogs },
        { Description: "Gross Profit", Amount: report.grossProfit },
        { Description: "Expenses", Amount: report.expenses },
        { Description: "Payroll", Amount: report.payroll },
        { Description: "Net Profit", Amount: report.netProfit },
      ];
    } else if (report.type === "cashflow") {
      rows = report.transactions.map(t => ({ Date: new Date(t.date).toLocaleDateString(), Type: t.type, Description: t.description, Amount: t.amount }));
    } else if (report.type === "expense") {
      rows = report.items.map(e => ({ Date: new Date(e.date).toLocaleDateString(), Title: e.title, Category: e.category, Amount: e.amount, Method: e.method, Reference: e.reference || "" }));
    } else if (report.type === "investment") {
      rows = report.items.map(i => ({ Date: new Date(i.date).toLocaleDateString(), Title: i.title, Type: i.type, Amount: i.amount, Description: i.description || "" }));
    } else if (report.type === "asset") {
      rows = report.items.map(a => ({ Name: a.name, Type: a.type, PurchaseDate: new Date(a.purchaseDate).toLocaleDateString(), Cost: a.purchaseCost, CurrentValue: a.currentValue, Status: a.isActive ? "Active" : "Inactive" }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeType}-report-${today}.xlsx`);
  };

  const r = report;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate detailed financial reports for your business</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <FileText className="w-4 h-4" /> Print
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-5 print:block">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-1 print:hidden">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.type}
              onClick={() => { setActiveType(rt.type); setReport(null); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-start gap-3 ${
                activeType === rt.type
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
              }`}
            >
              <rt.icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className={`font-medium ${activeType === rt.type ? "" : ""}`}>{rt.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{rt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 space-y-5">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 print:hidden">
            <div className="flex flex-wrap gap-2 mb-3">
              {([
                ["Today", "today"],
                ["This Month", "month"],
                ["This Year", "year"],
              ] as const).map(([label, preset]) => (
                <button key={preset} onClick={() => {
                  const now = new Date();
                  if (preset === "today") { setStartDate(today); setEndDate(today); }
                  if (preset === "month") { setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]); setEndDate(today); }
                  if (preset === "year")  { setStartDate(`${now.getFullYear()}-01-01`); setEndDate(today); }
                }} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex items-end">
                <button onClick={generate} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>

          {!report && !loading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Select a report type and click Generate</p>
            </div>
          )}

          {/* P&L Report */}
          {r?.type === "pl" && (
            <div className="space-y-4">
              <div className="hidden print:block text-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold">Profit &amp; Loss Statement</h2>
                <p className="text-sm text-gray-600 mt-1">Period: {new Date(r.period.start).toLocaleDateString()} - {new Date(r.period.end).toLocaleDateString()}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Revenue", value: fmt(r.revenue), color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
                  { label: "COGS", value: fmt(r.cogs), color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
                  { label: "Gross Profit", value: fmt(r.grossProfit), color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
                  { label: "Expenses", value: fmt(r.expenses), color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
                  { label: "Payroll", value: fmt(r.payroll), color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
                  { label: "Net Profit", value: fmt(r.netProfit), color: r.netProfit >= 0 ? "text-purple-600 bg-purple-50 dark:bg-purple-900/20" : "text-red-600 bg-red-50 dark:bg-red-900/20" },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-4 ${item.color}`}>
                    <p className="text-xs uppercase tracking-wider opacity-70 font-medium">{item.label}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
              {r.expenseBreakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Expense Breakdown</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-400 border-b dark:border-gray-700"><th className="pb-2">Category</th><th className="pb-2 text-right">Amount</th></tr></thead>
                    <tbody>
                      {r.expenseBreakdown.map((eb, i) => (
                        <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                          <td className="py-2 text-gray-700 dark:text-gray-300">{eb.name}</td>
                          <td className="py-2 text-right font-medium text-red-600">{fmt(eb.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Cash Flow Report */}
          {r?.type === "cashflow" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs text-green-600 uppercase tracking-wider">Total Inflows</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{fmt(r.inflows)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs text-red-600 uppercase tracking-wider">Total Outflows</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{fmt(r.outflows)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider">Purchase Outflows</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{fmt(r.purchaseOutflows)}</p>
                </div>
                <div className={`rounded-xl p-4 ${r.netCashFlow >= 0 ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                  <p className={`text-xs uppercase tracking-wider ${r.netCashFlow >= 0 ? "text-indigo-600" : "text-red-600"}`}>Net Cash Flow</p>
                  <p className={`text-2xl font-bold mt-1 ${r.netCashFlow >= 0 ? "text-indigo-700 dark:text-indigo-300" : "text-red-700 dark:text-red-300"}`}>{fmt(r.netCashFlow)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Transactions ({r.transactions.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-400 border-b dark:border-gray-700">
                      <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Description</th><th className="pb-2 text-right">Amount</th>
                    </tr></thead>
                    <tbody>
                      {r.transactions.slice(0, 100).map((t, i) => (
                        <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${t.type === "IN" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{t.type}</span>
                          </td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{t.description}</td>
                          <td className={`py-2 text-right font-medium ${t.type === "IN" ? "text-green-600" : "text-red-600"}`}>{fmt(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Expense Report */}
          {r?.type === "expense" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs text-red-600 uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{fmt(r.total)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Items Count</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{r.items.length}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold mb-3">By Category</h3>
                <table className="w-full text-sm mb-4">
                  <thead><tr className="text-xs text-gray-400 border-b dark:border-gray-700 text-left"><th className="pb-2">Category</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">%</th></tr></thead>
                  <tbody>
                    {r.byCategory.map((c, i) => (
                      <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-2 text-gray-700 dark:text-gray-300">{c.name}</td>
                        <td className="py-2 text-right font-medium">{fmt(c.amount)}</td>
                        <td className="py-2 text-right text-gray-400 text-xs">{r.total > 0 ? ((c.amount / r.total) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h3 className="font-semibold mb-3">All Expenses</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b dark:border-gray-700 text-left">
                      <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Title</th><th className="pb-2 pr-3">Category</th><th className="pb-2 text-right pr-3">Amount</th><th className="pb-2">Method</th>
                    </tr></thead>
                    <tbody>
                      {r.items.slice(0, 100).map((e, i) => (
                        <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-xs text-gray-400">{new Date(e.date).toLocaleDateString()}</td>
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{e.title}</td>
                          <td className="py-2 pr-3 text-gray-500 text-xs">{e.category}</td>
                          <td className="py-2 text-right pr-3 font-medium text-red-600">{fmt(e.amount)}</td>
                          <td className="py-2 text-xs text-gray-400">{e.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Investment Report */}
          {r?.type === "investment" && (
            <div className="space-y-4">
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
                <p className="text-xs text-violet-600 uppercase tracking-wider">Total Invested</p>
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 mt-1">{fmt(r.total)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold mb-3">Investments ({r.items.length})</h3>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400 border-b dark:border-gray-700 text-left">
                    <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Title</th><th className="pb-2 pr-3">Type</th><th className="pb-2 text-right pr-3">Amount</th><th className="pb-2">Description</th>
                  </tr></thead>
                  <tbody>
                    {r.items.map((inv, i) => (
                      <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-2 pr-3 text-xs text-gray-400">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">{inv.title}</td>
                        <td className="py-2 pr-3 text-xs text-gray-500">{inv.type}</td>
                        <td className="py-2 text-right pr-3 font-medium text-violet-600">{fmt(inv.amount)}</td>
                        <td className="py-2 text-xs text-gray-400">{inv.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Asset Report */}
          {r?.type === "asset" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{fmt(r.totalCost)}</p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4">
                  <p className="text-xs text-teal-600 uppercase tracking-wider">Current Value</p>
                  <p className="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1">{fmt(r.totalValue)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs text-red-600 uppercase tracking-wider">Depreciation</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{fmt(r.depreciation)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold mb-3">Asset Register ({r.items.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b dark:border-gray-700 text-left">
                      <th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Purchase Date</th><th className="pb-2 text-right pr-3">Cost</th><th className="pb-2 text-right pr-3">Current Value</th><th className="pb-2">Status</th>
                    </tr></thead>
                    <tbody>
                      {r.items.map((a, i) => (
                        <tr key={i} className={`border-b dark:border-gray-700 last:border-0 ${!a.isActive ? "opacity-50" : ""}`}>
                          <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">{a.name}</td>
                          <td className="py-2 pr-3 text-xs text-gray-500">{a.type}</td>
                          <td className="py-2 pr-3 text-xs text-gray-400">{new Date(a.purchaseDate).toLocaleDateString()}</td>
                          <td className="py-2 text-right pr-3">{fmt(a.purchaseCost)}</td>
                          <td className="py-2 text-right pr-3 font-medium text-teal-600">{fmt(a.currentValue)}</td>
                          <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${a.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-400"}`}>{a.isActive ? "Active" : "Inactive"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
