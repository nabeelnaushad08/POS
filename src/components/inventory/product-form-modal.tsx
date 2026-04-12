"use client";
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Product, Category } from "@/types";
import toast from "react-hot-toast";

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  costPrice: string;
  sellingPrice: string;
  stock: string;
  minimumStock: string;
  unit: string;
  image: string;
  isActive: boolean;
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

const defaultForm: ProductFormData = {
  name: "", sku: "", barcode: "", description: "",
  categoryId: "", costPrice: "0", sellingPrice: "0",
  stock: "0", minimumStock: "5", unit: "pcs", image: "", isActive: true,
};

export function ProductFormModal({ open, onClose, product, categories, onSuccess }: ProductFormModalProps) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductFormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        description: product.description || "",
        categoryId: product.categoryId || "",
        costPrice: String(Number(product.costPrice)),
        sellingPrice: String(Number(product.sellingPrice)),
        stock: String(product.stock),
        minimumStock: String(product.minimumStock),
        unit: product.unit,
        image: product.image || "",
        isActive: product.isActive,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [product, open]);

  const set = (field: keyof ProductFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ProductFormData, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.sku.trim()) errs.sku = "SKU is required";
    if (isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) errs.costPrice = "Invalid cost price";
    if (isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0) errs.sellingPrice = "Invalid selling price";
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) errs.stock = "Invalid stock";
    if (isNaN(Number(form.minimumStock)) || Number(form.minimumStock) < 0) errs.minimumStock = "Invalid min stock";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || null,
        description: form.description || null,
        categoryId: form.categoryId || null,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        stock: parseInt(form.stock),
        minimumStock: parseInt(form.minimumStock),
        unit: form.unit || "pcs",
        image: form.image || null,
        isActive: form.isActive,
      };

      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save"); }
      toast.success(isEdit ? "Product updated!" : "Product created!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Coca Cola 330ml" className="mt-1" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. BEV-001" className="mt-1" />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="e.g. 5449000000996" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId || "none"} onValueChange={(v) => set("categoryId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, kg, L, etc." className="mt-1" />
            </div>
            <div>
              <Label>Cost Price ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} className="mt-1" />
              {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
            </div>
            <div>
              <Label>Selling Price ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} className="mt-1" />
              {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
            </div>
            <div>
              <Label>Current Stock *</Label>
              <Input type="number" min={0} value={form.stock} onChange={(e) => set("stock", e.target.value)} className="mt-1" />
              {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
            </div>
            <div>
              <Label>Minimum Stock *</Label>
              <Input type="number" min={0} value={form.minimumStock} onChange={(e) => set("minimumStock", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Image URL</Label>
              <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://example.com/image.jpg" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Product description..." className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              <Label>Active Product</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
