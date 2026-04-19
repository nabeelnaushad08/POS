"use client";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, LogOut, User, Settings, ChevronDown, Printer, WifiOff, Circle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/layout/sidebar";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  lowStockCount?: number;
}

type PrinterStatus = "disabled" | "online" | "offline" | "checking";

export function Header({ title, lowStockCount = 0 }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user as { role?: string })?.role || "CASHIER";
  const [liveStockCount, setLiveStockCount] = useState(lowStockCount);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>("checking");
  const [printerIp, setPrinterIp] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check printer on mount, on tab visible, and every 30s
  useEffect(() => {
    checkPrinter();
    const onVisible = () => { if (!document.hidden) checkPrinter(); };
    document.addEventListener("visibilitychange", onVisible);
    intervalRef.current = setInterval(checkPrinter, 30000);
    // Also re-check when settings change (e.g. user just saved a new IP)
    const onSettingsUpdated = () => setTimeout(checkPrinter, 500);
    window.addEventListener("settings-updated", onSettingsUpdated);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("settings-updated", onSettingsUpdated);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPrinter]);

  // Low stock count refresh
  useEffect(() => {
    const refresh = () => {
      fetch("/api/dashboard")
        .then((r) => r.json())
        .then((d) => { if (typeof d.lowStockCount === "number") setLiveStockCount(d.lowStockCount); })
        .catch(() => {});
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    CASHIER: "bg-green-100 text-green-700",
  };

  const printerBadge = () => {
    if (printerStatus === "disabled") return null;
    const cfg = {
      online: {
        cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        dot: "bg-green-500",
        label: "Printer Online",
      },
      offline: {
        cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
        dot: "bg-red-500",
        label: "Printer Offline",
      },
      checking: {
        cls: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
        dot: "bg-gray-400 animate-pulse",
        label: "Checking...",
      },
    }[printerStatus];

    return (
      <div
        title={printerIp ? `${cfg.label} · ${printerIp}` : cfg.label}
        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default ${cfg.cls}`}
      >
        <Printer className="w-3 h-3 shrink-0" />
        <Circle className={`w-2 h-2 shrink-0 rounded-full fill-current ${cfg.dot}`} />
        <span className="hidden md:inline">{cfg.label}</span>
        {printerStatus === "offline" && (
          <WifiOff className="w-3 h-3 shrink-0" />
        )}
      </div>
    );
  };

  return (
    <header className="h-16 border-b bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <MobileSidebar role={role} />
        {title && (
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white hidden sm:block">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Printer status badge — always visible when configured */}
        {printerBadge()}

        {/* Low stock bell */}
        <Link href="/notifications" className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="h-5 w-5" />
          {liveStockCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {liveStockCount > 9 ? "9+" : liveStockCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-slate-800 dark:text-white leading-tight">{user?.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[role] || "bg-gray-100 text-gray-600"}`}>
                  {role}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            {role === "ADMIN" && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
