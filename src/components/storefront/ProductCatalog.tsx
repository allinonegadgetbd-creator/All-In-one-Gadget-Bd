import React, { useMemo, useState } from 'react';
import { Search, ShoppingBag, Package, Zap } from 'lucide-react';
import type { Category, Product, ProductVariation } from '../../types';

interface ProductCatalogProps {
  categories: Category[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, variation?: ProductVariation) => void;
  onQuickOrder: (product: Product, variation?: ProductVariation) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  categories,
  products,
  onSelectProduct,
  onAddToCart,
  onQuickOrder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((prod) => {
      const catMatch = selectedCategory === 'all' || prod.categoryId === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.categoryName.toLowerCase().includes(q) ||
        prod.description.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, selectedCategory, searchQuery, sortBy]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Section Header + Search & Sort */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#05163B] text-balance">
            Gadget Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredProducts.length} items ready for fast Cash on Delivery across Bangladesh
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="Search earbuds, watch, fan..."
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')}
            aria-label="Sort products"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF]"
          >
            <option value="featured">Featured Deals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Interactive Category Tabs */}
      <div id="categories" className="py-5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('all');
            setVisibleCount(24);
          }}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[40px] ${
            selectedCategory === 'all'
              ? 'bg-[#05163B] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id);
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[40px] ${
              selectedCategory === cat.id
                ? 'bg-[#05163B] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {displayedProducts.length === 0 ? (
        <div className="py-16 text-center border border-slate-200 rounded-2xl bg-slate-50/50">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-800">No matching gadgets found</p>
          <p className="text-sm text-slate-500 mt-1">Try clearing your search or choosing another category.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0066FF] text-white text-sm font-medium hover:bg-[#05163B] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayedProducts.map((product) => {
            const firstVar = product.variations[0];
            const hasImageError = imgErrors[product.id];
            const discountPct =
              product.compareAtPrice && product.compareAtPrice > product.price
                ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                : 0;

            return (
              <article
                key={product.id}
                className="group flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Product Image Stage */}
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="relative w-full aspect-square bg-[#F8FAFC] p-3 flex items-center justify-center overflow-hidden cursor-pointer focus-visible:outline-none"
                >
                  {hasImageError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-xl text-slate-400 p-4 text-center">
                      <Package className="w-8 h-8 mb-2" />
                      <span className="text-xs font-medium text-slate-600 line-clamp-2">{product.name}</span>
                    </div>
                  ) : (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  )}
                </button>

                {/* Product Body */}
                <div className="flex flex-col flex-1 p-3.5 sm:p-4">
                  {/* Unboxed clean metadata line */}
                  <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
                    <span className="truncate">{product.categoryName}</span>
                    {discountPct > 0 ? (
                      <span className="text-[#0066FF] font-semibold shrink-0">-{discountPct}%</span>
                    ) : product.tag ? (
                      <span className="text-[#05163B] font-semibold shrink-0">{product.tag}</span>
                    ) : null}
                  </div>

                  <a
                    href={`/product/${product.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectProduct(product);
                    }}
                    className="mt-1.5 text-left font-display text-sm sm:text-[15px] font-semibold text-slate-900 line-clamp-2 hover:text-[#0066FF] transition-colors cursor-pointer leading-snug block"
                  >
                    {product.name}
                  </a>

                  {/* Color variation dots preview */}
                  {product.variations.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                      {product.variations.slice(0, 4).map((v) =>
                        v.colorHex ? (
                          <span
                            key={v.id}
                            title={v.color}
                            className="w-3 h-3 rounded-full border border-slate-300 inline-block"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        ) : null
                      )}
                      {product.variations.some((v) => v.size) && (
                        <span className="truncate">
                          {product.variations.length} options
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price & Actions pinned to bottom */}
                  <div className="mt-auto pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-[#05163B]">
                        ৳{product.price.toLocaleString()}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="font-mono tabular-nums text-xs text-slate-400 line-through">
                          ৳{product.compareAtPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onAddToCart(product, firstVar)}
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:border-[#05163B] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickOrder(product, firstVar)}
                        className="inline-flex items-center justify-center gap-1 h-10 px-2 rounded-xl bg-[#0066FF] text-white text-xs font-semibold hover:bg-[#05163B] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Order
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {visibleCount < filteredProducts.length && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:border-[#05163B] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Load More Gadgets ({filteredProducts.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </section>
  );
};
