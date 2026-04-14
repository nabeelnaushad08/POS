import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["CASH", "CARD", "MIXED"]),
  purchaseId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: supplierId } = await params;

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const payments = await prisma.supplierPayment.findMany({
      where: { supplierId },
      include: {
        purchase: {
          select: {
            purchaseNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("GET /api/suppliers/[id]/payments error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch supplier payments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: supplierId } = await params;

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();

    const parsed = {
      ...body,
      amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
    };

    const result = createPaymentSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const validated = result.data;

    if (validated.purchaseId) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: validated.purchaseId },
      });
      if (!purchase) {
        return NextResponse.json({ success: false, error: "Purchase not found" }, { status: 404 });
      }
      if (purchase.supplierId !== supplierId) {
        return NextResponse.json(
          { success: false, error: "Purchase does not belong to this supplier" },
          { status: 400 }
        );
      }
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        supplierId,
        purchaseId: validated.purchaseId ?? null,
        amount: validated.amount,
        method: validated.method,
        notes: validated.notes ?? null,
      },
      include: {
        purchase: {
          select: {
            purchaseNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/suppliers/[id]/payments error:", error);
    return NextResponse.json({ success: false, error: "Failed to create payment" }, { status: 500 });
  }
}
