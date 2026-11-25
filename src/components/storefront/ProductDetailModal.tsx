import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Zap, Check } from 'lucide-react';
import type { Product, ProductVariation } from '../../types';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number) => void;
  onQuickOrder: (product: Product, variation?: ProductVariation, qty?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onQuickOrder,
}) => {
  const [selectedVarId, setSelectedVarId] = useState<string>(
    product?.variations[0]?.id || ''
  );
  const [qty, setQty] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!product) return null;

  const selectedVariation =
    product.variations.find((v) => v.id === selectedVarId) || product.variations[0];
  const activePrice = Math.max(0, product.price + (selectedVariation?.priceDelta || 0));

  const handleAdd = () => {
    onAddToCart(product, selectedVariation, qty);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-3.5 right-3.5 z-10 w-10 h-10 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Image */}
          <div className="bg-[#F8FAFC] p-6 flex items-center justify-center aspect-square">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain max-h-72"
            />
          </div>

          {/* Info & Purchase Module */}
          <div className="p-5 sm:p-6 flex flex-col">
            <div className="text-xs font-medium text-slate-500">
              {product.categoryName} {product.tag ? `· ${product.tag}` : ''}
            </div>
            <h2 className="mt-1.5 text-xl font-bold text-[#05163B] leading-snug">
              {product.name}
            </h2>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#05163B]">
                ৳{activePrice.toLocaleString()}
              </span>
              {product.compareAtPrice && product.compareAtPrice > activePrice && (
                <span className="font-mono tabular-nums text-sm text-slate-400 line-through">
                  ৳{product.compareAtPrice.toLocaleString()}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>

            {/* Variations */}
            {product.variations.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Select Option
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((v) => {
                    const isSelected = selectedVariation?.id === v.id;
                    const label = [v.color, v.size].filter(Boolean).join(' / ');
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVarId(v.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer min-h-[38px] ${
                          isSelected
                            ? 'border-[#0066FF] bg-blue-50 text-[#05163B]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {v.colorHex && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5 flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-700">Quantity</span>
              <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-[#05163B] cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono tabular-nums w-8 text-center text-sm font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-[#05163B] cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAdd}
                className="h-12 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#05163B] transition-colors cursor-pointer"
              >
                {addedFeedback ? <Check className="w-4 h-4 text-emerald-600" /> : <ShoppingBag className="w-4 h-4" />}
                {addedFeedback ? 'Added' : 'Add to Bag'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickOrder(product, selectedVariation, qty);
                }}
                className="h-12 rounded-xl bg-[#0066FF] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#05163B] transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Order Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
