"use client";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { LogOut, Store, Printer, WifiOff, Circle, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSettings } from "@/lib/settings-context";
import Link from "next/link";

type PrinterStatus = "disabled" | "online" | "offline" | "checking";

interface CashierPOSLayoutProps {
  children: React.ReactNode;
  systemName?: string;
  systemLogo?: string | null;
}

export function CashierPOSLayout({ children, systemName, systemLogo }: CashierPOSLayoutProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { systemName: ctxName } = useSettings();
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>("checking");
  const [printerIp, setPrinterIp] = useState<string | null>(null);
  const [liveStockCount, setLiveStockCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const name = ctxName || systemName || "POS";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const checkPrinter = useCallback(() => {
    fetch("/api/print/status")
      .then((r) => r.json())
      .then((d: { status: string; ip: string | null }) => {
        setPrinterIp(d.ip);
        if (d.status === "disabled") setPrinterStatus("disabled");
        else if (d.status === "online") setPrinterStatus("online");
        else setPrinterStatus("offline");
      })
      .catch(() => setPrinterStatus("offline"));
  }, []);

  useEffect(() => {
    checkPrinter();
    const onVisible = () => { if (!document.hidden) checkPrinter(); };
    document.addEventListener("visibilitychange", onVisible);
    intervalRef.current = setInterval(checkPrinter, 30000);
    const onSettingsUpdated = () => setTimeout(checkPrinter, 500);
    window.addEventListener("settings-updated", onSettingsUpdated);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("settings-updated", onSettingsUpdated);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPrinter]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { if (typeof d.lowStockCount === "number") setLiveStockCount(d.lowStockCount); })
      .catch(() => {});
  }, []);

  const statusCfg = {
    online:   { cls: "bg-green-900/40 text-green-400 border-green-700", dot: "bg-green-400", label: "Online" },
    offline:  { cls: "bg-red-900/40 text-red-400 border-red-700",       dot: "bg-red-400",   label: "Offline" },
    checking: { cls: "bg-slate-700 text-slate-400 border-slate-600",    dot: "bg-slate-400 animate-pulse", label: "..." },
    disabled: { cls: "bg-slate-700 text-slate-500 border-slate-600",    dot: "bg-slate-500", label: "No Printer" },
  }[printerStatus];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Compact cashier top bar */}
      <header className="h-12 border-b bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
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
          {/* Printer status — always shown */}
          <div
            title={printerIp ? `${statusCfg.label} · ${printerIp}` : statusCfg.label}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.cls}`}
          >
            <Printer className="w-3 h-3" />
            <Circle className={`w-2 h-2 rounded-full fill-current ${statusCfg.dot}`} />
            <span className="hidden sm:inline">{statusCfg.label}</span>
            {printerStatus === "offline" && <WifiOff className="w-3 h-3" />}
          </div>

          {/* Low stock bell */}
          {liveStockCount > 0 && (
            <Link href="/notifications" className="relative p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                {liveStockCount > 9 ? "9+" : liveStockCount}
              </span>
            </Link>
          )}

          {/* User + sign out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
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
              <span className="hidden sm:inline">Out</span>
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
