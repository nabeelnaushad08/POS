import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BulkProduct {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock?: number;
  unit?: string;
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
    const { products }: { products: BulkProduct[] } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    const results = { created: 0, updated: 0, errors: [] as string[] };

    for (const product of products) {
      try {
        if (!product.name || !product.sku) {
          results.errors.push(`Missing name or SKU for row`);
          continue;
        }

        // Find or create category
        let categoryId: string | null = null;
        if (product.category) {
          const cat = await prisma.category.upsert({
            where: { name: product.category },
            update: {},
            create: { name: product.category },
          });
          categoryId = cat.id;
        }

        const existing = await prisma.product.findUnique({ where: { sku: product.sku } });

        if (existing) {
          await prisma.product.update({
            where: { sku: product.sku },
            data: {
              name: product.name,
              barcode: product.barcode || null,
              categoryId,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              stock: product.stock,
              minimumStock: product.minimumStock ?? 5,
              unit: product.unit || "pcs",
            },
          });
          results.updated++;
        } else {
          await prisma.product.create({
            data: {
              name: product.name,
              sku: product.sku,
              barcode: product.barcode || null,
              categoryId,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              stock: product.stock,
              minimumStock: product.minimumStock ?? 5,
              unit: product.unit || "pcs",
            },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Error processing ${product.sku}: ${err}`);
      }
    }

    return NextResponse.json({ message: "Bulk import completed", results });
  } catch (error) {
    console.error("POST /api/products/bulk error:", error);
    return NextResponse.json({ error: "Failed to bulk import products" }, { status: 500 });
  }
}
