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

    if (type === "customers") {
      const sales = await prisma.sale.findMany({
        where: {
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          status: "COMPLETED",
          customerId: { not: null },
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          customerId: true,
          customerName: true,
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      // Also include walk-in sales grouped by customerName
      const walkinSales = await prisma.sale.findMany({
        where: {
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          status: "COMPLETED",
          customerId: null,
          customerName: { not: null },
        },
        select: { id: true, total: true, createdAt: true, customerName: true },
      });

      // Group by customer
      const customerMap = new Map<string, {
        id: string | null; name: string; phone?: string | null; email?: string | null;
        totalSpend: number; transactions: number; lastPurchase: string;
      }>();

      for (const s of sales) {
        const key = s.customerId || s.customerName || "Unknown";
        const existing = customerMap.get(key);
        if (existing) {
          existing.totalSpend += Number(s.total);
          existing.transactions += 1;
          if (s.createdAt > new Date(existing.lastPurchase)) existing.lastPurchase = s.createdAt.toISOString();
        } else {
          customerMap.set(key, {
            id: s.customerId,
            name: s.customer?.name || s.customerName || "Unknown",
            phone: s.customer?.phone,
            email: s.customer?.email,
            totalSpend: Number(s.total),
            transactions: 1,
            lastPurchase: s.createdAt.toISOString(),
          });
        }
      }

      for (const s of walkinSales) {
        const key = s.customerName || "Walk-in";
        const existing = customerMap.get(key);
        if (existing) {
          existing.totalSpend += Number(s.total);
          existing.transactions += 1;
          if (s.createdAt > new Date(existing.lastPurchase)) existing.lastPurchase = s.createdAt.toISOString();
        } else {
          customerMap.set(key, {
            id: null,
            name: s.customerName || "Walk-in",
            totalSpend: Number(s.total),
            transactions: 1,
            lastPurchase: s.createdAt.toISOString(),
          });
        }
      }

      const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
      const totalCustomers = customers.length;
      const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);
      const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const topCustomer = customers[0] || null;

      return NextResponse.json({
        customers,
        summary: { totalCustomers, totalRevenue, avgSpend, topCustomer },
      });
    }

    if (type === "suppliers") {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { purchases: true } },
        },
        orderBy: { name: "asc" },
      });

      // Get aggregates for each supplier
      const [purchaseAggs, paymentAggs] = await Promise.all([
        prisma.purchase.groupBy({
          by: ["supplierId"],
          where: startDate || endDate ? { createdAt: dateFilter } : undefined,
          _sum: { total: true },
          _count: { id: true },
        }),
        prisma.supplierPayment.groupBy({
          by: ["supplierId"],
          _sum: { amount: true },
        }),
      ]);

      const purchaseMap = new Map(purchaseAggs.map((p) => [p.supplierId, p]));
      const paymentMap = new Map(paymentAggs.map((p) => [p.supplierId, p]));

      const supplierData = suppliers.map((s) => {
        const pa = purchaseMap.get(s.id);
        const py = paymentMap.get(s.id);
        const totalPurchased = Number(pa?._sum.total ?? 0);
        const totalPaid = Number(py?._sum.amount ?? 0);
        return {
          id: s.id,
          name: s.name,
          contactPerson: s.contactPerson,
          phone: s.phone,
          purchaseCount: pa?._count.id ?? 0,
          totalPurchased,
          totalPaid,
          balance: totalPurchased - totalPaid,
        };
      }).sort((a, b) => b.totalPurchased - a.totalPurchased);

      const totalPurchased = supplierData.reduce((s, c) => s + c.totalPurchased, 0);
      const totalPaid = supplierData.reduce((s, c) => s + c.totalPaid, 0);
      const totalBalance = supplierData.reduce((s, c) => s + c.balance, 0);

      return NextResponse.json({
        suppliers: supplierData,
        summary: { totalSuppliers: supplierData.length, totalPurchased, totalPaid, totalBalance },
      });
    }

    if (type === "products") {
      const saleItems = await prisma.saleItem.findMany({
        where: {
          sale: {
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
            status: "COMPLETED",
          },
        },
        select: {
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          costPrice: true,
          subtotal: true,
        },
      });

      // Group by product
      const productMap = new Map<string, {
        productId: string | null; name: string;
        unitsSold: number; revenue: number; cost: number; profit: number;
      }>();

      for (const item of saleItems) {
        const key = item.productId || item.productName;
        const existing = productMap.get(key);
        const revenue = Number(item.subtotal);
        const cost = Number(item.costPrice) * item.quantity;
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += revenue;
          existing.cost += cost;
          existing.profit += revenue - cost;
        } else {
          productMap.set(key, {
            productId: item.productId,
            name: item.productName,
            unitsSold: item.quantity,
            revenue,
            cost,
            profit: revenue - cost,
          });
        }
      }

      const products = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
      const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
      const totalProfit = products.reduce((s, p) => s + p.profit, 0);
      const totalUnitsSold = products.reduce((s, p) => s + p.unitsSold, 0);
      const topProduct = products[0] || null;

      return NextResponse.json({
        products,
        summary: { totalProducts: products.length, totalRevenue, totalProfit, totalUnitsSold, topProduct },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
