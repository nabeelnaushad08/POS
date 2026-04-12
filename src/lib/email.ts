import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "POS System <noreply@pos.com>",
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export function generateLowStockEmailHtml(products: Array<{ name: string; sku: string; stock: number; minimumStock: number }>) {
  const rows = products
    .map(
      (p) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${p.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${p.sku}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: ${p.stock === 0 ? "#ef4444" : "#f59e0b"}; font-weight: bold;">${p.stock}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${p.minimumStock}</td>
      </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">POS Inventory Management System</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <p style="color: #374151;">The following products are running low on stock:</p>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Product</th>
              <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">SKU</th>
              <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Current Stock</th>
              <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Min Stock</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">This is an automated notification from your POS System.</p>
      </div>
    </body>
    </html>
  `;
}

export function generateDailySummaryEmailHtml(data: {
  date: string;
  totalSales: number;
  totalTransactions: number;
  totalRevenue: number;
  totalProfit: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Sales Summary</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">${data.date}</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Transactions</p>
            <p style="margin: 5px 0 0; color: #111827; font-size: 28px; font-weight: bold;">${data.totalTransactions}</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Revenue</p>
            <p style="margin: 5px 0 0; color: #10b981; font-size: 28px; font-weight: bold;">$${data.totalRevenue.toFixed(2)}</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Sales</p>
            <p style="margin: 5px 0 0; color: #3b82f6; font-size: 28px; font-weight: bold;">${data.totalSales}</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Profit</p>
            <p style="margin: 5px 0 0; color: #8b5cf6; font-size: 28px; font-weight: bold;">$${data.totalProfit.toFixed(2)}</p>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">This is an automated daily summary from your POS System.</p>
      </div>
    </body>
    </html>
  `;
}
