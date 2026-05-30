import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const investments = await prisma.investment.findMany({ orderBy: { date: "desc" } });
  const total = investments.reduce((s, i) => s + Number(i.amount), 0);
  return NextResponse.json({ data: investments, total });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const inv = await prisma.investment.create({ data: { title: body.title, type: body.type || "INITIAL", amount: body.amount, date: body.date ? new Date(body.date) : new Date(), description: body.description || null } });
  return NextResponse.json({ data: inv }, { status: 201 });
}
