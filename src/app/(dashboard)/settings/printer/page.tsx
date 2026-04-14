"use client";
import { useState, useEffect, useRef } from "react";
import { Printer, Upload, X, ChevronLeft, Save, Eye } from "lucide-react";
import Link from "next/link";

type PrinterType = "POS" | "PURCHASE";

interface PrinterSettingsData {
  type: PrinterType;
  headerTitle: string;
  logo: string | null;
  showLogo: boolean;
  paperSize: "58mm" | "80mm";
  footer: string | null;
  showFooter: boolean;
  copies: number;
}

const defaults: Record<PrinterType, PrinterSettingsData> = {
  POS: {
    type: "POS",
    headerTitle: "Sales Receipt",
    logo: null,
    showLogo: false,
    paperSize: "80mm",
    footer: "Thank you for your purchase!",
    showFooter: true,
    copies: 1,
  },
  PURCHASE: {
    type: "PURCHASE",
    headerTitle: "Purchase Order",
    logo: null,
    showLogo: false,
    paperSize: "80mm",
    footer: "Authorized Signature: ____________",
    showFooter: true,
    copies: 1,
  },
};

function ReceiptPreview({ settings }: { settings: PrinterSettingsData }) {
  const width = settings.paperSize === "58mm" ? "200px" : "280px";
  return (
    <div className="flex justify-center">
      <div
        style={{ width, fontFamily: "monospace", fontSize: "11px", padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff", color: "#111" }}
      >
        {settings.showLogo && settings.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <img src={settings.logo} alt="Logo" style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain", display: "inline-block" }} />
          </div>
        )}
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
          {settings.headerTitle || "Receipt"}
        </div>
        <div style={{ textAlign: "center", color: "#666", marginBottom: "8px", fontSize: "10px" }}>
          {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </div>
        <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "6px 0", margin: "6px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Sample Item x2</span>
            <span>Rs. 200.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Another Product x1</span>
            <span>Rs. 350.00</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>Rs. 550.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tax</span>
          <span>Rs. 0.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "12px", marginTop: "4px" }}>
          <span>TOTAL</span>
          <span>Rs. 550.00</span>
        </div>
        <div style={{ textAlign: "center", marginTop: "6px", fontSize: "10px" }}>
          Payment: CASH | Change: Rs. 0.00
        </div>
        {settings.showFooter && settings.footer && (
          <div style={{ textAlign: "center", marginTop: "10px", borderTop: "1px dashed #999", paddingTop: "8px", color: "#555", fontSize: "10px" }}>
            {settings.footer}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: "6px", color: "#999", fontSize: "9px" }}>
          Paper: {settings.paperSize} | Copies: {settings.copies}
        </div>
      </div>
    </div>
  );
}

function PrinterSettingsPanel({
  type,
  label,
}: {
  type: PrinterType;
  label: string;
}) {
  const [settings, setSettings] = useState<PrinterSettingsData>(defaults[type]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/printer-settings/${type}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setSettings({
            type,
            headerTitle: d.data.headerTitle || defaults[type].headerTitle,
            logo: d.data.logo || null,
            showLogo: d.data.showLogo ?? false,
            paperSize: d.data.paperSize || "80mm",
            footer: d.data.footer || defaults[type].footer,
            showFooter: d.data.showFooter ?? true,
            copies: d.data.copies || 1,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setError("Logo must be under 200KB for printer compatibility");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings((prev) => ({ ...prev, logo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/printer-settings/${type}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Header Title</label>
            <input
              type="text"
              value={settings.headerTitle}
              onChange={(e) => setSettings((prev) => ({ ...prev, headerTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={defaults[type].headerTitle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paper Size</label>
            <div className="flex gap-3">
              {(["58mm", "80mm"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings((prev) => ({ ...prev, paperSize: size }))}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    settings.paperSize === size
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Print Copies</label>
            <input
              type="number"
              value={settings.copies}
              onChange={(e) => setSettings((prev) => ({ ...prev, copies: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) }))}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={1}
              max={5}
            />
          </div>

          {/* Logo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo</label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showLogo: e.target.checked }))}
                  className="rounded"
                />
                Show on receipt
              </label>
            </div>
            <div className="flex items-center gap-4">
              {settings.logo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.logo} alt="Logo" className="w-14 h-14 object-contain rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-1" />
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, logo: null }))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                  <Printer className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                <p className="text-xs text-gray-400 mt-1">Max 200KB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Footer Text</label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showFooter}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showFooter: e.target.checked }))}
                  className="rounded"
                />
                Show on receipt
              </label>
            </div>
            <textarea
              value={settings.footer || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, footer: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={defaults[type].footer || ""}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : saved ? "Saved!" : `Save ${label} Settings`}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide" : "Preview"}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className={`${showPreview ? "block" : "hidden lg:block"}`}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">Live Preview</p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
            <ReceiptPreview settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrinterSettingsPage() {
  const [activeTab, setActiveTab] = useState<PrinterType>("POS");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Printer Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure receipt and purchase order printing</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0">
          {([["POS", "Sales Receipt"], ["PURCHASE", "Purchase Order"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === "POS" && <PrinterSettingsPanel type="POS" label="POS Receipt" />}
        {activeTab === "PURCHASE" && <PrinterSettingsPanel type="PURCHASE" label="Purchase Order" />}
      </div>
    </div>
  );
}
