import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0, "Unit cost must be non-negative"),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

function generatePurchaseNumber(count: number): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const sequence = String(count + 1).padStart(4, "0");
  return `PO-${year}${month}${day}-${sequence}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: purchases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/purchases error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = {
      ...body,
      discount: body.discount !== undefined ? parseFloat(body.discount) : 0,
      items: Array.isArray(body.items)
        ? body.items.map((item: Record<string, unknown>) => ({
            ...item,
            quantity: item.quantity !== undefined ? parseInt(String(item.quantity)) : undefined,
            unitCost: item.unitCost !== undefined ? parseFloat(String(item.unitCost)) : undefined,
          }))
        : body.items,
    };

    const result = createPurchaseSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const validated = result.data;

    const supplier = await prisma.supplier.findUnique({ where: { id: validated.supplierId } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const subtotal = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const total = subtotal - validated.discount;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.purchase.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const purchaseNumber = generatePurchaseNumber(todayCount);

    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: validated.supplierId,
          userId,
          subtotal,
          discount: validated.discount,
          total,
          amountPaid: 0,
          status: "RECEIVED",
          notes: validated.notes ?? null,
        },
      });

      await tx.purchaseItem.createMany({
        data: validated.items.map((item) => ({
          purchaseId: newPurchase.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: item.quantity * item.unitCost,
        })),
      });

      for (const item of validated.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const fullPurchase = await tx.purchase.findUnique({
        where: { id: newPurchase.id },
        include: {
          items: true,
          supplier: {
            select: { id: true, name: true, contactPerson: true, phone: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });

      return fullPurchase;
    });

    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/purchases error:", error);
    return NextResponse.json({ success: false, error: "Failed to create purchase" }, { status: 500 });
  }
}
