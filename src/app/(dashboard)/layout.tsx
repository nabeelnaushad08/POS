import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CashierPOSLayout } from "@/components/layout/cashier-pos-layout";
import { SettingsProvider } from "@/lib/settings-context";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role || "CASHIER";

  // Get current path from headers
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || headersList.get("x-pathname") || "";
  const isCashierPOS = role === "CASHIER" && (pathname === "/pos" || pathname.startsWith("/pos"));

  // Get low stock count using raw query
  const lowStockResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM products WHERE stock <= minimum_stock AND is_active = true
  `.catch(() => [{ count: BigInt(0) }]);
  const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

  // Get system settings
  const rawSettings = await prisma.systemSettings.findFirst().catch(() => null);
  const settings = rawSettings
    ? { ...rawSettings, taxRate: Number(rawSettings.taxRate) }
    : null;

  const systemName = settings?.systemName ?? "POS System";
  const systemLogo = settings?.logo ?? null;

  // Cashier always gets the full-screen POS layout (no sidebar)
  if (role === "CASHIER") {
    return (
      <SettingsProvider value={settings ?? null}>
        <CashierPOSLayout systemName={systemName} systemLogo={systemLogo}>
          {children}
        </CashierPOSLayout>
      </SettingsProvider>
    );
  }

  void isCashierPOS; // suppress unused warning

  return (
    <SettingsProvider value={settings ?? null}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <Sidebar role={role} systemName={systemName} systemLogo={systemLogo} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header lowStockCount={lowStockCount} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
