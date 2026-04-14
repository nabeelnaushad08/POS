"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { TrendingUp, ShoppingCart, Package, AlertTriangle, DollarSign, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { useCurrency } from "@/lib/settings-context";
import type { DashboardStats } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
  const fmt = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  // Cashiers should only use POS — redirect them away from the dashboard
  useEffect(() => {
    const role = (session?.user as { role?: string })?.role;
    if (role === "CASHIER") router.replace("/pos");
  }, [session, router]);

  const statCards = (stats: DashboardStats) => [
    {
      title: "Today's Revenue",
      value: fmt(stats.todayRevenue),
      sub: `${stats.todayTransactions} transactions`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: "+12%",
    },
    {
      title: "This Week",
      value: fmt(stats.weekRevenue),
      sub: "Weekly revenue",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+8%",
    },
    {
      title: "This Month",
      value: fmt(stats.monthRevenue),
      sub: "Monthly revenue",
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: "+15%",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      sub: `${stats.lowStockCount} low stock`,
      icon: Package,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      alert: stats.lowStockCount > 0,
    },
  ];

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 bg-white rounded-2xl animate-pulse border" />
          <div className="h-80 bg-white rounded-2xl animate-pulse border" />
        </div>
      </div>
    );
  }

  if (!stats) return null;
  const cards = statCards(stats);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <Link
          href="/pos"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Open POS
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        {card.alert ? (
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {card.sub}
                          </span>
                        ) : (
                          <>
                            {card.trend && (
                              <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3" />
                                {card.trend}
                              </span>
                            )}
                            {card.sub}
                          </>
                        )}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue (Last 30 Days)</CardTitle>
              <CardDescription>Daily revenue trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.salesChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                    formatter={(value) => [fmt(Number(value)), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Products</CardTitle>
              <CardDescription>By quantity sold this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickFormatter={(v: string) => v.substring(0, 12)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none" }}
                    formatter={(v) => [v, "Units Sold"]}
                  />
                  <Bar dataKey="totalQuantity" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Sales */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Link href="/reports" className="text-xs text-indigo-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-medium">Receipt</th>
                      <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium hidden sm:table-cell">Cashier</th>
                      <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium hidden md:table-cell">Date</th>
                      <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Amount</th>
                      <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSales.slice(0, 8).map((sale) => (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{sale.receiptNumber}</td>
                        <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                          {sale.user?.name}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                          {formatDateTime(sale.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {fmt(Number(sale.total))}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge
                            variant={
                              sale.status === "COMPLETED" ? "success" :
                              sale.status === "REFUNDED" ? "warning" : "destructive"
                            }
                          >
                            {sale.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Low Stock Alert
                </CardTitle>
                <Link href="/inventory" className="text-xs text-indigo-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.lowStockProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Package className="h-10 w-10 mb-2" />
                  <p className="text-sm font-medium text-slate-400">All stocked up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">Min: {p.minimumStock}</p>
                      </div>
                      <Badge
                        variant={p.stock === 0 ? "destructive" : "warning"}
                        className="ml-2 shrink-0"
                      >
                        {p.stock === 0 ? "Out" : p.stock + " left"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
