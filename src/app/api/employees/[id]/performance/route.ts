import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const notes = await prisma.performanceNote.findMany({ where: { employeeId: id }, orderBy: { date: "desc" } });
  return NextResponse.json({ data: notes });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const note = await prisma.performanceNote.create({
    data: { employeeId: id, type: body.type || "NOTE", title: body.title, description: body.description, date: body.date ? new Date(body.date) : new Date() },
  });
  return NextResponse.json({ data: note }, { status: 201 });
}
