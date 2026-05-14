"use client";
import { useState, useEffect, useRef } from "react";
import { Settings, Store, Palette, DollarSign, MapPin, Phone, Mail, Save, Upload, X, UtensilsCrossed, Wifi, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface SystemSettingsData {
  systemName: string;
  logo: string | null;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  theme: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  kotEnabled: boolean;
  printerIp: string;
  printerEnabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsData>({
    systemName: "POS System",
    logo: null,
    currency: "LKR",
    currencySymbol: "Rs.",
    taxRate: 0,
    theme: "light",
    timezone: "Asia/Colombo",
    address: "",
    phone: "",
    email: "",
    kotEnabled: false,
    printerIp: "",
    printerEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Printer auto-detection
  const [detecting, setDetecting] = useState(false);
  const [detectedIPs, setDetectedIPs] = useState<string[]>([]);
  const [serverSubnet, setServerSubnet] = useState<string | null>(null);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [testResult, setTestResult] = useState<"online" | "offline" | null>(null);

  const detectPrinter = async () => {
    setDetecting(true);
    setDetectedIPs([]);
    setTestResult(null);
    try {
      const res = await fetch("http://localhost:3001/detect");
      const data = await res.json();
      setServerSubnet(data.primarySubnet || null);
      if (data.detectedPrinters?.length > 0) {
        setDetectedIPs(data.detectedPrinters);
        setSettings((prev) => ({ ...prev, printerIp: data.detectedPrinters[0] }));
      }
    } catch {
      setServerSubnet("agent-offline");
    } finally {
      setDetecting(false);
    }
  };

  const testPrinterConnection = async () => {
    if (!settings.printerIp) return;
    setTestingPrinter(true);
    setTestResult(null);
    try {
      // Sync current IP to the local agent config before testing
      await fetch("http://localhost:3001/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerIp: settings.printerIp }),
      }).catch(() => {});
      const res = await fetch("http://localhost:3001/status");
      const data = await res.json();
      setTestResult(data.status === "online" ? "online" : "offline");
    } catch {
      setTestResult("offline");
    } finally {
      setTestingPrinter(false);
    }
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setSettings({
            systemName: d.data.systemName || "POS System",
            logo: d.data.logo || null,
            currency: d.data.currency || "LKR",
            currencySymbol: d.data.currencySymbol || "Rs.",
            taxRate: d.data.taxRate ?? 0,
            theme: d.data.theme || "light",
            timezone: d.data.timezone || "Asia/Colombo",
            address: d.data.address || "",
            phone: d.data.phone || "",
            email: d.data.email || "",
            kotEnabled: d.data.kotEnabled ?? false,
            printerIp: d.data.printerIp || "",
            printerEnabled: d.data.printerEnabled ?? false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("Logo must be under 500KB");
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
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Notify SettingsProvider to re-fetch globally (currency, theme, etc.)
        window.dispatchEvent(new CustomEvent("settings-updated"));
        // Sync printer IP and display settings to local print agent (fire-and-forget)
        fetch("http://localhost:3001/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            printerIp:      settings.printerIp,
            systemName:     settings.systemName,
            currencySymbol: settings.currencySymbol,
          }),
        }).catch(() => {});
        // Apply theme immediately
        if (settings.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure your POS system preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-400 text-sm">
          Settings saved successfully!
        </div>
      )}

      {/* System Identity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">System Identity</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Name and logo displayed throughout the system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Name</label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => setSettings((prev) => ({ ...prev, systemName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Logo</label>
            <div className="flex items-center gap-4">
              {settings.logo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logo}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-1"
                  />
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, logo: null }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                  <Store className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 500KB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Currency & Tax</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure currency display and tax settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency Code</label>
            <input
              type="text"
              value={settings.currency}
              onChange={(e) => setSettings((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="LKR"
              maxLength={5}
            />
            <p className="text-xs text-gray-400 mt-1">e.g. LKR, USD, EUR</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency Symbol</label>
            <input
              type="text"
              value={settings.currencySymbol}
              onChange={(e) => setSettings((prev) => ({ ...prev, currencySymbol: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Rs."
              maxLength={5}
            />
            <p className="text-xs text-gray-400 mt-1">e.g. Rs., $, €</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Tax Rate (%)</label>
            <input
              type="number"
              value={settings.taxRate}
              onChange={(e) => setSettings((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>
      </div>

      {/* Business Contact */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Business Contact</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Contact details shown on receipts and documents</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</span>
            </label>
            <textarea
              value={settings.address || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="123 Main Street, Colombo 01, Sri Lanka"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</span>
              </label>
              <input
                type="tel"
                value={settings.phone || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+94 11 234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
              </label>
              <input
                type="email"
                value={settings.email || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="info@mystore.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Palette className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Theme and display preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
            <div className="flex gap-3">
              {["light", "dark"].map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings((prev) => ({ ...prev, theme: t }))}
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all capitalize ${
                    settings.theme === t
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {t === "light" ? "☀️ Light" : "🌙 Dark"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Asia/Colombo">Asia/Colombo (UTC+5:30)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
              <option value="UTC">UTC (UTC+0:00)</option>
              <option value="America/New_York">America/New_York (UTC-5:00)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8:00)</option>
              <option value="Europe/London">Europe/London (UTC+0:00)</option>
              <option value="Europe/Paris">Europe/Paris (UTC+1:00)</option>
              <option value="Asia/Dubai">Asia/Dubai (UTC+4:00)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8:00)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9:00)</option>
              <option value="Australia/Sydney">Australia/Sydney (UTC+11:00)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KOT Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <UtensilsCrossed className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Kitchen Order Ticket (KOT)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">For restaurants & fast food — prints a second ticket to the kitchen on every sale</p>
          </div>
        </div>
        <label className="flex items-center gap-4 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={settings.kotEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, kotEnabled: e.target.checked }))}
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${settings.kotEnabled ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`} />
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.kotEnabled ? "translate-x-6" : ""}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {settings.kotEnabled ? "KOT Enabled — kitchen copy will print on every sale" : "KOT Disabled — only customer receipt prints"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enable for restaurants, bakeries, or any kitchen-based operation</p>
          </div>
        </label>
      </div>

      {/* Printer Network */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Network Printer (Wi-Fi / LAN)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Epson or thermal printer on your local network — prints silently with no dialog</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Enable toggle */}
          <label className="flex items-center gap-4 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.printerEnabled}
                onChange={(e) => setSettings((prev) => ({ ...prev, printerEnabled: e.target.checked }))}
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.printerEnabled ? "bg-cyan-500" : "bg-gray-300 dark:bg-gray-600"}`} />
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.printerEnabled ? "translate-x-6" : ""}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {settings.printerEnabled ? "Network printer enabled — receipts print silently on every sale" : "Network printer disabled — browser print used as fallback"}
              </span>
            </div>
          </label>

          {settings.printerEnabled && (
            <div className="space-y-4">
              {/* Auto-detect */}
              <div className="flex items-start gap-3 p-4 bg-cyan-50 dark:bg-cyan-900/10 rounded-xl border border-cyan-200 dark:border-cyan-800">
                <div className="flex-1">
                  <p className="text-sm font-medium text-cyan-800 dark:text-cyan-300">Auto-detect printer on this network</p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
                    Scans the local network for printers on port 9100 via the Print Agent running on this device.
                    {serverSubnet && serverSubnet !== "agent-offline" && <span className="font-mono ml-1">(Network: {serverSubnet}.0/24)</span>}
                    {serverSubnet === "agent-offline" && <span className="text-amber-600 ml-1"> Print Agent not running — start it first (see setup instructions).</span>}
                  </p>
                  {detectedIPs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detectedIPs.map((ip) => (
                        <button
                          key={ip}
                          type="button"
                          onClick={() => setSettings((prev) => ({ ...prev, printerIp: ip }))}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                            settings.printerIp === ip
                              ? "bg-cyan-600 text-white border-cyan-600"
                              : "bg-white dark:bg-gray-700 text-cyan-700 dark:text-cyan-300 border-cyan-300 hover:border-cyan-500"
                          }`}
                        >
                          {ip} {settings.printerIp === ip ? "✓" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  {!detecting && detectedIPs.length === 0 && serverSubnet && (
                    <p className="text-xs text-cyan-500 mt-1">No printers auto-detected — enter IP manually below.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={detectPrinter}
                  disabled={detecting}
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-60 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detecting ? "animate-spin" : ""}`} />
                  {detecting ? "Scanning..." : "Scan Network"}
                </button>
              </div>

              {/* Manual IP entry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Printer IP Address
                  <span className="text-xs text-gray-400 font-normal ml-2">(auto-filled from scan, or enter manually)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.printerIp}
                    onChange={(e) => { setSettings((prev) => ({ ...prev, printerIp: e.target.value })); setTestResult(null); }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                    placeholder="192.168.1.100"
                  />
                  <button
                    type="button"
                    onClick={testPrinterConnection}
                    disabled={!settings.printerIp || testingPrinter}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {testingPrinter ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : testResult === "online" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : testResult === "offline" ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Wifi className="w-4 h-4" />
                    )}
                    {testingPrinter ? "Testing..." : testResult === "online" ? "Connected!" : testResult === "offline" ? "Not Found" : "Test Connection"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Port 9100 (ESC/POS standard). After saving, the status badge in the top bar will reflect the printer state automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printer Settings Link */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Printer Settings</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure receipt layout, paper size, logo, and footer text</p>
            </div>
          </div>
          <a
            href="/settings/printer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Configure Printers
          </a>
        </div>
      </div>
    </div>
  );
}
