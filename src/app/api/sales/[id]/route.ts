import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: { product: { select: { name: true, image: true } } },
        },
      },
    });

    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    return NextResponse.json({ data: sale });
  } catch (error) {
    console.error("GET /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch sale" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if ("notes" in body) updateData.notes = body.notes ?? null;
    if ("customerName" in body) updateData.customerName = body.customerName ?? null;
    if ("customerPhone" in body) updateData.customerPhone = body.customerPhone ?? null;
    if ("customerId" in body) updateData.customerId = body.customerId ?? null;

    if ("status" in body) {
      const { status } = body;
      if (!["COMPLETED", "REFUNDED", "VOIDED"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if ((status === "VOIDED" || status === "REFUNDED") && sale.status === "COMPLETED") {
        await prisma.$transaction(async (tx) => {
          await tx.sale.update({ where: { id }, data: { status, ...updateData } });
          for (const item of sale.items) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          }
        });
        const updated = await prisma.sale.findUnique({ where: { id }, include: { user: { select: { name: true } }, items: true } });
        return NextResponse.json({ data: updated });
      }
      updateData.status = status;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: { user: { select: { name: true } }, items: true },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (sale.status === "COMPLETED") {
        for (const item of sale.items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Sale deleted and stock restored" });
  } catch (error) {
    console.error("DELETE /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
  }
}
