// Generate a unique 12-digit numeric barcode (Code128 compatible)
// Format: 200 + 9 random/sequential digits (200xxx series = in-store use)
export function generateProductBarcode(productIndex: number): string {
  const base = String(productIndex).padStart(9, "0");
  return `200${base}`;
}

// Calculate EAN-13 check digit
export function ean13CheckDigit(first12: string): string {
  const digits = first12.split("").map(Number);
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return String(check);
}

// Generate EAN-13 from 12-digit base
export function toEAN13(base12: string): string {
  return base12 + ean13CheckDigit(base12);
}
