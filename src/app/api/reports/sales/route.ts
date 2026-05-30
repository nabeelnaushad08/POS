import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type      = searchParams.get("type")      || "sales";
    const startDate = searchParams.get("startDate") || "";
    const endDate   = searchParams.get("endDate")   || "";

    if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });

    const start = new Date(startDate);
    const end   = new Date(endDate); end.setHours(23, 59, 59, 999);

    // ── SALES REPORTS ─────────────────────────────────────────────────
    if (type === "sales" || type === "sales-cashier" || type === "sales-product" || type === "sales-category") {
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          items: { include: { product: { select: { name: true, category: { select: { name: true } } } } } },
          user: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const totalRevenue  = sales.reduce((s, x) => s + Number(x.total),    0);
      const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
      const totalTax      = sales.reduce((s, x) => s + Number(x.tax),      0);
      const totalCost     = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + Number(i.costPrice) * i.quantity, 0), 0);
      const grossProfit   = totalRevenue - totalCost;

      // By cashier
      const byCashier: Record<string, { name: string; count: number; total: number }> = {};
      for (const s of sales) {
        const n = s.user?.name || "Unknown";
        if (!byCashier[n]) byCashier[n] = { name: n, count: 0, total: 0 };
        byCashier[n].count++; byCashier[n].total += Number(s.total);
      }

      // By product
      const byProduct: Record<string, { name: string; category: string; qty: number; revenue: number; cost: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const key = item.productId;
          if (!byProduct[key]) byProduct[key] = { name: item.productName, category: item.product?.category?.name || "Uncategorised", qty: 0, revenue: 0, cost: 0 };
          byProduct[key].qty     += item.quantity;
          byProduct[key].revenue += Number(item.subtotal);
          byProduct[key].cost    += Number(item.costPrice) * item.quantity;
        }
      }

      // By category
      const byCategory: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const cat = item.product?.category?.name || "Uncategorised";
          if (!byCategory[cat]) byCategory[cat] = { name: cat, qty: 0, revenue: 0 };
          byCategory[cat].qty     += item.quantity;
          byCategory[cat].revenue += Number(item.subtotal);
        }
      }

      // By payment method
      const byMethod: Record<string, { count: number; total: number }> = {};
      for (const s of sales) {
        const m = s.paymentMethod || "CASH";
        if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
        byMethod[m].count++; byMethod[m].total += Number(s.total);
      }

      // Daily trend
      const byDay: Record<string, { date: string; count: number; revenue: number }> = {};
      for (const s of sales) {
        const d = s.createdAt.toISOString().split("T")[0];
        if (!byDay[d]) byDay[d] = { date: d, count: 0, revenue: 0 };
        byDay[d].count++; byDay[d].revenue += Number(s.total);
      }

      return NextResponse.json({
        data: {
          type,
          period:    { start: startDate, end: endDate },
          summary: {
            totalSales:    sales.length,
            totalRevenue,
            totalDiscount,
            totalTax,
            totalCost,
            grossProfit,
            profitMargin:  totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          },
          byCashier:   Object.values(byCashier).sort((a, b) => b.total - a.total),
          byProduct:   Object.values(byProduct).sort((a, b) => b.revenue - a.revenue),
          byCategory:  Object.values(byCategory).sort((a, b) => b.revenue - a.revenue),
          byMethod,
          byDay:       Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
          transactions: sales.map(s => ({
            id: s.id, receiptNumber: s.receiptNumber, createdAt: s.createdAt,
            total: Number(s.total), discount: Number(s.discount), tax: Number(s.tax),
            paymentMethod: s.paymentMethod, staffName: s.user?.name || "-",
            customerName: s.customerName || s.customer?.name || "-",
            itemCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
          })),
        },
      });
    }

    // ── INVENTORY REPORTS ──────────────────────────────────────────────
    if (type === "stock-current" || type === "stock-low" || type === "stock-out" || type === "stock-valuation") {
      const products = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      const filtered = type === "stock-low"
        ? products.filter(p => p.stock > 0 && p.stock <= p.minimumStock)
        : type === "stock-out"
        ? products.filter(p => p.stock === 0)
        : products;

      const totalValue  = filtered.reduce((s, p) => s + Number(p.costPrice) * p.stock, 0);
      const retailValue = filtered.reduce((s, p) => s + Number(p.sellingPrice) * p.stock, 0);

      return NextResponse.json({
        data: {
          type,
          period:    { start: startDate, end: endDate },
          summary:   { totalProducts: filtered.length, totalValue, retailValue, potentialProfit: retailValue - totalValue },
          products:  filtered.map(p => ({
            id: p.id, name: p.name, sku: p.sku, barcode: p.barcode,
            category: p.category?.name || "Uncategorised",
            stock: p.stock, minimumStock: p.minimumStock,
            costPrice: Number(p.costPrice), sellingPrice: Number(p.sellingPrice),
            stockValue: Number(p.costPrice) * p.stock,
            retailValue: Number(p.sellingPrice) * p.stock,
            status: p.stock === 0 ? "Out of Stock" : p.stock <= p.minimumStock ? "Low Stock" : "OK",
          })),
        },
      });
    }

    // ── PROFIT REPORTS ─────────────────────────────────────────────────
    if (type === "profit-gross" || type === "profit-net" || type === "profit-product") {
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: true, user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      const totalRevenue  = sales.reduce((s, x) => s + Number(x.total), 0);
      const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
      const totalTax      = sales.reduce((s, x) => s + Number(x.tax), 0);
      const totalCost     = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + Number(i.costPrice) * i.quantity, 0), 0);
      const grossProfit   = totalRevenue - totalCost;

      const byProduct: Record<string, { name: string; qty: number; revenue: number; cost: number; profit: number; margin: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const key = item.productId;
          if (!byProduct[key]) byProduct[key] = { name: item.productName, qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
          const itemRevenue = Number(item.subtotal);
          const itemCost    = Number(item.costPrice) * item.quantity;
          byProduct[key].qty     += item.quantity;
          byProduct[key].revenue += itemRevenue;
          byProduct[key].cost    += itemCost;
          byProduct[key].profit  += itemRevenue - itemCost;
        }
      }
      for (const p of Object.values(byProduct)) {
        p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      }

      return NextResponse.json({
        data: {
          type, period: { start: startDate, end: endDate },
          summary: { totalRevenue, totalDiscount, totalTax, totalCost, grossProfit, netProfit: grossProfit - totalDiscount, profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0 },
          byProduct: Object.values(byProduct).sort((a, b) => b.profit - a.profit),
        },
      });
    }

    // ── DISCOUNT REPORT ────────────────────────────────────────────────
    if (type === "discounts") {
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end }, discount: { gt: 0 } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
      return NextResponse.json({
        data: {
          type, period: { start: startDate, end: endDate },
          summary: { count: sales.length, totalDiscount, avgDiscount: sales.length > 0 ? totalDiscount / sales.length : 0 },
          transactions: sales.map(s => ({ id: s.id, receiptNumber: s.receiptNumber, createdAt: s.createdAt, total: Number(s.total), discount: Number(s.discount), staffName: s.user?.name || "-" })),
        },
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err) {
    console.error("[reports]", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
