"use client";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, XCircle } from "lucide-react";
import Papa from "papaparse";
import toast from "react-hot-toast";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVRow {
  name?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  costPrice?: string;
  cost_price?: string;
  sellingPrice?: string;
  selling_price?: string;
  stock?: string;
  minimumStock?: string;
  minimum_stock?: string;
  unit?: string;
}

export function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as CSVRow[]);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as CSVRow[];
          const products = rows.map((row) => ({
            name: row.name || "",
            sku: row.sku || "",
            barcode: row.barcode || undefined,
            category: row.category || undefined,
            costPrice: parseFloat(row.costPrice || row.cost_price || "0") || 0,
            sellingPrice: parseFloat(row.sellingPrice || row.selling_price || "0") || 0,
            stock: parseInt(row.stock || "0") || 0,
            minimumStock: parseInt(row.minimumStock || row.minimum_stock || "5") || 5,
            unit: row.unit || "pcs",
          }));

          const res = await fetch("/api/products/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Import failed");

          setResult(data.results);
          toast.success(`Imported: ${data.results.created} created, ${data.results.updated} updated`);

          if (data.results.errors.length === 0) {
            setTimeout(() => { onSuccess(); onClose(); }, 2000);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Import failed";
          toast.error(message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const downloadTemplate = () => {
    const csv = `name,sku,barcode,category,costPrice,sellingPrice,stock,minimumStock,unit
Coca Cola 330ml,BEV-001,5449000000996,Beverages,0.50,1.50,100,20,can
Water Bottle 500ml,BEV-002,,Beverages,0.20,0.75,200,50,bottle
Lays Chips,SNK-001,,Snacks,0.80,2.00,60,15,pcs`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div>
              <p className="text-sm font-medium text-blue-800">Download CSV Template</p>
              <p className="text-xs text-blue-600">Use this template for proper formatting</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File upload */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              {file ? file.name : "Click to upload CSV file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">CSV files only, max 5MB</p>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Preview (first 5 rows of {preview.length}+)
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      {Object.keys(preview[0]).slice(0, 6).map((k) => (
                        <th key={k} className="px-3 py-2 text-left text-slate-500 font-medium">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(row).slice(0, 6).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-slate-600">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {result.created} created, {result.updated} updated
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-red-600 text-xs">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            loading={loading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? "Importing..." : "Import Products"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
