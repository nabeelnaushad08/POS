"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { SystemSettings } from "@/types";

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
};

const SettingsContext = createContext<SystemSettings>(defaults);

export function SettingsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SystemSettings | null;
}) {
  const settings = value ?? defaults;

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
