import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      todaySales,
      weekSales,
      monthSales,
      totalProducts,
      allProducts,
      recentSales,
      topProductsRaw,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: weekStart, lte: weekEnd }, status: "COMPLETED" },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, stock: true, minimumStock: true },
      }),
      prisma.sale.findMany({
        where: { status: "COMPLETED" },
        include: { user: { select: { name: true } }, items: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.saleItem.groupBy({
        by: ["productId", "productName"],
        where: {
          sale: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "COMPLETED",
          },
        },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.minimumStock);

    // Build 30-day sales chart
    const salesChart = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const daySales = await prisma.sale.aggregate({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: "COMPLETED",
        },
        _sum: { total: true },
        _count: { id: true },
      });
      salesChart.push({
        date: format(date, "MMM dd"),
        revenue: Number(daySales._sum.total || 0),
        transactions: daySales._count.id,
      });
    }

    return NextResponse.json({
      todayRevenue: Number(todaySales._sum.total || 0),
      todayTransactions: todaySales._count.id,
      weekRevenue: Number(weekSales._sum.total || 0),
      monthRevenue: Number(monthSales._sum.total || 0),
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      topProducts: topProductsRaw.map((p) => ({
        id: p.productId,
        name: p.productName,
        totalQuantity: Number(p._sum.quantity || 0),
        totalRevenue: Number(p._sum.subtotal || 0),
      })),
      recentSales,
      salesChart,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
