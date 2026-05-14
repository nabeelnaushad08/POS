import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const existingUsers = await prisma.user.count();

    const [adminPass, managerPass, cashierPass] = await Promise.all([
      bcrypt.hash("admin123", 12),
      bcrypt.hash("manager123", 12),
      bcrypt.hash("cashier123", 12),
    ]);

    const logins = [
      { role: "Admin",   email: "admin@pos.com",   password: "admin123"   },
      { role: "Manager", email: "manager@pos.com", password: "manager123" },
      { role: "Cashier", email: "cashier@pos.com", password: "cashier123" },
    ];

    // ── Force-reset passwords for existing users ───────────────────────────
    if (existingUsers > 0 && force) {
      await Promise.all([
        prisma.user.updateMany({ where: { email: "admin@pos.com" },   data: { password: adminPass,   isActive: true } }),
        prisma.user.updateMany({ where: { email: "manager@pos.com" }, data: { password: managerPass, isActive: true } }),
        prisma.user.updateMany({ where: { email: "cashier@pos.com" }, data: { password: cashierPass, isActive: true } }),
      ]);
      return NextResponse.json({ success: true, message: "Passwords reset successfully!", logins });
    }

    if (existingUsers > 0) {
      return NextResponse.json({
        success: false,
        message: "Database already seeded. Use /api/seed?force=true to reset passwords.",
        users: existingUsers,
      });
    }

    // ── Users ──────────────────────────────────────────────────────────────
    await prisma.user.createMany({
      data: [
        { name: "Admin User",    email: "admin@pos.com",    password: adminPass,   role: "ADMIN",   phone: "+1234567890" },
        { name: "Store Manager", email: "manager@pos.com",  password: managerPass, role: "MANAGER" },
        { name: "Cashier One",   email: "cashier@pos.com",  password: cashierPass, role: "CASHIER" },
      ],
    });

    // ── Categories ─────────────────────────────────────────────────────────
    const categoryData = [
      { name: "Beverages",   description: "Drinks and beverages",            color: "#3b82f6" },
      { name: "Snacks",      description: "Chips, crackers, and snacks",     color: "#f59e0b" },
      { name: "Dairy",       description: "Milk, cheese, and dairy products",color: "#10b981" },
      { name: "Bakery",      description: "Bread, pastries, and baked goods",color: "#ef4444" },
      { name: "Produce",     description: "Fresh fruits and vegetables",     color: "#84cc16" },
      { name: "Electronics", description: "Electronic gadgets and accessories", color: "#8b5cf6" },
    ];

    await prisma.category.createMany({ data: categoryData });

    const categories = await prisma.category.findMany();
    const cat = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    // ── Products ───────────────────────────────────────────────────────────
    await prisma.product.createMany({
      data: [
        { name: "Coca Cola 330ml",    sku: "BEV-001", barcode: "5449000000996", categoryId: cat["Beverages"],   costPrice: 0.5,  sellingPrice: 1.5,  stock: 100, minimumStock: 20, unit: "can"    },
        { name: "Pepsi 330ml",        sku: "BEV-002", barcode: "5449000000997", categoryId: cat["Beverages"],   costPrice: 0.5,  sellingPrice: 1.5,  stock: 80,  minimumStock: 20, unit: "can"    },
        { name: "Water Bottle 500ml", sku: "BEV-003", barcode: "5449000000998", categoryId: cat["Beverages"],   costPrice: 0.2,  sellingPrice: 0.75, stock: 200, minimumStock: 50, unit: "bottle" },
        { name: "Lays Classic Chips", sku: "SNK-001", barcode: "5449000001001", categoryId: cat["Snacks"],      costPrice: 0.8,  sellingPrice: 2.0,  stock: 60,  minimumStock: 15, unit: "pcs"    },
        { name: "Doritos Nacho",      sku: "SNK-002", barcode: "5449000001002", categoryId: cat["Snacks"],      costPrice: 1.0,  sellingPrice: 2.5,  stock: 8,   minimumStock: 15, unit: "pcs"    },
        { name: "Whole Milk 1L",      sku: "DAI-001", barcode: "5449000001010", categoryId: cat["Dairy"],       costPrice: 0.8,  sellingPrice: 1.8,  stock: 40,  minimumStock: 10, unit: "liter"  },
        { name: "Cheddar Cheese 200g",sku: "DAI-002", barcode: "5449000001011", categoryId: cat["Dairy"],       costPrice: 2.0,  sellingPrice: 4.5,  stock: 3,   minimumStock: 8,  unit: "pcs"    },
        { name: "White Bread Loaf",   sku: "BAK-001", barcode: "5449000001020", categoryId: cat["Bakery"],      costPrice: 1.0,  sellingPrice: 2.5,  stock: 25,  minimumStock: 10, unit: "loaf"   },
        { name: "Croissant",          sku: "BAK-002", barcode: "5449000001021", categoryId: cat["Bakery"],      costPrice: 0.5,  sellingPrice: 1.5,  stock: 12,  minimumStock: 5,  unit: "pcs"    },
        { name: "USB-C Cable 1m",     sku: "ELC-001", barcode: "5449000001030", categoryId: cat["Electronics"], costPrice: 3.0,  sellingPrice: 9.99, stock: 50,  minimumStock: 10, unit: "pcs"    },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      created: { users: 3, categories: categoryData.length, products: 10 },
      logins,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
