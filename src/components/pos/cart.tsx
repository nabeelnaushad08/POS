"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartProps {
  items: CartItem[];
  subtotal: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  onClear: () => void;
  discount: number;
  tax: number;
}

export function Cart({
  items,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClear,
  discount,
  tax,
}: CartProps) {
  const total = subtotal - discount + tax;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Cart</h2>
          {items.length > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 text-slate-300"
            >
              <ShoppingCart className="h-12 w-12 mb-2" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Add products to get started</p>
            </motion.div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 rounded-md bg-white border flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    <Minus className="h-3 w-3 text-slate-600" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="w-6 h-6 rounded-md bg-white border flex items-center justify-center hover:bg-green-50 hover:border-green-200 transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3 text-slate-600" />
                  </button>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="text-sm font-bold text-indigo-600">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t p-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span className="text-indigo-600 text-lg">{formatCurrency(total)}</span>
          </div>
          <Button
            onClick={onCheckout}
            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl mt-2"
          >
            Checkout
          </Button>
        </div>
      )}
    </div>
  );
}
