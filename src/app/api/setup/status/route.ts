import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    const dbOk = true;

    // Check license
    const settings = await prisma.systemSettings.findFirst();
    const licensed = !!(settings?.licenseKey && settings.licenseType === "ACTIVATED");

    // Check if any users exist
    const userCount = await prisma.user.count();
    const hasAdmin = userCount > 0;

    return NextResponse.json({ dbOk, licensed, hasAdmin });
  } catch {
    return NextResponse.json({ dbOk: false, licensed: false, hasAdmin: false });
  }
}
