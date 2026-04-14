"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Download, FileSpreadsheet, TrendingUp, Package,
  DollarSign, ShoppingCart, AlertTriangle, Users, Truck, Star
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/lib/settings-context";
import toast from "react-hot-toast";

interface SaleReport {
  id: string;
  receiptNumber: string;
  total: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  status: string;
  user: { name: string };
  createdAt: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
}

interface ProfitReport {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
  };
}

interface InventoryReport {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    minimumStock: number;
    costPrice: number;
    sellingPrice: number;
    category?: { name: string } | null;
  }>;
  summary: {
    totalProducts: number;
    totalValue: number;
    totalRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

interface CustomerReport {
  customers: Array<{
    id: string | null;
    name: string;
    phone?: string | null;
    email?: string | null;
    totalSpend: number;
    transactions: number;
    lastPurchase: string;
  }>;
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    avgSpend: number;
    topCustomer: { name: string; totalSpend: number } | null;
  };
}

interface SupplierReport {
  suppliers: Array<{
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    purchaseCount: number;
    totalPurchased: number;
    totalPaid: number;
    balance: number;
  }>;
  summary: {
    totalSuppliers: number;
    totalPurchased: number;
    totalPaid: number;
    totalBalance: number;
  };
}

interface ProductPerformanceReport {
  products: Array<{
    productId: string | null;
    name: string;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  summary: {
    totalProducts: number;
    totalRevenue: number;
    totalProfit: number;
    totalUnitsSold: number;
    topProduct: { name: string; revenue: number } | null;
  };
}

export default function ReportsPage() {
  const fmt = useCurrency();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<{ sales: SaleReport[]; summary: { totalRevenue: number; totalTransactions: number; totalDiscount: number; totalTax: number } } | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [customerReport, setCustomerReport] = useState<CustomerReport | null>(null);
  const [supplierReport, setSupplierReport] = useState<SupplierReport | null>(null);
  const [productReport, setProductReport] = useState<ProductPerformanceReport | null>(null);

  const fetchReport = async (type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (type === "sales") setSalesReport(data);
      else if (type === "profit") setProfitReport(data);
      else if (type === "inventory") setInventoryReport(data);
      else if (type === "customers") setCustomerReport(data);
      else if (type === "suppliers") setSupplierReport(data);
      else if (type === "products") setProductReport(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (type: string) => {
    try {
      const XLSX = await import("xlsx");
      let ws: ReturnType<typeof XLSX.utils.json_to_sheet>;
      let filename = "";

      if (type === "sales" && salesReport) {
        ws = XLSX.utils.json_to_sheet(salesReport.sales.map((s) => ({
          Receipt: s.receiptNumber,
          Date: formatDate(s.createdAt),
          Cashier: s.user?.name,
          Total: Number(s.total),
          Discount: Number(s.discount),
          Tax: Number(s.tax),
          Payment: s.paymentMethod,
          Status: s.status,
        })));
        filename = "sales-report.xlsx";
      } else if (type === "inventory" && inventoryReport) {
        ws = XLSX.utils.json_to_sheet(inventoryReport.products.map((p) => ({
          Name: p.name,
          SKU: p.sku,
          Category: p.category?.name || "",
          Stock: p.stock,
          "Min Stock": p.minimumStock,
          "Cost Price": Number(p.costPrice),
          "Selling Price": Number(p.sellingPrice),
          "Stock Value": Number(p.costPrice) * p.stock,
        })));
        filename = "inventory-report.xlsx";
      } else return;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, filename);
      toast.success("Report exported!");
    } catch (err) {
      toast.error("Export failed");
      console.error(err);
    }
  };

  const exportToPDF = async (type: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 14, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      if (startDate) doc.text(`Period: ${startDate} to ${endDate || "now"}`, 14, 36);

      if (type === "sales" && salesReport) {
        autoTable(doc, {
          startY: 44,
          head: [["Receipt", "Date", "Cashier", "Total", "Payment", "Status"]],
          body: salesReport.sales.map((s) => [
            s.receiptNumber,
            formatDate(s.createdAt),
            s.user?.name || "",
            fmt(Number(s.total)),
            s.paymentMethod,
            s.status,
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241] },
        });
      } else if (type === "inventory" && inventoryReport) {
        autoTable(doc, {
          startY: 44,
          head: [["Name", "SKU", "Category", "Stock", "Cost", "Price", "Value"]],
          body: inventoryReport.products.map((p) => [
            p.name,
            p.sku,
            p.category?.name || "",
            p.stock,
            fmt(Number(p.costPrice)),
            fmt(Number(p.sellingPrice)),
            fmt(Number(p.costPrice) * p.stock),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241] },
        });
      }

      doc.save(`${type}-report.pdf`);
      toast.success("PDF exported!");
    } catch (err) {
      toast.error("PDF export failed");
      console.error(err);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm">Analyze your business performance</p>
      </div>

      {/* Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 items-end bg-white p-4 rounded-2xl border shadow-sm">
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full sm:w-40" />
        </div>
        <div>
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full sm:w-40" />
        </div>
      </div>

      <Tabs defaultValue="sales" onValueChange={fetchReport}>
        <TabsList className="bg-white border shadow-sm flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Sales
          </TabsTrigger>
          <TabsTrigger value="profit" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Profit
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Star className="h-4 w-4" /> Products
          </TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => fetchReport("sales")} loading={loading} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            {salesReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToExcel("sales")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF("sales")}>
                  <Download className="h-4 w-4 mr-1.5" /> PDF
                </Button>
              </div>
            )}
          </div>

          {salesReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Revenue", value: fmt(salesReport.summary.totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Transactions", value: salesReport.summary.totalTransactions, icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
                  { label: "Total Discount", value: fmt(salesReport.summary.totalDiscount), icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
                  { label: "Total Tax", value: fmt(salesReport.summary.totalTax), icon: BarChart3, color: "text-purple-600 bg-purple-50" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${stat.color.split(" ")[1]}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[0]}`} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{stat.label}</p>
                          <p className="font-bold text-slate-800">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Receipt</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Date</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Cashier</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Total</th>
                        <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Payment</th>
                        <th className="text-center px-5 py-3 text-xs text-slate-500 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport.sales.map((sale) => (
                        <tr key={sale.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 font-mono text-xs">{sale.receiptNumber}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{formatDate(sale.createdAt)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{sale.user?.name}</td>
                          <td className="px-4 py-3 text-right font-semibold">{fmt(Number(sale.total))}</td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <Badge variant="info">{sale.paymentMethod}</Badge>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant={sale.status === "COMPLETED" ? "success" : sale.status === "REFUNDED" ? "warning" : "destructive"}>
                              {sale.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Profit Report */}
        <TabsContent value="profit" className="space-y-4 mt-4">
          <Button onClick={() => fetchReport("profit")} loading={loading} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
          </Button>

          {profitReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Revenue", value: fmt(profitReport.summary.totalRevenue), color: "bg-emerald-50 text-emerald-600" },
                  { label: "Total Cost", value: fmt(profitReport.summary.totalCost), color: "bg-red-50 text-red-600" },
                  { label: "Gross Profit", value: fmt(profitReport.summary.totalProfit), color: "bg-blue-50 text-blue-600" },
                  { label: "Profit Margin", value: `${profitReport.summary.profitMargin.toFixed(1)}%`, color: "bg-purple-50 text-purple-600" },
                ].map((stat) => (
                  <Card key={stat.label} className={`${stat.color.split(" ")[0]}`}>
                    <CardContent className="p-5">
                      <p className={`text-xs font-medium ${stat.color.split(" ")[1]}`}>{stat.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${stat.color.split(" ")[1]}`}>{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => fetchReport("inventory")} loading={loading} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            {inventoryReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToExcel("inventory")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF("inventory")}>
                  <Download className="h-4 w-4 mr-1.5" /> PDF
                </Button>
              </div>
            )}
          </div>

          {inventoryReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Products", value: inventoryReport.summary.totalProducts, color: "text-slate-700" },
                  { label: "Stock Value (Cost)", value: fmt(inventoryReport.summary.totalValue), color: "text-blue-600" },
                  { label: "Retail Value", value: fmt(inventoryReport.summary.totalRetailValue), color: "text-emerald-600" },
                  { label: "Low Stock", value: inventoryReport.summary.lowStockCount, color: "text-amber-600" },
                  { label: "Out of Stock", value: inventoryReport.summary.outOfStockCount, color: "text-red-600" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-slate-500">{stat.label}</p>
                      <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {inventoryReport.summary.lowStockCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {inventoryReport.summary.lowStockCount} products need restocking
                </div>
              )}

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Product</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">SKU</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden lg:table-cell">Category</th>
                        <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Stock</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Cost</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Price</th>
                        <th className="text-right px-5 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryReport.products.map((product) => (
                        <tr key={product.id} className={`border-b last:border-0 hover:bg-slate-50 ${product.stock === 0 ? "bg-red-50/30" : product.stock <= product.minimumStock ? "bg-amber-50/30" : ""}`}>
                          <td className="px-5 py-3 font-medium text-slate-800">{product.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">{product.sku}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{product.category?.name || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={product.stock === 0 ? "destructive" : product.stock <= product.minimumStock ? "warning" : "success"}>
                              {product.stock}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{fmt(Number(product.costPrice))}</td>
                          <td className="px-4 py-3 text-right font-semibold">{fmt(Number(product.sellingPrice))}</td>
                          <td className="px-5 py-3 text-right text-slate-600 hidden md:table-cell">{fmt(Number(product.costPrice) * product.stock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>
        {/* Customers Report */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => fetchReport("customers")} loading={loading} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            {customerReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  import("xlsx").then((XLSX) => {
                    const ws = XLSX.utils.json_to_sheet(customerReport.customers.map((c) => ({
                      Name: c.name,
                      Phone: c.phone || "",
                      Email: c.email || "",
                      Transactions: c.transactions,
                      "Total Spend": c.totalSpend,
                      "Last Purchase": formatDate(c.lastPurchase),
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Customers");
                    XLSX.writeFile(wb, "customers-report.xlsx");
                    toast.success("Report exported!");
                  });
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
              </div>
            )}
          </div>

          {customerReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Customers", value: customerReport.summary.totalCustomers, icon: Users, color: "text-blue-600 bg-blue-50" },
                  { label: "Total Revenue", value: fmt(customerReport.summary.totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Avg. Spend/Customer", value: fmt(customerReport.summary.avgSpend), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
                  { label: "Top Customer", value: customerReport.summary.topCustomer?.name || "—", icon: Star, color: "text-amber-600 bg-amber-50" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${stat.color.split(" ")[1]}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[0]}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">{stat.label}</p>
                          <p className="font-bold text-slate-800 truncate">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Customer</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Contact</th>
                        <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Orders</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Total Spend</th>
                        <th className="text-right px-5 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerReport.customers.map((c, idx) => (
                        <tr key={c.id || c.name + idx} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {idx === 0 && <Star className="inline h-3.5 w-3.5 text-amber-400 mr-1 mb-0.5" />}
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                            {c.phone || "—"}{c.email ? ` · ${c.email}` : ""}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="info">{c.transactions}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(c.totalSpend)}</td>
                          <td className="px-5 py-3 text-right text-slate-500 text-xs hidden sm:table-cell">{formatDate(c.lastPurchase)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Suppliers Report */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => fetchReport("suppliers")} loading={loading} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            {supplierReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  import("xlsx").then((XLSX) => {
                    const ws = XLSX.utils.json_to_sheet(supplierReport.suppliers.map((s) => ({
                      Supplier: s.name,
                      Contact: s.contactPerson || "",
                      Phone: s.phone || "",
                      "Purchase Count": s.purchaseCount,
                      "Total Purchased": s.totalPurchased,
                      "Total Paid": s.totalPaid,
                      "Balance Due": s.balance,
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
                    XLSX.writeFile(wb, "suppliers-report.xlsx");
                    toast.success("Report exported!");
                  });
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
              </div>
            )}
          </div>

          {supplierReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Suppliers", value: supplierReport.summary.totalSuppliers, icon: Truck, color: "text-blue-600 bg-blue-50" },
                  { label: "Total Purchased", value: fmt(supplierReport.summary.totalPurchased), icon: ShoppingCart, color: "text-purple-600 bg-purple-50" },
                  { label: "Total Paid", value: fmt(supplierReport.summary.totalPaid), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Outstanding Balance", value: fmt(supplierReport.summary.totalBalance), icon: AlertTriangle, color: "text-red-600 bg-red-50" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${stat.color.split(" ")[1]}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[0]}`} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{stat.label}</p>
                          <p className="font-bold text-slate-800">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Supplier</th>
                        <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Contact</th>
                        <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Orders</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Purchased</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Paid</th>
                        <th className="text-right px-5 py-3 text-xs text-slate-500 font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierReport.suppliers.map((s) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                            {s.contactPerson || "—"}{s.phone ? ` · ${s.phone}` : ""}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="info">{s.purchaseCount}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(s.totalPurchased)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 hidden sm:table-cell">{fmt(s.totalPaid)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={s.balance > 0 ? "text-red-600 font-semibold" : "text-emerald-600"}>
                              {fmt(s.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Products Performance Report */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => fetchReport("products")} loading={loading} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            {productReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  import("xlsx").then((XLSX) => {
                    const ws = XLSX.utils.json_to_sheet(productReport.products.map((p) => ({
                      Product: p.name,
                      "Units Sold": p.unitsSold,
                      Revenue: p.revenue,
                      Cost: p.cost,
                      Profit: p.profit,
                      "Margin %": p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + "%" : "0%",
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Products");
                    XLSX.writeFile(wb, "products-performance.xlsx");
                    toast.success("Report exported!");
                  });
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
              </div>
            )}
          </div>

          {productReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Products Sold", value: productReport.summary.totalProducts, icon: Package, color: "text-blue-600 bg-blue-50" },
                  { label: "Total Revenue", value: fmt(productReport.summary.totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Total Profit", value: fmt(productReport.summary.totalProfit), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
                  { label: "Units Sold", value: productReport.summary.totalUnitsSold, icon: ShoppingCart, color: "text-amber-600 bg-amber-50" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${stat.color.split(" ")[1]}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[0]}`} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{stat.label}</p>
                          <p className="font-bold text-slate-800">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-5 py-3 text-xs text-slate-500 font-semibold">Product</th>
                        <th className="text-center px-4 py-3 text-xs text-slate-500 font-semibold">Units Sold</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Revenue</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold hidden sm:table-cell">Cost</th>
                        <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Profit</th>
                        <th className="text-right px-5 py-3 text-xs text-slate-500 font-semibold hidden md:table-cell">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReport.products.map((p, idx) => (
                        <tr key={p.productId || p.name + idx} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {idx === 0 && <Star className="inline h-3.5 w-3.5 text-amber-400 mr-1 mb-0.5" />}
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="info">{p.unitsSold}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(p.revenue)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{fmt(p.cost)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={p.profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {fmt(p.profit)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500 hidden md:table-cell">
                            {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + "%" : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
