import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const body = await request.json();
  const asset = await prisma.asset.update({ where: { id }, data: { name: body.name, type: body.type, purchaseCost: body.purchaseCost, currentValue: body.currentValue, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined, notes: body.notes, isActive: body.isActive } });
  return NextResponse.json({ data: asset });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.asset.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
