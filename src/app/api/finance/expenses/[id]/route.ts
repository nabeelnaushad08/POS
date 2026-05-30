import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const body = await request.json();
  const expense = await prisma.expense.update({ where: { id }, data: { title: body.title, amount: body.amount, categoryId: body.categoryId || null, date: body.date ? new Date(body.date) : undefined, paymentMethod: body.paymentMethod, reference: body.reference, notes: body.notes, receipt: body.receipt }, include: { category: true } });
  return NextResponse.json({ data: expense });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
