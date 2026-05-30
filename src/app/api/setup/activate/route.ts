import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateLicenseKey, extractDomain } from "@/lib/license";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, domain: bodyDomain } = body as { key: string; domain?: string };

    if (!key) {
      return NextResponse.json({ error: "License key is required" }, { status: 400 });
    }

    // Determine domain from request host if not provided
    const host = request.headers.get("host") || "localhost";
    const domain = bodyDomain ? extractDomain(bodyDomain) : extractDomain(host);

    const isValid = validateLicenseKey(key, domain);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid license key for this domain" },
        { status: 400 }
      );
    }

    // Upsert SystemSettings with license info
    const existing = await prisma.systemSettings.findFirst();
    if (existing) {
      await prisma.systemSettings.update({
        where: { id: existing.id },
        data: {
          licenseKey: key.trim().toUpperCase(),
          licenseActivatedAt: new Date(),
          licenseType: "ACTIVATED",
        },
      });
    } else {
      await prisma.systemSettings.create({
        data: {
          licenseKey: key.trim().toUpperCase(),
          licenseActivatedAt: new Date(),
          licenseType: "ACTIVATED",
        },
      });
    }

    // Set cookie in the response
    const response = NextResponse.json({ success: true });
    response.cookies.set("pos-licensed", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[setup/activate] error:", error);
    return NextResponse.json({ error: "Failed to activate license" }, { status: 500 });
  }
}
