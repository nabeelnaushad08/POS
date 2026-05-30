import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start"); const end = searchParams.get("end");
  const categoryId = searchParams.get("categoryId");
  const page  = parseInt(searchParams.get("page")  || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const where: Record<string, unknown> = {};
  if (start || end) {
    where.date = {};
    if (start) (where.date as Record<string, unknown>).gte = new Date(start);
    if (end)   { const e = new Date(end); e.setHours(23,59,59,999); (where.date as Record<string, unknown>).lte = e; }
  }
  if (categoryId) where.categoryId = categoryId;
  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, include: { category: true }, orderBy: { date: "desc" }, skip: (page-1)*limit, take: limit }),
    prisma.expense.count({ where }),
  ]);
  const sum = await prisma.expense.aggregate({ where, _sum: { amount: true } });
  return NextResponse.json({ data: items, total, totalAmount: Number(sum._sum.amount || 0) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const expense = await prisma.expense.create({
    data: { title: body.title, amount: body.amount, categoryId: body.categoryId || null, date: body.date ? new Date(body.date) : new Date(), paymentMethod: body.paymentMethod || "CASH", reference: body.reference || null, notes: body.notes || null, receipt: body.receipt || null },
    include: { category: true },
  });
  return NextResponse.json({ data: expense }, { status: 201 });
}
