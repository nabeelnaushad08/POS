import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assets = await prisma.asset.findMany({ orderBy: { purchaseDate: "desc" } });
  const totalCost  = assets.filter(a => a.isActive).reduce((s, a) => s + Number(a.purchaseCost), 0);
  const totalValue = assets.filter(a => a.isActive).reduce((s, a) => s + Number(a.currentValue), 0);
  return NextResponse.json({ data: assets, totalCost, totalValue });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const asset = await prisma.asset.create({ data: { name: body.name, type: body.type || "EQUIPMENT", purchaseCost: body.purchaseCost, currentValue: body.currentValue ?? body.purchaseCost, purchaseDate: new Date(body.purchaseDate), notes: body.notes || null } });
  return NextResponse.json({ data: asset }, { status: 201 });
}
