"use client";
import { useState } from "react";
import {
  FileText, Download, RefreshCw, TrendingUp, ShoppingCart,
  DollarSign, Package, BarChart2,
} from "lucide-react";
import { useCurrency } from "@/lib/settings-context";

type ReportType =
  | "sales" | "sales-cashier" | "sales-product" | "sales-category"
  | "stock-current" | "stock-low" | "stock-out" | "stock-valuation"
  | "profit-gross" | "profit-net" | "profit-product" | "discounts";

interface ReportData {
  type: string;
  period: { start: string; end: string };
  summary: Record<string, number>;
  [key: string]: unknown;
}

interface ByMethodEntry { count: number; total: number }
type ByMethodMap = Record<string, ByMethodEntry>;

interface NamedRow {
  name: string;
  count?: number;
  total?: number;
  revenue?: number;
  qty?: number;
  [key: string]: unknown;
}

interface ProductRow {
  name: string;
  category?: string;
  stock?: number;
  minimumStock?: number;
  costPrice?: number;
  stockValue?: number;
  retailValue?: number;
  qty?: number;
  profit?: number;
  revenue?: number;
  [key: string]: unknown;
}

interface TransactionRow {
  receiptNumber?: string;
  createdAt: string;
  staffName?: string;
  customerName?: string;
  paymentMethod?: string;
  discount?: number;
  total?: number;
  [key: string]: unknown;
}

interface ReportDataTyped extends ReportData {
  byCashier?: NamedRow[];
  byCategory?: NamedRow[];
  byMethod?: ByMethodMap;
  byProduct?: ProductRow[];
  products?: ProductRow[];
  transactions?: TransactionRow[];
}

const REPORT_GROUPS = [
  {
    label: "Sales Reports",
    icon: ShoppingCart,
    reports: [
      { type: "sales",          label: "Sales Overview" },
      { type: "sales-cashier",  label: "Sales by Cashier" },
      { type: "sales-product",  label: "Sales by Product" },
      { type: "sales-category", label: "Sales by Category" },
      { type: "discounts",      label: "Discount Report" },
    ],
  },
  {
    label: "Inventory Reports",
    icon: Package,
    reports: [
      { type: "stock-current",   label: "Current Stock" },
      { type: "stock-low",       label: "Low Stock" },
      { type: "stock-out",       label: "Out of Stock" },
      { type: "stock-valuation", label: "Stock Valuation" },
    ],
  },
  {
    label: "Profit Reports",
    icon: TrendingUp,
    reports: [
      { type: "profit-gross",   label: "Gross Profit" },
      { type: "profit-net",     label: "Net Profit" },
      { type: "profit-product", label: "Product Profitability" },
    ],
  },
] as const;

export default function ReportsPage() {
  const fmt = useCurrency();
  const today      = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [startDate,    setStartDate]    = useState(monthStart);
  const [endDate,      setEndDate]      = useState(today);
  const [commission,   setCommission]   = useState("0");
  const [loading,      setLoading]      = useState(false);
  const [report,       setReport]       = useState<ReportDataTyped | null>(null);
  const [error,        setError]        = useState("");

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/reports/sales?type=${activeReport}&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data.error as string) || "Failed");
      setReport(data.data as ReportDataTyped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const commissionPct = parseFloat(commission) || 0;
  const commissionAmt = report ? ((report.summary?.totalRevenue || 0) * commissionPct) / 100 : 0;

  const setPreset = (preset: string) => {
    const now = new Date();
    if (preset === "today")     { const d = now.toISOString().split("T")[0]; setStartDate(d); setEndDate(d); }
    if (preset === "week")      { const s = new Date(now); s.setDate(now.getDate() - 6); setStartDate(s.toISOString().split("T")[0]); setEndDate(today); }
    if (preset === "month")     { setStartDate(monthStart); setEndDate(today); }
    if (preset === "lastmonth") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(s.toISOString().split("T")[0]); setEndDate(e.toISOString().split("T")[0]);
    }
    if (preset === "year")      { setStartDate(`${now.getFullYear()}-01-01`); setEndDate(today); }
  };

  const exportCSV = () => {
    if (!report) return;
    let csv = "";
    const tableKey = (["transactions", "products", "byProduct", "byCashier", "byCategory"] as const)
      .find(k => Array.isArray(report[k]));
    if (tableKey) {
      const rows = report[tableKey] as Array<Record<string, unknown>>;
      if (rows && rows.length > 0) {
        csv += Object.keys(rows[0]).join(",") + "\n";
        csv += rows.map(row =>
          Object.values(row).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        ).join("\n");
      }
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `${activeReport}-${startDate}-${endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const s = report?.summary || {};
  const activeLabel = REPORT_GROUPS.flatMap(g => [...g.reports]).find(r => r.type === activeReport)?.label ?? activeReport;

  return (
    <div className="p-4 lg:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Professional reports for Sri Lankan and international businesses
          </p>
        </div>
        {report && (
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <FileText className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-5 print:block">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-4 print:hidden">
          {REPORT_GROUPS.map(group => (
            <div key={group.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{group.label}</p>
              </div>
              {group.reports.map(r => (
                <button
                  key={r.type}
                  onClick={() => { setActiveReport(r.type as ReportType); setReport(null); }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b last:border-0 dark:border-gray-700 ${
                    activeReport === r.type
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-5">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 print:hidden">
            <div className="flex flex-wrap gap-2 mb-3">
              {([["Today","today"],["This Week","week"],["This Month","month"],["Last Month","lastmonth"],["This Year","year"]] as const).map(([label, preset]) => (
                <button
                  key={preset}
                  onClick={() => setPreset(preset)}
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commission %</label>
                <input type="number" min={0} max={100} step={0.1} value={commission}
                  onChange={e => setCommission(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0" />
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
              <BarChart2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Select a report type and click Generate</p>
            </div>
          )}

          {report && (
            <div className="space-y-5">
              {/* Print-only header */}
              <div className="hidden print:block text-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold">{activeLabel}</h2>
                <p className="text-sm text-gray-600 mt-1">Period: {report.period.start} to {report.period.end}</p>
                <p className="text-xs text-gray-400">Generated: {new Date().toLocaleString()}</p>
              </div>

              {/* Sales / profit summary cards */}
              {s.totalRevenue !== undefined && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {([
                    { label: "Total Sales",   value: String(s.totalSales ?? "-"),           icon: ShoppingCart, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
                    { label: "Revenue",       value: fmt(s.totalRevenue ?? 0),              icon: DollarSign,   color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
                    { label: "Gross Profit",  value: fmt(s.grossProfit ?? 0),               icon: TrendingUp,   color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
                    { label: "Profit Margin", value: `${(s.profitMargin ?? 0).toFixed(1)}%`, icon: BarChart2,   color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
                  ] as const).map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock summary cards */}
              {s.totalProducts !== undefined && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {([
                    { label: "Products",         value: String(s.totalProducts),   icon: Package,    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
                    { label: "Stock Value",       value: fmt(s.totalValue ?? 0),   icon: DollarSign,  color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
                    { label: "Retail Value",      value: fmt(s.retailValue ?? 0),  icon: TrendingUp,  color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
                    { label: "Potential Profit",  value: fmt(s.potentialProfit ?? 0), icon: BarChart2, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
                  ] as const).map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Commission banner */}
              {commissionPct > 0 && (s.totalRevenue ?? 0) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Commission ({commissionPct}%):&nbsp;
                    <span className="font-bold text-lg">{fmt(commissionAmt)}</span>
                  </p>
                </div>
              )}

              {/* Discount summary */}
              {report.type === "discounts" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Discount Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-500">Total Discounts Given</p><p className="font-bold text-xl text-red-600">{fmt(s.totalDiscount ?? 0)}</p></div>
                    <div><p className="text-gray-500">Transactions with Discount</p><p className="font-bold text-xl">{s.count ?? 0}</p></div>
                    <div><p className="text-gray-500">Average Discount</p><p className="font-bold text-xl">{fmt(s.avgDiscount ?? 0)}</p></div>
                  </div>
                </div>
              )}

              {/* By Cashier table */}
              {Array.isArray(report.byCashier) && report.byCashier.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sales by Cashier</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                        <th className="pb-2">Name</th>
                        <th className="pb-2 text-right">Count</th>
                        <th className="pb-2 text-right">Revenue</th>
                        <th className="pb-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCashier.map((row, i) => {
                        const revenue = (row.total ?? 0) as number;
                        const totalRev = (s.totalRevenue || 1) as number;
                        return (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                            <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{row.name}</td>
                            <td className="py-2 text-right text-gray-500">{row.count ?? ""}</td>
                            <td className="py-2 text-right font-medium">{fmt(revenue)}</td>
                            <td className="py-2 text-right text-gray-500">{((revenue / totalRev) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* By Category table */}
              {Array.isArray(report.byCategory) && report.byCategory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sales by Category</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Revenue</th>
                        <th className="pb-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCategory.map((row, i) => {
                        const revenue = (row.revenue ?? 0) as number;
                        const totalRev = (s.totalRevenue || 1) as number;
                        return (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                            <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{row.name}</td>
                            <td className="py-2 text-right text-gray-500">{row.qty ?? ""}</td>
                            <td className="py-2 text-right font-medium">{fmt(revenue)}</td>
                            <td className="py-2 text-right text-gray-500">{((revenue / totalRev) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* By Payment Method table */}
              {report.byMethod && Object.keys(report.byMethod).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sales by Payment Method</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                        <th className="pb-2">Method</th>
                        <th className="pb-2 text-right">Count</th>
                        <th className="pb-2 text-right">Revenue</th>
                        <th className="pb-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.byMethod).map(([method, d], i) => {
                        const totalRev = (s.totalRevenue || 1) as number;
                        return (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                            <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{method}</td>
                            <td className="py-2 text-right text-gray-500">{d.count}</td>
                            <td className="py-2 text-right font-medium">{fmt(d.total)}</td>
                            <td className="py-2 text-right text-gray-500">{((d.total / totalRev) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Product Performance (byProduct) */}
              {Array.isArray(report.byProduct) && report.byProduct.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Product Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                          <th className="pb-2 pr-3">#</th>
                          <th className="pb-2 pr-3">Product</th>
                          <th className="pb-2 pr-3">Category</th>
                          <th className="pb-2 pr-3 text-right">Qty</th>
                          <th className="pb-2 pr-3 text-right">Revenue</th>
                          <th className="pb-2 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byProduct.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-2 pr-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                            <td className="py-2 pr-3 text-gray-500 text-xs">{row.category ?? ""}</td>
                            <td className="py-2 pr-3 text-right text-gray-500">{row.qty ?? 0}</td>
                            <td className="py-2 pr-3 text-right font-medium">{fmt(row.revenue ?? 0)}</td>
                            <td className="py-2 text-right font-medium text-green-600">{fmt(row.profit ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stock / inventory products table */}
              {Array.isArray(report.products) && report.products.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Products</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                          <th className="pb-2 pr-3">#</th>
                          <th className="pb-2 pr-3">Product</th>
                          <th className="pb-2 pr-3">Category</th>
                          <th className="pb-2 pr-3 text-right">Stock</th>
                          <th className="pb-2 pr-3 text-right">Min</th>
                          <th className="pb-2 pr-3 text-right">Cost Price</th>
                          <th className="pb-2 text-right">Stock Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.products.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-2 pr-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                            <td className="py-2 pr-3 text-gray-500 text-xs">{row.category ?? ""}</td>
                            <td className="py-2 pr-3 text-right">
                              <span className={`font-medium ${
                                (row.stock ?? 0) === 0
                                  ? "text-red-500"
                                  : (row.stock ?? 0) <= (row.minimumStock ?? 0)
                                  ? "text-amber-500"
                                  : "text-green-600"
                              }`}>
                                {row.stock ?? 0}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right text-gray-500 text-xs">{row.minimumStock ?? 0}</td>
                            <td className="py-2 pr-3 text-right">{fmt(row.costPrice ?? 0)}</td>
                            <td className="py-2 text-right font-medium">{fmt(row.stockValue ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transactions table */}
              {Array.isArray(report.transactions) && report.transactions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Transactions ({report.transactions.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                          <th className="pb-2 pr-3">Receipt</th>
                          <th className="pb-2 pr-3">Date</th>
                          <th className="pb-2 pr-3">Staff</th>
                          <th className="pb-2 pr-3">Customer</th>
                          <th className="pb-2 pr-3">Method</th>
                          <th className="pb-2 pr-3 text-right">Discount</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.transactions.map((t, i) => (
                          <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-2 pr-3 font-mono text-xs text-gray-400">{t.receiptNumber ?? ""}</td>
                            <td className="py-2 pr-3 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                            <td className="py-2 pr-3">{t.staffName ?? ""}</td>
                            <td className="py-2 pr-3 text-gray-500 text-xs">{t.customerName ?? "-"}</td>
                            <td className="py-2 pr-3">
                              <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-gray-700">
                                {t.paymentMethod ?? ""}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right text-green-600 text-xs">
                              {(t.discount ?? 0) > 0 ? fmt(t.discount ?? 0) : "-"}
                            </td>
                            <td className="py-2 text-right font-semibold">{fmt(t.total ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
