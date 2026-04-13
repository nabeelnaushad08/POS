import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      seeded: userCount > 0,
      userCount,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", database: "disconnected", error: String(error) },
      { status: 500 }
    );
  }
}
