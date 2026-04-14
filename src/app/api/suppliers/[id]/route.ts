import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            purchases: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stock: true,
                sellingPrice: true,
                costPrice: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error("GET /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch supplier" }, { status: 500 });
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

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();

    const result = updateSupplierSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const validated = result.data;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: validated,
      include: {
        _count: {
          select: {
            products: true,
            purchases: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PATCH /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update supplier" }, { status: 500 });
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    const message =
      supplier._count.purchases > 0
        ? "Supplier has purchase history and has been deactivated"
        : "Supplier has been deactivated";

    return NextResponse.json({ success: true, data: updated, message });
  } catch (error) {
    console.error("DELETE /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete supplier" }, { status: 500 });
  }
}
