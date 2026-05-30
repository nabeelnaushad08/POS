import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const records = await prisma.attendance.findMany({
    where: { employeeId: id, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ data: records });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const date = new Date(body.date);
  date.setHours(0, 0, 0, 0);
  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: id, date } },
    create: { employeeId: id, date, checkIn: body.checkIn ? new Date(body.checkIn) : null, checkOut: body.checkOut ? new Date(body.checkOut) : null, status: body.status || "PRESENT", notes: body.notes },
    update: { checkIn: body.checkIn ? new Date(body.checkIn) : undefined, checkOut: body.checkOut ? new Date(body.checkOut) : undefined, status: body.status || undefined, notes: body.notes },
  });
  return NextResponse.json({ data: record });
}
