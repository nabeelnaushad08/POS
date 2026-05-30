import crypto from "crypto";

// IMPORTANT: This secret must never be changed after deployment
const LICENSE_SECRET = "ZENTHOZ-POS-2024-0779067747-SECRET-KEY";

export function generateLicenseKey(domain: string): string {
  const normalized = domain.replace(/^www\./i, "").toLowerCase().trim();
  const hash = crypto.createHmac("sha256", LICENSE_SECRET)
    .update(normalized)
    .digest("hex");
  const h = hash.toUpperCase();
  return `ZPOS-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

export function validateLicenseKey(key: string, domain: string): boolean {
  const expected = generateLicenseKey(domain);
  return key.trim().toUpperCase() === expected;
}

export function extractDomain(host: string): string {
  return (host || "").split(":")[0].replace(/^www\./i, "").toLowerCase().trim();
}
