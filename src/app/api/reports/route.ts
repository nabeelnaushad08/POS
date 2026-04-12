import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = startOfDay(new Date(startDate));
    if (endDate) dateFilter.lte = endOfDay(new Date(endDate));

    if (type === "sales") {
      const sales = await prisma.sale.findMany({
        where: {
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          status: "COMPLETED",
        },
        include: {
          user: { select: { name: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0);
      const totalTax = sales.reduce((sum, s) => sum + Number(s.tax), 0);
      const totalTransactions = sales.length;

      return NextResponse.json({
        sales,
        summary: { totalRevenue, totalDiscount, totalTax, totalTransactions },
      });
    }

    if (type === "profit") {
      const saleItems = await prisma.saleItem.findMany({
        where: {
          sale: {
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
            status: "COMPLETED",
          },
        },
        include: {
          sale: { select: { createdAt: true, receiptNumber: true } },
          product: { select: { name: true, sku: true } },
        },
      });

      const totalRevenue = saleItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const totalCost = saleItems.reduce((sum, i) => sum + Number(i.costPrice) * i.quantity, 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return NextResponse.json({
        items: saleItems,
        summary: { totalRevenue, totalCost, totalProfit, profitMargin },
      });
    }

    if (type === "inventory") {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: "asc" },
      });

      const totalValue = products.reduce(
        (sum, p) => sum + Number(p.costPrice) * p.stock,
        0
      );
      const totalRetailValue = products.reduce(
        (sum, p) => sum + Number(p.sellingPrice) * p.stock,
        0
      );
      const lowStockItems = products.filter((p) => p.stock <= p.minimumStock);
      const outOfStock = products.filter((p) => p.stock === 0);

      return NextResponse.json({
        products,
        summary: {
          totalProducts: products.length,
          totalValue,
          totalRetailValue,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStock.length,
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
