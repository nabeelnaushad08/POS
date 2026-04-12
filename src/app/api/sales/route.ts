import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateReceiptNumber } from "@/lib/utils";

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "At least one item required"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(["CASH", "CARD", "MIXED"]),
  cashAmount: z.number().optional().nullable(),
  cardAmount: z.number().optional().nullable(),
  change: z.number().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, Date>).lte = end;
      }
    }
    if (status) where.status = status;

    const role = (session.user as { role?: string })?.role;
    if (role === "CASHIER") {
      where.userId = (session.user as { id?: string })?.id;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      data: sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await request.json();
    const validated = saleSchema.parse(body);

    // Verify stock availability
    for (const item of validated.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 409 }
        );
      }
    }

    // Create sale in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const receiptNumber = generateReceiptNumber();

      // Create the sale
      const newSale = await tx.sale.create({
        data: {
          receiptNumber,
          userId,
          subtotal: validated.subtotal,
          discount: validated.discount,
          tax: validated.tax,
          total: validated.total,
          paymentMethod: validated.paymentMethod,
          cashAmount: validated.cashAmount,
          cardAmount: validated.cardAmount,
          change: validated.change,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          notes: validated.notes,
          items: {
            create: await Promise.all(
              validated.items.map(async (item) => {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                return {
                  productId: item.productId,
                  productName: product!.name,
                  sku: product!.sku,
                  quantity: item.quantity,
                  costPrice: item.costPrice,
                  unitPrice: item.unitPrice,
                  subtotal: item.quantity * item.unitPrice,
                };
              })
            ),
          },
        },
        include: {
          items: true,
          user: { select: { name: true, email: true } },
        },
      });

      // Deduct stock
      for (const item of validated.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newSale;
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "CREATE_SALE",
        entity: "Sale",
        entityId: sale.id,
        details: `Sale ${sale.receiptNumber} for $${sale.total}`,
      },
    }).catch(() => {});

    // Check for low stock after sale and create notifications
    for (const item of validated.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product && product.stock <= product.minimumStock) {
        await prisma.notification.create({
          data: {
            type: "LOW_STOCK",
            title: "Low Stock Alert",
            message: `${product.name} (${product.sku}) has only ${product.stock} units left (minimum: ${product.minimumStock})`,
            metadata: JSON.stringify({ productId: product.id, stock: product.stock }),
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("POST /api/sales error:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
