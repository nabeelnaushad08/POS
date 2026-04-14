import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePurchaseSchema = z.object({
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "RECEIVED", "PARTIAL", "CANCELLED"]).optional(),
  amountPaid: z.number().min(0).optional(),
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

    const { id } = await params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ success: false, error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error("GET /api/purchases/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch purchase" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Purchase not found" }, { status: 404 });
    }

    const body = await request.json();

    const parsed = {
      ...body,
      amountPaid: body.amountPaid !== undefined ? parseFloat(body.amountPaid) : undefined,
    };

    const result = updatePurchaseSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const validated = result.data;

    const updateData: Record<string, unknown> = {};
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.amountPaid !== undefined) updateData.amountPaid = validated.amountPaid;

    const purchase = await prisma.purchase.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        supplier: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PATCH /api/purchases/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update purchase" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ success: false, error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "CANCELLED" && purchase.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete a purchase with status "${purchase.status}". Only CANCELLED or PENDING purchases can be deleted.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.purchase.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Purchase deleted and stock reversed successfully",
    });
  } catch (error) {
    console.error("DELETE /api/purchases/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete purchase" }, { status: 500 });
  }
}
