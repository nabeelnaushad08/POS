"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  CheckCircle, Info, ArrowRight, RefreshCw, ShoppingCart,
  CreditCard, Users, Building2, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/lib/settings-context";

interface TrendPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ExpenseBreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  revenue: number;
  qty: number;
}

interface Insight {
  type: "warning" | "info" | "success";
  message: string;
}

interface FinanceDashboardData {
  period: { start: string; end: string };
  revenue: { total: number; discount: number; cogs: number; grossProfit: number; netProfit: number; profitMargin: number };
  expenses: { total: number; custom: number; payroll: number };
  inventory: { value: number; products: number };
  purchases: { total: number; owedToSuppliers: number };
  customers: { outstandingReceivables: number };
  assets: { total: number; count: number };
  investments: { total: number };
  balance: { assets: number; liabilities: number; net: number };
  salesCount: number;
  trend: TrendPoint[];
  expenseBreakdown: ExpenseBreakdownItem[];
  topProducts: TopProduct[];
  insights: Insight[];
}

function getPeriodDates(period: string, customStart: string, customEnd: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (period === "today") {
    return { start: today, end: today };
  }
  if (period === "week") {
    const s = new Date(now); s.setDate(now.getDate() - 6);
    return { start: s.toISOString().split("T")[0], end: today };
  }
  if (period === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: s.toISOString().split("T")[0], end: today };
  }
  if (period === "year") {
    return { start: `${now.getFullYear()}-01-01`, end: today };
  }
  if (period === "custom") {
    return { start: customStart, end: customEnd };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], end: today };
}

export default function FinanceDashboardPage() {
  const fmt = useCurrency();
  const router = useRouter();
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { start, end } = getPeriodDates(period, customStart, customEnd);
      if (!start || !end) return;
      const res = await fetch(`/api/finance/dashboard?start=${start}&end=${end}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json.data as FinanceDashboardData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally { setLoading(false); }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    if (period !== "custom") fetchData();
    else if (customStart && customEnd) fetchData();
  }, [period, fetchData, customStart, customEnd]);

  const d = data;

  const kpiCards = d ? [
    { label: "Total Revenue", value: fmt(d.revenue.total), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", sub: `${d.salesCount} sales` },
    { label: "Total Expenses", value: fmt(d.expenses.total), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", sub: `Payroll: ${fmt(d.expenses.payroll)}` },
    { label: "Gross Profit", value: fmt(d.revenue.grossProfit), icon: BarChart2, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", sub: `COGS: ${fmt(d.revenue.cogs)}` },
    { label: "Net Profit", value: fmt(d.revenue.netProfit), icon: DollarSign, color: d.revenue.netProfit >= 0 ? "text-purple-600" : "text-red-600", bg: "bg-purple-50 dark:bg-purple-900/20", sub: `Margin: ${d.revenue.profitMargin.toFixed(1)}%` },
    { label: "Inventory Value", value: fmt(d.inventory.value), icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", sub: `${d.inventory.products} products` },
    { label: "Receivables", value: fmt(d.customers.outstandingReceivables), icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", sub: "Outstanding customer credit" },
    { label: "Owed to Suppliers", value: fmt(d.purchases.owedToSuppliers), icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", sub: "Supplier payables" },
    { label: "Total Purchases", value: fmt(d.purchases.total), icon: ShoppingCart, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800", sub: "This period" },
    { label: "Employee Payroll", value: fmt(d.expenses.payroll), icon: Users, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20", sub: "This period" },
    { label: "Total Assets", value: fmt(d.assets.total), icon: Building2, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/20", sub: `${d.assets.count} assets` },
    { label: "Total Investment", value: fmt(d.investments.total), icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", sub: "All time" },
    { label: "Sales Count", value: String(d.salesCount), icon: ShoppingCart, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20", sub: "This period" },
  ] : [];

  const periodLabels: Record<string, string> = {
    today: "Today", week: "This Week", month: "This Month", year: "This Year", custom: "Custom Range",
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financial Dashboard</h1>
            <p className="text-indigo-200 text-sm mt-1">Owner business intelligence overview</p>
          </div>
          {d && (
            <div className="text-right">
              <p className="text-indigo-200 text-xs uppercase tracking-wider">Net Profit ({periodLabels[period]})</p>
              <p className={`text-3xl font-bold ${d.revenue.netProfit >= 0 ? "text-green-300" : "text-red-300"}`}>
                {fmt(d.revenue.netProfit)}
              </p>
              <p className="text-indigo-300 text-xs mt-1">{d.revenue.profitMargin.toFixed(1)}% margin</p>
            </div>
          )}
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">Period:</span>
          {(["today","week","month","year","custom"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex gap-2 items-center ml-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          )}
          <button onClick={fetchData} disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Loading financial data...</p>
          </div>
        </div>
      )}

      {!loading && d && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kpiCards.map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{card.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Business Position Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Business Position</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Business Assets</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{fmt(d.balance.assets)}</p>
                <p className="text-xs text-blue-500 mt-1">Inventory + Assets + Receivables</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmt(d.balance.liabilities)}</p>
                <p className="text-xs text-red-500 mt-1">Supplier payables</p>
              </div>
              <div className={`rounded-xl p-4 ${d.balance.net >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${d.balance.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>Net Business Position</p>
                <p className={`text-2xl font-bold ${d.balance.net >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{fmt(d.balance.net)}</p>
                <p className={`text-xs mt-1 ${d.balance.net >= 0 ? "text-green-500" : "text-red-500"}`}>{d.balance.net >= 0 ? "Positive position" : "Negative position"}</p>
              </div>
            </div>
            {/* Visual bar */}
            {d.balance.assets > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Assets ({((d.balance.assets / (d.balance.assets + d.balance.liabilities || 1)) * 100).toFixed(0)}%)</span>
                  <span>Liabilities ({((d.balance.liabilities / (d.balance.assets + d.balance.liabilities || 1)) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (d.balance.assets / (d.balance.assets + d.balance.liabilities || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue vs Expenses Trend */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue vs Expenses Trend</h3>
              {d.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={d.trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => fmt(Number(value))} labelFormatter={l => `Date: ${l}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} dot={false} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-600">
                  <p className="text-sm">No trend data available</p>
                </div>
              )}
            </div>

            {/* Expense Breakdown Pie */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Expense Breakdown</h3>
              {d.expenseBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={d.expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {d.expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmt(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                    {d.expenseBreakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-gray-400 dark:text-gray-600">
                  <p className="text-sm">No expense data</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Top Products + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Products by Revenue</h3>
              {d.topProducts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 dark:text-gray-500 text-xs border-b dark:border-gray-700">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Product</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topProducts.map((p, i) => (
                      <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{p.name}</td>
                        <td className="py-2 text-right text-gray-500">{p.qty}</td>
                        <td className="py-2 text-right font-medium text-green-600">{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-600 py-4 text-center">No sales data for this period</p>
              )}
            </div>

            {/* Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Business Insights</h3>
              {d.insights.length > 0 ? (
                <div className="space-y-3">
                  {d.insights.map((insight, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                      insight.type === "warning" ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" :
                      insight.type === "success" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
                      "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    }`}>
                      {insight.type === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      ) : insight.type === "success" ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm ${
                        insight.type === "warning" ? "text-amber-800 dark:text-amber-300" :
                        insight.type === "success" ? "text-green-800 dark:text-green-300" :
                        "text-blue-800 dark:text-blue-300"
                      }`}>{insight.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-300">Business is performing well. No issues detected.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Quick Navigation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Expenses", href: "/finance/expenses", icon: TrendingDown, color: "text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100" },
                { label: "Investments", href: "/finance/investments", icon: TrendingUp, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100" },
                { label: "Assets", href: "/finance/assets", icon: Building2, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100" },
                { label: "Reports", href: "/finance/reports", icon: BarChart2, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100" },
              ].map(item => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-colors ${item.color}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
