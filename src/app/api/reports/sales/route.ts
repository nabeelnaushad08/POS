import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate   = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        items: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const totalSales    = sales.length;
    const totalRevenue  = sales.reduce((s, x) => s + Number(x.total),    0);
    const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
    const totalCost     = sales.reduce((s, x) =>
      s + x.items.reduce((si, i) => si + Number(i.costPrice) * i.quantity, 0), 0);
    const grossProfit   = totalRevenue - totalCost;

    // Sales by payment method
    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const sale of sales) {
      const m = sale.paymentMethod || "CASH";
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
      byMethod[m].count++;
      byMethod[m].total += Number(sale.total);
    }

    // Top items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!itemMap[item.productId]) itemMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        itemMap[item.productId].qty     += item.quantity;
        itemMap[item.productId].revenue += Number(item.subtotal);
      }
    }
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        period: { start: startDate, end: endDate },
        totalSales,
        totalRevenue,
        totalDiscount,
        totalCost,
        grossProfit,
        profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        byMethod,
        topItems,
        sales: sales.map(s => ({
          id:            s.id,
          billNumber:    s.receiptNumber,
          createdAt:     s.createdAt,
          total:         Number(s.total),
          discount:      Number(s.discount),
          paymentMethod: s.paymentMethod,
          staffName:     s.user?.name || "-",
          itemCount:     s.items.reduce((sum, i) => sum + i.quantity, 0),
        })),
      },
    });
  } catch (err) {
    console.error("[reports/sales]", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
