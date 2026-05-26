"use client";
import { useState, useRef } from "react";
import { FileText, Download, RefreshCw, TrendingUp, ShoppingCart, Tag, DollarSign } from "lucide-react";
import { useCurrency } from "@/lib/settings-context";

interface ReportData {
  period:        { start: string; end: string };
  totalSales:    number;
  totalRevenue:  number;
  totalDiscount: number;
  totalCost:     number;
  grossProfit:   number;
  profitMargin:  number;
  byMethod:      Record<string, { count: number; total: number }>;
  topItems:      Array<{ name: string; qty: number; revenue: number }>;
  sales:         Array<{
    id: string; billNumber: string; createdAt: string;
    total: number; discount: number; paymentMethod: string;
    staffName: string; itemCount: number;
  }>;
}

export default function ReportsPage() {
  const fmt = useCurrency();
  const today     = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [startDate,   setStartDate]   = useState(monthStart);
  const [endDate,     setEndDate]     = useState(today);
  const [commission,  setCommission]  = useState("0");
  const [loading,     setLoading]     = useState(false);
  const [report,      setReport]      = useState<ReportData | null>(null);
  const [error,       setError]       = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReport(data.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const commissionPct   = parseFloat(commission) || 0;
  const commissionAmt   = report ? (report.totalRevenue * commissionPct) / 100 : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate and download sales reports for any period</p>
        </div>
        {report && (
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
            <Download className="w-4 h-4" /> Print / Download PDF
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 print:hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commission %</label>
            <input type="number" min={0} max={100} step={0.1} value={commission} onChange={e => setCommission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0" />
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {report && (
        <div ref={printRef} className="space-y-6">
          {/* Print header — only visible in print */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold">Sales Report</h2>
            <p className="text-sm text-gray-600">{report.period.start} to {report.period.end}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Sales",    value: String(report.totalSales),       icon: ShoppingCart, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
              { label: "Total Revenue",  value: fmt(report.totalRevenue),         icon: DollarSign,   color: "bg-green-50 dark:bg-green-900/20 text-green-600" },
              { label: "Total Discount", value: fmt(report.totalDiscount),        icon: Tag,          color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600" },
              { label: "Gross Profit",   value: fmt(report.grossProfit),          icon: TrendingUp,   color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Profit margin + commission */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Profit Margin</p><p className="font-bold text-lg text-indigo-600">{report.profitMargin.toFixed(1)}%</p></div>
              <div><p className="text-gray-500">Total Cost</p><p className="font-bold text-lg">{fmt(report.totalCost)}</p></div>
              {commissionPct > 0 && <div><p className="text-gray-500">Commission ({commissionPct}%)</p><p className="font-bold text-lg text-green-600">{fmt(commissionAmt)}</p></div>}
            </div>
          </div>

          {/* By payment method */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sales by Payment Method</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">Method</th><th className="pb-2 text-right">Count</th><th className="pb-2 text-right">Total</th><th className="pb-2 text-right">%</th>
              </tr></thead>
              <tbody>
                {Object.entries(report.byMethod).map(([m, d]) => (
                  <tr key={m} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-2 font-medium">{m}</td>
                    <td className="py-2 text-right">{d.count}</td>
                    <td className="py-2 text-right font-medium">{fmt(d.total)}</td>
                    <td className="py-2 text-right text-gray-500">{report.totalRevenue > 0 ? ((d.total / report.totalRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top 10 Products</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">#</th><th className="pb-2">Product</th><th className="pb-2 text-right">Qty Sold</th><th className="pb-2 text-right">Revenue</th><th className="pb-2 text-right">% of Sales</th>
              </tr></thead>
              <tbody>
                {report.topItems.map((item, i) => (
                  <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-medium">{item.name}</td>
                    <td className="py-2 text-right">{item.qty}</td>
                    <td className="py-2 text-right font-medium">{fmt(item.revenue)}</td>
                    <td className="py-2 text-right text-gray-500">{report.totalRevenue > 0 ? ((item.revenue / report.totalRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed sales table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">All Transactions ({report.totalSales})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                  <th className="pb-2 pr-3">Invoice</th><th className="pb-2 pr-3">Date &amp; Time</th><th className="pb-2 pr-3">Staff</th><th className="pb-2 pr-3 text-right">Items</th><th className="pb-2 pr-3 text-right">Discount</th><th className="pb-2 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {report.sales.map(s => (
                    <tr key={s.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500">{s.billNumber}</td>
                      <td className="py-2 pr-3 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{s.staffName}</td>
                      <td className="py-2 pr-3 text-right">{s.itemCount}</td>
                      <td className="py-2 pr-3 text-right text-green-600">{s.discount > 0 ? fmt(s.discount) : "-"}</td>
                      <td className="py-2 text-right font-semibold">{fmt(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                    <td colSpan={4} className="pt-2 text-gray-500">TOTAL</td>
                    <td className="pt-2 text-right text-green-600">{fmt(report.totalDiscount)}</td>
                    <td className="pt-2 text-right text-indigo-600">{fmt(report.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

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
