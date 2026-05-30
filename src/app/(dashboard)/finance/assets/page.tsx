"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, X, Building2 } from "lucide-react";
import { useCurrency } from "@/lib/settings-context";

interface Asset {
  id: string;
  name: string;
  type: string;
  purchaseCost: number;
  currentValue: number;
  purchaseDate: string;
  notes: string | null;
  isActive: boolean;
}

const ASSET_TYPES = ["COMPUTER", "PRINTER", "FURNITURE", "VEHICLE", "EQUIPMENT", "MACHINERY", "OTHER"];

const TYPE_COLORS: Record<string, string> = {
  COMPUTER:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PRINTER:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  FURNITURE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  VEHICLE:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  EQUIPMENT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  MACHINERY: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  OTHER:     "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const emptyForm = {
  name: "",
  type: "EQUIPMENT",
  purchaseCost: "",
  currentValue: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function AssetsPage() {
  const fmt = useCurrency();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/assets");
      const json = await res.json();
      if (json.data) { setAssets(json.data as Asset[]); setTotalCost(json.totalCost); setTotalValue(json.totalValue); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (a: Asset) => {
    setForm({ name: a.name, type: a.type, purchaseCost: String(a.purchaseCost), currentValue: String(a.currentValue), purchaseDate: a.purchaseDate.split("T")[0], notes: a.notes || "" });
    setEditId(a.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.purchaseCost) return;
    setSaving(true);
    try {
      const url = editId ? `/api/finance/assets/${editId}` : "/api/finance/assets";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...form,
        purchaseCost: parseFloat(form.purchaseCost),
        currentValue: parseFloat(form.currentValue || form.purchaseCost),
      }) });
      if (res.ok) { setShowModal(false); load(); }
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Mark this asset as inactive?")) return;
    setDeleting(id);
    try { await fetch(`/api/finance/assets/${id}`, { method: "DELETE" }); load(); }
    finally { setDeleting(null); }
  };

  const filtered = assets.filter(a => showInactive ? true : a.isActive);
  const depreciation = totalCost - totalValue;
  const activeCount = assets.filter(a => a.isActive).length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Register</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all business assets and their values</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cost</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalCost)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Value</p>
          <p className="text-xl font-bold text-teal-600 mt-1">{fmt(totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depreciation</p>
          <p className="text-xl font-bold text-red-500 mt-1">{fmt(depreciation)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalCost > 0 ? `${((depreciation / totalCost) * 100).toFixed(1)}%` : "—"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Assets</p>
          <p className="text-xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} assets</span>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-600">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assets recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                  <th className="px-4 py-3 text-right">Depreciation %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(a => {
                  const depPct = a.purchaseCost > 0 ? ((Number(a.purchaseCost) - Number(a.currentValue)) / Number(a.purchaseCost)) * 100 : 0;
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!a.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        <div>{a.name}</div>
                        {a.notes && <div className="text-xs text-gray-400 truncate max-w-[150px]">{a.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] || TYPE_COLORS.OTHER}`}>{a.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(a.purchaseDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(Number(a.purchaseCost))}</td>
                      <td className="px-4 py-3 text-right font-medium text-teal-600">{fmt(Number(a.currentValue))}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${depPct > 50 ? "text-red-500" : depPct > 20 ? "text-amber-500" : "text-green-600"}`}>
                          {depPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {a.isActive && (
                            <button onClick={() => handleDeactivate(a.id)} disabled={deleting === a.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                              {deleting === a.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? "Edit Asset" : "Add Asset"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g. Office Computer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Cost *</label>
                  <input type="number" step="0.01" min="0" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value</label>
                  <input type="number" step="0.01" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={form.purchaseCost} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
                <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.purchaseCost}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {editId ? "Update" : "Add Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
