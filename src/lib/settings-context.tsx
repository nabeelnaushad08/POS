"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { SystemSettings } from "@/types";
import { formatAmount } from "@/lib/utils";

const defaults: SystemSettings = {
  id: "system",
  systemName: "POS System",
  logo: null,
  currency: "LKR",
  currencySymbol: "Rs.",
  timezone: "Asia/Colombo",
  taxRate: 0,
  theme: "light",
  address: null,
  phone: null,
  email: null,
  kotEnabled: false,
  printerIp: null,
  printerEnabled: false,
  printAgentUrl: "http://localhost:3001",
};

const SettingsContext = createContext<SystemSettings>(defaults);

export function SettingsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SystemSettings | null;
}) {
  const [settings, setSettings] = useState<SystemSettings>(value ?? defaults);

  // Fetch fresh settings from client (keeps in sync after saves)
  const refreshSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setSettings({ ...d.data, taxRate: Number(d.data.taxRate) });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Listen for settings-updated events (dispatched after saving settings)
  useEffect(() => {
    const handler = () => refreshSettings();
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, [refreshSettings]);

  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Returns a formatter that uses the current currency symbol from settings */
export function useCurrency(): (amount: number | string | null | undefined) => string {
  const { currencySymbol } = useSettings();
  return useCallback(
    (amount: number | string | null | undefined) => formatAmount(amount, currencySymbol),
    [currencySymbol]
  );
}
