interface WhatsAppOptions {
  to: string;
  message: string;
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith("AC")) return null;
  // Lazy require to avoid module-load errors
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require("twilio");
  return twilio(sid, token);
}

export async function sendWhatsApp({ to, message }: WhatsAppOptions) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("Twilio not configured, skipping WhatsApp notification");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
    const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    await client.messages.create({ from, to: toNumber, body: message });
    return { success: true };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, error };
  }
}

export function generateLowStockWhatsAppMessage(
  products: Array<{ name: string; sku: string; stock: number }>
): string {
  const productList = products
    .map((p) => `• ${p.name} (${p.sku}): ${p.stock} left`)
    .join("\n");
  return `⚠️ *Low Stock Alert*\n\nThe following products are running low:\n\n${productList}\n\nPlease restock soon.\n\n_POS System_`;
}

export function generateDailySummaryWhatsAppMessage(data: {
  date: string;
  totalTransactions: number;
  totalRevenue: number;
  totalProfit: number;
}): string {
  return `📊 *Daily Sales Summary*\n📅 ${data.date}\n\n💰 Revenue: $${data.totalRevenue.toFixed(2)}\n🛒 Transactions: ${data.totalTransactions}\n📈 Profit: $${data.totalProfit.toFixed(2)}\n\n_POS System_`;
}
