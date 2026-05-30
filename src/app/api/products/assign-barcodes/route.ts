import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProductBarcode } from "@/lib/barcode-utils";

// POST — finds all products with no barcode, assigns unique barcode numbers
export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all products without barcodes
    const productsWithoutBarcode = await prisma.product.findMany({
      where: { barcode: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (productsWithoutBarcode.length === 0) {
      return NextResponse.json({ updated: 0, message: "All products already have barcodes" });
    }

    // Get the current total product count for generating unique base numbers
    const totalCount = await prisma.product.count();

    let updated = 0;
    let index = totalCount;

    for (const product of productsWithoutBarcode) {
      // Find a unique barcode
      let candidate = generateProductBarcode(index);
      let attempts = 0;
      while (await prisma.product.findUnique({ where: { barcode: candidate } })) {
        attempts++;
        candidate = generateProductBarcode(index + attempts);
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { barcode: candidate },
      });

      index++;
      updated++;
    }

    return NextResponse.json({ updated, message: `Assigned barcodes to ${updated} product(s)` });
  } catch (error) {
    console.error("POST /api/products/assign-barcodes error:", error);
    return NextResponse.json({ error: "Failed to assign barcodes" }, { status: 500 });
  }
}
