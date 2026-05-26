"use client";
import { motion } from "framer-motion";
import { Package, Plus, Check } from "lucide-react";
import { useCurrency } from "@/lib/settings-context";
import type { Product } from "@/types";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  isInCart: boolean;
  cartQty: number;
}

export function ProductCard({ product, onAdd, isInCart, cartQty }: ProductCardProps) {
  const fmt = useCurrency();
  const isOutOfStock = product.stock === 0;
  const isLowStock   = product.stock > 0 && product.stock <= product.minimumStock;
  const price        = typeof product.sellingPrice === "string" ? parseFloat(product.sellingPrice) : product.sellingPrice;

  return (
    <motion.button
      whileHover={!isOutOfStock ? { scale: 1.03 } : {}}
      whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`relative flex flex-col w-full rounded-xl overflow-hidden text-left transition-all duration-200 group ${
        isOutOfStock
          ? "opacity-50 cursor-not-allowed bg-gray-100 border-2 border-gray-200"
          : isInCart
          ? "bg-white border-2 border-indigo-500 shadow-lg shadow-indigo-100"
          : "bg-white border-2 border-transparent shadow-sm hover:border-indigo-300 hover:shadow-md"
      }`}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Image fills top 65% */}
      <div className="relative w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden" style={{ height: "65%" }}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-slate-200" />
          </div>
        )}

        {/* In-cart badge */}
        {isInCart && (
          <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-10">
            {cartQty}
          </div>
        )}

        {/* Low stock */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-full font-bold z-10">
            LOW
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">OUT OF STOCK</span>
          </div>
        )}

        {/* Hover add overlay */}
        {!isOutOfStock && !isInCart && (
          <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
              <Plus className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* In-cart check overlay */}
        {isInCart && (
          <div className="absolute inset-0 bg-indigo-600/5 flex items-end justify-end p-1.5" />
        )}
      </div>

      {/* Details — bottom 35%, centered */}
      <div className="flex flex-col items-center justify-center text-center px-1.5 py-2 flex-1 bg-white">
        <p className="text-[10px] font-semibold text-slate-800 leading-tight line-clamp-2 w-full text-center">
          {product.name}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-xs font-bold text-indigo-600">{fmt(price)}</span>
          <span className="text-[9px] text-slate-400">×{product.stock}</span>
        </div>
        {isInCart && (
          <div className="mt-1 flex items-center gap-0.5 text-indigo-600">
            <Check className="w-2.5 h-2.5" />
            <span className="text-[9px] font-medium">Added</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
