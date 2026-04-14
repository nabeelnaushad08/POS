"use client";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { LogOut, Store, Printer, Wifi, WifiOff, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSettings } from "@/lib/settings-context";
import Link from "next/link";

type PrinterStatus = "unknown" | "online" | "offline";

interface CashierPOSLayoutProps {
  children: React.ReactNode;
  systemName?: string;
  systemLogo?: string | null;
}

export function CashierPOSLayout({ children, systemName, systemLogo }: CashierPOSLayoutProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { printerEnabled, printerIp, systemName: ctxName } = useSettings();
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>("unknown");
  const [liveStockCount, setLiveStockCount] = useState(0);
  const pingRef = useRef<NodeJS.Timeout | null>(null);
  const name = ctxName || systemName || "POS";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Low stock count
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { if (typeof d.lowStockCount === "number") setLiveStockCount(d.lowStockCount); })
      .catch(() => {});
  }, []);

  // Printer ping
  useEffect(() => {
    if (pingRef.current) clearInterval(pingRef.current);
    if (!printerEnabled || !printerIp) { setPrinterStatus("unknown"); return; }
    const check = () => {
      const img = new Image();
      const t = setTimeout(() => { img.src = ""; setPrinterStatus("offline"); }, 3000);
      img.onload = () => { clearTimeout(t); setPrinterStatus("online"); };
      img.onerror = () => { clearTimeout(t); setPrinterStatus("online"); };
      img.src = `http://${printerIp}/favicon.ico?_=${Date.now()}`;
    };
    check();
    pingRef.current = setInterval(check, 30000);
    return () => { if (pingRef.current) clearInterval(pingRef.current); };
  }, [printerEnabled, printerIp]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Compact cashier header */}
      <header className="h-12 border-b bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            {systemLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogo} alt={name} className="w-full h-full object-contain" />
            ) : (
              <Store className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">{name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Printer status */}
          {printerEnabled && printerIp && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
              printerStatus === "online"
                ? "bg-green-900/40 text-green-400 border-green-700"
                : printerStatus === "offline"
                ? "bg-red-900/40 text-red-400 border-red-700"
                : "bg-slate-700 text-slate-400 border-slate-600"
            }`}>
              <Printer className="w-3 h-3" />
              {printerStatus === "online" ? <><Wifi className="w-3 h-3" /> Online</> :
               printerStatus === "offline" ? <><WifiOff className="w-3 h-3" /> Offline</> :
               "..."}
            </div>
          )}

          {/* Low stock bell */}
          {liveStockCount > 0 && (
            <Link href="/notifications" className="relative p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                {liveStockCount > 9 ? "9+" : liveStockCount}
              </span>
            </Link>
          )}

          {/* Cashier info + sign out */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-700">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-slate-300 text-xs hidden sm:block">{user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen POS content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
