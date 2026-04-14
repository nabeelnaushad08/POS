import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PrinterDefaults = {
  type: string;
  paperSize: string;
  headerTitle: string;
  showLogo: boolean;
  footer: string;
  showFooter: boolean;
  copies: number;
  logo?: string | null;
};

const DEFAULTS: Record<string, PrinterDefaults> = {
  POS: { type: "POS", paperSize: "80mm", headerTitle: "Sales Receipt", showLogo: false, footer: "Thank you for your purchase!", showFooter: true, copies: 1 },
  PURCHASE: { type: "PURCHASE", paperSize: "80mm", headerTitle: "Purchase Order", showLogo: false, footer: "Authorized Signature: ____________", showFooter: true, copies: 1 },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const t = type.toUpperCase();
    let settings = await prisma.printerSettings.findUnique({ where: { type: t } });
    if (!settings) {
      settings = await prisma.printerSettings.create({ data: DEFAULTS[t] ?? DEFAULTS.POS });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET /api/printer-settings error:", error);
    const { type } = await params;
    return NextResponse.json({ success: true, data: DEFAULTS[type.toUpperCase()] ?? DEFAULTS.POS });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as { role?: string })?.role;
    if (!["ADMIN", "MANAGER"].includes(role || "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await params;
    const t = type.toUpperCase();
    const body = await request.json();
    const allowed = ["printerName", "paperSize", "headerTitle", "logo", "showLogo", "footer", "showFooter", "copies"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const settings = await prisma.printerSettings.upsert({
      where: { type: t },
      update: data,
      create: { ...(DEFAULTS[t] ?? DEFAULTS.POS), ...data, type: t },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("PATCH /api/printer-settings error:", error);
    return NextResponse.json({ error: "Failed to update printer settings" }, { status: 500 });
  }
}
