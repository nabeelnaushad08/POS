"use client";
import { motion } from "framer-motion";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  isInCart: boolean;
  cartQty: number;
}

export function ProductCard({ product, onAdd, isInCart, cartQty }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.minimumStock;
  const price = typeof product.sellingPrice === "string" ? parseFloat(product.sellingPrice) : product.sellingPrice;

  return (
    <motion.button
      whileHover={!isOutOfStock ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`relative flex flex-col bg-white rounded-2xl border-2 overflow-hidden text-left transition-all duration-200 ${
        isOutOfStock
          ? "opacity-50 cursor-not-allowed border-gray-200"
          : isInCart
          ? "border-indigo-500 shadow-lg shadow-indigo-100"
          : "border-transparent shadow-sm hover:border-indigo-200 hover:shadow-md"
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 160px"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <Package className="h-10 w-10" />
          </div>
        )}

        {/* Cart quantity badge */}
        {isInCart && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
            {cartQty}
          </div>
        )}

        {/* Low stock badge */}
        {isLowStock && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full font-medium">
            Low
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 min-h-[2rem]">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold text-indigo-600">{formatCurrency(price)}</span>
          <span className="text-xs text-slate-400">×{product.stock}</span>
        </div>
      </div>

      {/* Add button */}
      {!isOutOfStock && (
        <div className="absolute bottom-2 right-2 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
          <Plus className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.button>
  );
}
