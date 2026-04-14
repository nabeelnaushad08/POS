import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const linkProductSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
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

    const supplierProducts = await prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            description: true,
            costPrice: true,
            sellingPrice: true,
            stock: true,
            minimumStock: true,
            unit: true,
            image: true,
            isActive: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: supplierProducts });
  } catch (error) {
    console.error("GET /api/suppliers/[id]/products error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch supplier products" }, { status: 500 });
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

    const result = linkProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const { productId } = result.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const supplierProduct = await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
      update: {},
      create: {
        supplierId,
        productId,
      },
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
    });

    return NextResponse.json({ success: true, data: supplierProduct }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/suppliers/[id]/products error:", error);
    return NextResponse.json({ success: false, error: "Failed to link product to supplier" }, { status: 500 });
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

    const { id: supplierId } = await params;

    const body = await request.json();

    const result = linkProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: result.error.issues },
        { status: 400 }
      );
    }

    const { productId } = result.data;

    const existing = await prisma.supplierProduct.findUnique({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product is not linked to this supplier" },
        { status: 404 }
      );
    }

    await prisma.supplierProduct.delete({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });

    return NextResponse.json({ success: true, data: { supplierId, productId }, message: "Product unlinked from supplier" });
  } catch (error) {
    console.error("DELETE /api/suppliers/[id]/products error:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink product from supplier" }, { status: 500 });
  }
}
