import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  id: "system",
  systemName: "POS System",
  logo: null,
  currency: "LKR",
  currencySymbol: "Rs.",
  timezone: "Asia/Colombo",
  taxRate: 0,
  theme: "light",
  address: null,
  phone: null,
  email: null,
};

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: DEFAULTS });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: true, data: DEFAULTS });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const allowed = ["systemName", "logo", "currency", "currencySymbol", "timezone", "taxRate", "theme", "address", "phone", "email"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const existing = await prisma.systemSettings.findFirst();
    let settings;
    if (existing) {
      settings = await prisma.systemSettings.update({ where: { id: existing.id }, data });
    } else {
      settings = await prisma.systemSettings.create({ data: { ...DEFAULTS, ...data } });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
