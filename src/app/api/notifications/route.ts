import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateLowStockEmailHtml, generateDailySummaryEmailHtml } from "@/lib/email";
import { sendWhatsApp, generateLowStockWhatsAppMessage, generateDailySummaryWhatsAppMessage } from "@/lib/whatsapp";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifications = await prisma.notification.findMany({
      where: unreadOnly ? { isRead: false } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, email, phone } = body;

    if (action === "send_low_stock_alert") {
      const lowStockProducts = await prisma.product.findMany({
        where: { isActive: true },
      });

      const lowStock = lowStockProducts.filter((p) => p.stock <= p.minimumStock);
      if (lowStock.length === 0) {
        return NextResponse.json({ message: "No low stock products" });
      }

      const products = lowStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        minimumStock: p.minimumStock,
      }));

      let emailSent = false;
      let whatsAppSent = false;

      if (email) {
        const result = await sendEmail({
          to: email,
          subject: "⚠️ Low Stock Alert - POS System",
          html: generateLowStockEmailHtml(products),
        });
        emailSent = result.success;
      }

      if (phone) {
        const result = await sendWhatsApp({
          to: phone,
          message: generateLowStockWhatsAppMessage(products),
        });
        whatsAppSent = result.success;
      }

      await prisma.notification.create({
        data: {
          type: "LOW_STOCK",
          title: "Low Stock Alert Sent",
          message: `Alert sent for ${lowStock.length} products`,
          sentEmail: emailSent,
          sentWhatsApp: whatsAppSent,
        },
      });

      return NextResponse.json({
        message: "Low stock alert sent",
        productsCount: lowStock.length,
        emailSent,
        whatsAppSent,
      });
    }

    if (action === "send_daily_summary") {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      const [todaySales, todayItems] = await Promise.all([
        prisma.sale.aggregate({
          where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
          _sum: { total: true },
          _count: { id: true },
        }),
        prisma.saleItem.findMany({
          where: { sale: { createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" } },
        }),
      ]);

      const totalRevenue = Number(todaySales._sum.total || 0);
      const totalCost = todayItems.reduce(
        (sum, i) => sum + Number(i.costPrice) * i.quantity,
        0
      );
      const totalProfit = totalRevenue - totalCost;

      const summaryData = {
        date: format(new Date(), "MMMM dd, yyyy"),
        totalSales: todaySales._count.id,
        totalTransactions: todaySales._count.id,
        totalRevenue,
        totalProfit,
      };

      let emailSent = false;
      let whatsAppSent = false;

      if (email) {
        const result = await sendEmail({
          to: email,
          subject: `📊 Daily Sales Summary - ${summaryData.date}`,
          html: generateDailySummaryEmailHtml(summaryData),
        });
        emailSent = result.success;
      }

      if (phone) {
        const result = await sendWhatsApp({
          to: phone,
          message: generateDailySummaryWhatsAppMessage(summaryData),
        });
        whatsAppSent = result.success;
      }

      await prisma.notification.create({
        data: {
          type: "DAILY_SUMMARY",
          title: "Daily Summary Sent",
          message: `Summary for ${summaryData.date}: $${totalRevenue.toFixed(2)} revenue`,
          sentEmail: emailSent,
          sentWhatsApp: whatsAppSent,
        },
      });

      return NextResponse.json({ message: "Daily summary sent", emailSent, whatsAppSent });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({ data: { isRead: true } });
    } else if (ids?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ message: "Notifications updated" });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
