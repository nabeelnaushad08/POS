import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam   = searchParams.get("end");

    const now   = new Date();
    const start = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = endParam   ? new Date(endParam)   : now;
    end.setHours(23, 59, 59, 999);

    // Revenue — from sales
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true },
    });
    const totalRevenue  = sales.reduce((s, x) => s + Number(x.total), 0);
    const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
    const totalCOGS     = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + Number(i.costPrice) * i.quantity, 0), 0);
    const grossProfit   = totalRevenue - totalCOGS;

    // Expenses (custom expenses)
    const expenses = await prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } });
    const totalCustomExpenses = Number(expenses._sum.amount || 0);

    // Payroll expenses
    const payroll = await prisma.payroll.findMany();
    const totalPayroll = payroll.reduce((s, p) => {
      const d = new Date(p.year, p.month - 1, 1);
      return d >= start && d <= end ? s + Number(p.netSalary) : s;
    }, 0);

    const totalExpenses = totalCustomExpenses + totalPayroll;
    const netProfit     = grossProfit - totalCustomExpenses;

    // Inventory value
    const products = await prisma.product.findMany({ where: { isActive: true } });
    const inventoryValue = products.reduce((s, p) => s + Number(p.costPrice) * p.stock, 0);

    // Purchases
    const purchases = await prisma.purchase.findMany({ where: { createdAt: { gte: start, lte: end } } });
    const totalPurchases = purchases.reduce((s, p) => s + Number(p.total), 0);

    // Outstanding supplier payables = total purchase - total paid
    const allPurchases = await prisma.purchase.findMany();
    const totalOwedToSuppliers = allPurchases.reduce((s, p) => s + Number(p.total) - Number(p.amountPaid), 0);

    // Customer credits outstanding
    const creditOut = await prisma.customerCredit.groupBy({
      by: ["type"],
      _sum: { amount: true },
    });
    const creditGiven    = creditOut.find(c => c.type === "CREDIT")?._sum.amount  || 0;
    const creditReceived = creditOut.find(c => c.type === "PAYMENT")?._sum.amount || 0;
    const outstandingReceivables = Number(creditGiven) - Number(creditReceived);

    // Assets
    const assets = await prisma.asset.findMany({ where: { isActive: true } });
    const totalAssetValue = assets.reduce((s, a) => s + Number(a.currentValue), 0);

    // Investments
    const investments = await prisma.investment.aggregate({ _sum: { amount: true } });
    const totalInvestment = Number(investments._sum.amount || 0);

    // Business position
    const totalBusinessAssets     = inventoryValue + totalAssetValue + outstandingReceivables;
    const totalBusinessLiabilities = totalOwedToSuppliers;
    const netBusinessPosition      = totalBusinessAssets - totalBusinessLiabilities;

    // Daily trend for current period (last 30 days max)
    const trendDays = Math.min(30, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    const trendStart = new Date(end); trendStart.setDate(trendStart.getDate() - trendDays + 1); trendStart.setHours(0,0,0,0);
    const trendSales = await prisma.sale.findMany({ where: { createdAt: { gte: trendStart, lte: end } }, orderBy: { createdAt: "asc" } });
    const trendExpenses = await prisma.expense.findMany({ where: { date: { gte: trendStart, lte: end } }, orderBy: { date: "asc" } });

    const trendMap: Record<string, { date: string; revenue: number; expenses: number; profit: number }> = {};
    for (let i = 0; i < trendDays; i++) {
      const d = new Date(trendStart); d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      trendMap[key] = { date: key, revenue: 0, expenses: 0, profit: 0 };
    }
    for (const s of trendSales) {
      const key = s.createdAt.toISOString().split("T")[0];
      if (trendMap[key]) trendMap[key].revenue += Number(s.total);
    }
    for (const e of trendExpenses) {
      const key = e.date.toISOString().split("T")[0];
      if (trendMap[key]) trendMap[key].expenses += Number(e.amount);
    }
    for (const d of Object.values(trendMap)) d.profit = d.revenue - d.expenses;
    const trend = Object.values(trendMap);

    // Expense breakdown by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const categories = await prisma.expenseCategory.findMany();
    const expenseBreakdown = expensesByCategory.map(e => ({
      name: categories.find(c => c.id === e.categoryId)?.name || "Uncategorised",
      value: Number(e._sum.amount || 0),
      color: categories.find(c => c.id === e.categoryId)?.color || "#6366f1",
    }));
    if (totalPayroll > 0) expenseBreakdown.push({ name: "Salaries", value: totalPayroll, color: "#f59e0b" });

    // Top selling products
    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { subtotal: true, quantity: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    });
    const productIds = topProducts.map(p => p.productId);
    const productNames = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } });
    const topProductsList = topProducts.map(p => ({
      name: productNames.find(n => n.id === p.productId)?.name || "Unknown",
      revenue: Number(p._sum.subtotal || 0),
      qty: p._sum.quantity || 0,
    }));

    // Insights
    const insights: Array<{ type: "warning" | "info" | "success"; message: string }> = [];
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    if (profitMargin < 10 && totalRevenue > 0) insights.push({ type: "warning", message: `Profit margin is low at ${profitMargin.toFixed(1)}%` });
    if (totalExpenses > totalRevenue * 0.8 && totalRevenue > 0) insights.push({ type: "warning", message: "Expenses exceed 80% of revenue" });
    if (totalOwedToSuppliers > 0) insights.push({ type: "info", message: `Outstanding supplier balance: Rs. ${totalOwedToSuppliers.toFixed(2)}` });
    if (outstandingReceivables > 0) insights.push({ type: "info", message: `Customer receivables outstanding: Rs. ${outstandingReceivables.toFixed(2)}` });
    if (profitMargin >= 20) insights.push({ type: "success", message: `Strong profit margin of ${profitMargin.toFixed(1)}%` });
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minimumStock).length;
    if (lowStockCount > 0) insights.push({ type: "warning", message: `${lowStockCount} products are running low on stock` });

    return NextResponse.json({
      data: {
        period: { start: start.toISOString(), end: end.toISOString() },
        revenue: { total: totalRevenue, discount: totalDiscount, cogs: totalCOGS, grossProfit, netProfit, profitMargin },
        expenses: { total: totalExpenses, custom: totalCustomExpenses, payroll: totalPayroll },
        inventory: { value: inventoryValue, products: products.length },
        purchases: { total: totalPurchases, owedToSuppliers: totalOwedToSuppliers },
        customers: { outstandingReceivables },
        assets: { total: totalAssetValue, count: assets.length },
        investments: { total: totalInvestment },
        balance: { assets: totalBusinessAssets, liabilities: totalBusinessLiabilities, net: netBusinessPosition },
        salesCount: sales.length,
        trend, expenseBreakdown, topProducts: topProductsList, insights,
      },
    });
  } catch (err) {
    console.error("[finance/dashboard]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
