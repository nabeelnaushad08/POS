import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const body = await request.json();
  const inv = await prisma.investment.update({ where: { id }, data: { title: body.title, type: body.type, amount: body.amount, date: body.date ? new Date(body.date) : undefined, description: body.description } });
  return NextResponse.json({ data: inv });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.investment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
