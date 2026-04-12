import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@pos.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@pos.com",
      password: adminPassword,
      role: "ADMIN",
      phone: "+1234567890",
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash("manager123", 12);
  await prisma.user.upsert({
    where: { email: "manager@pos.com" },
    update: {},
    create: {
      name: "Store Manager",
      email: "manager@pos.com",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create cashier user
  const cashierPassword = await bcrypt.hash("cashier123", 12);
  await prisma.user.upsert({
    where: { email: "cashier@pos.com" },
    update: {},
    create: {
      name: "Cashier One",
      email: "cashier@pos.com",
      password: cashierPassword,
      role: "CASHIER",
    },
  });

  // Create categories
  const categories = [
    { name: "Beverages", description: "Drinks and beverages", color: "#3b82f6" },
    { name: "Snacks", description: "Chips, crackers, and snacks", color: "#f59e0b" },
    { name: "Dairy", description: "Milk, cheese, and dairy products", color: "#10b981" },
    { name: "Bakery", description: "Bread, pastries, and baked goods", color: "#ef4444" },
    { name: "Produce", description: "Fresh fruits and vegetables", color: "#84cc16" },
    { name: "Electronics", description: "Electronic gadgets and accessories", color: "#8b5cf6" },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = created.id;
  }

  // Create sample products
  const products = [
    {
      name: "Coca Cola 330ml",
      sku: "BEV-001",
      barcode: "5449000000996",
      categoryId: createdCategories["Beverages"],
      costPrice: 0.5,
      sellingPrice: 1.5,
      stock: 100,
      minimumStock: 20,
      unit: "can",
    },
    {
      name: "Pepsi 330ml",
      sku: "BEV-002",
      barcode: "5449000000997",
      categoryId: createdCategories["Beverages"],
      costPrice: 0.5,
      sellingPrice: 1.5,
      stock: 80,
      minimumStock: 20,
      unit: "can",
    },
    {
      name: "Water Bottle 500ml",
      sku: "BEV-003",
      barcode: "5449000000998",
      categoryId: createdCategories["Beverages"],
      costPrice: 0.2,
      sellingPrice: 0.75,
      stock: 200,
      minimumStock: 50,
      unit: "bottle",
    },
    {
      name: "Lays Classic Chips",
      sku: "SNK-001",
      barcode: "5449000001001",
      categoryId: createdCategories["Snacks"],
      costPrice: 0.8,
      sellingPrice: 2.0,
      stock: 60,
      minimumStock: 15,
      unit: "pcs",
    },
    {
      name: "Doritos Nacho",
      sku: "SNK-002",
      barcode: "5449000001002",
      categoryId: createdCategories["Snacks"],
      costPrice: 1.0,
      sellingPrice: 2.5,
      stock: 8,
      minimumStock: 15,
      unit: "pcs",
    },
    {
      name: "Whole Milk 1L",
      sku: "DAI-001",
      barcode: "5449000001010",
      categoryId: createdCategories["Dairy"],
      costPrice: 0.8,
      sellingPrice: 1.8,
      stock: 40,
      minimumStock: 10,
      unit: "liter",
    },
    {
      name: "Cheddar Cheese 200g",
      sku: "DAI-002",
      barcode: "5449000001011",
      categoryId: createdCategories["Dairy"],
      costPrice: 2.0,
      sellingPrice: 4.5,
      stock: 3,
      minimumStock: 8,
      unit: "pcs",
    },
    {
      name: "White Bread Loaf",
      sku: "BAK-001",
      barcode: "5449000001020",
      categoryId: createdCategories["Bakery"],
      costPrice: 1.0,
      sellingPrice: 2.5,
      stock: 25,
      minimumStock: 10,
      unit: "loaf",
    },
    {
      name: "Croissant",
      sku: "BAK-002",
      barcode: "5449000001021",
      categoryId: createdCategories["Bakery"],
      costPrice: 0.5,
      sellingPrice: 1.5,
      stock: 12,
      minimumStock: 5,
      unit: "pcs",
    },
    {
      name: "USB-C Cable 1m",
      sku: "ELC-001",
      barcode: "5449000001030",
      categoryId: createdCategories["Electronics"],
      costPrice: 3.0,
      sellingPrice: 9.99,
      stock: 50,
      minimumStock: 10,
      unit: "pcs",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log("✅ Seed completed!");
  console.log("👤 Admin: admin@pos.com / admin123");
  console.log("👤 Manager: manager@pos.com / manager123");
  console.log("👤 Cashier: cashier@pos.com / cashier123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
