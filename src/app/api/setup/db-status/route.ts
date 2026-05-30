import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("[setup/db-status] error:", error);
    return NextResponse.json({ connected: false });
  }
}
