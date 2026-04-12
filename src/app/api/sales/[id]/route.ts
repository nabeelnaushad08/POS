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
    const { status } = body;

    if (!["COMPLETED", "REFUNDED", "VOIDED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    // If voiding/refunding, restore stock
    if ((status === "VOIDED" || status === "REFUNDED") && sale.status === "COMPLETED") {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({ where: { id }, data: { status } });
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      });
    } else {
      await prisma.sale.update({ where: { id }, data: { status } });
    }

    const updated = await prisma.sale.findUnique({
      where: { id },
      include: { user: { select: { name: true } }, items: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}
