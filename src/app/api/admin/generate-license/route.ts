import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey, extractDomain } from "@/lib/license";

const MASTER_PASSWORD = process.env.ZENTHOZ_MASTER_PASSWORD || "zenthoz-admin-2024";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, masterPassword } = body as { domain: string; masterPassword: string };

    if (!domain || !masterPassword) {
      return NextResponse.json(
        { error: "domain and masterPassword are required" },
        { status: 400 }
      );
    }

    if (masterPassword !== MASTER_PASSWORD) {
      return NextResponse.json({ error: "Invalid master password" }, { status: 403 });
    }

    const normalizedDomain = extractDomain(domain);
    const licenseKey = generateLicenseKey(normalizedDomain);

    return NextResponse.json({ domain: normalizedDomain, licenseKey });
  } catch (error) {
    console.error("[admin/generate-license] error:", error);
    return NextResponse.json({ error: "Failed to generate license key" }, { status: 500 });
  }
}
