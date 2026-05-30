import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Salaries",            color: "#f59e0b" },
  { name: "Supplier Payments",   color: "#3b82f6" },
  { name: "Rent",                color: "#8b5cf6" },
  { name: "Electricity",         color: "#f97316" },
  { name: "Water",               color: "#06b6d4" },
  { name: "Internet",            color: "#10b981" },
  { name: "Transport",           color: "#6366f1" },
  { name: "Fuel",                color: "#ef4444" },
  { name: "Repairs",             color: "#84cc16" },
  { name: "Equipment",           color: "#ec4899" },
  { name: "Marketing",           color: "#14b8a6" },
  { name: "Tax",                 color: "#f43f5e" },
  { name: "Miscellaneous",       color: "#94a3b8" },
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Ensure defaults exist
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.expenseCategory.upsert({ where: { name: cat.name }, create: { ...cat, isDefault: true }, update: {} });
  }
  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: categories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const cat = await prisma.expenseCategory.create({ data: { name: body.name, color: body.color || "#6366f1" } });
  return NextResponse.json({ data: cat }, { status: 201 });
}
