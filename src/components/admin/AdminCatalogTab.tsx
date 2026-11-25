import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X, FolderPlus, Info, Link2, Check } from 'lucide-react';
import type { Category, Product, ProductVariation } from '../../types';

interface AdminCatalogTabProps {
  token: string;
  categories: Category[];
  products: Product[];
  onRefresh: () => Promise<void>;
}

export const AdminCatalogTab: React.FC<AdminCatalogTabProps> = ({
  token,
  categories,
  products,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for Product
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('990');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [image, setImage] = useState('/products/p01_im1.jpg');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [stock, setStock] = useState('20');
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category states
  const [newCategoryName, setNewCategoryName] = useState('');

  const openAddProduct = () => {
    setIsNewProduct(true);
    setEditingProduct({} as Product);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setPrice('');
    setCompareAtPrice('');
    setImage('/products/p01_im1.jpg');
    setDescription('');
    setTag('');
    setStock('25');
    setFeatured(false);
    setActive(true);
    setVariations([]);
  };

  const openEditProduct = (prod: Product) => {
    setIsNewProduct(false);
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setPrice(String(prod.price));
    setCompareAtPrice(prod.compareAtPrice ? String(prod.compareAtPrice) : '');
    setImage(prod.image);
    setDescription(prod.description);
    setTag(prod.tag || '');
    setStock(String(prod.stock));
    setFeatured(prod.featured);
    setActive(prod.active);
    setVariations(prod.variations || []);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.url) setImage(data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        categoryId,
        price: Number(price) || 0,
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        image,
        description,
        tag,
        stock: Number(stock) || 0,
        featured,
        active,
        variations,
      };
      const url = isNewProduct
        ? '/api/admin/products'
        : `/api/admin/products/${editingProduct?.id}`;
      await fetch(url, {
        method: isNewProduct ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      setEditingProduct(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await onRefresh();
  };

  const handleAddVariation = () => {
    setVariations((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        color: '',
        colorHex: '#05163B',
        size: '',
        priceDelta: 0,
      },
    ]);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setNewCategoryName('');
    await onRefresh();
  };

  const handleDeleteCategory = async (id: string) => {
    await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await onRefresh();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('products')}
          className={`h-10 rounded-lg text-xs font-semibold cursor-pointer ${
            subTab === 'products' ? 'bg-white text-[#05163B] shadow-sm' : 'text-slate-600'
          }`}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('categories')}
          className={`h-10 rounded-lg text-xs font-semibold cursor-pointer ${
            subTab === 'categories' ? 'bg-white text-[#05163B] shadow-sm' : 'text-slate-600'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {subTab === 'products' ? (
        <>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog..."
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0066FF]"
            />
            <button
              type="button"
              onClick={openAddProduct}
              className="h-11 px-4 rounded-xl bg-[#0066FF] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3"
              >
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-14 h-14 rounded-xl bg-slate-50 object-contain p-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {prod.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {prod.categoryName} · <span className="font-mono font-bold text-[#05163B]">৳{prod.price.toLocaleString()}</span>
                    {!prod.active ? ' · Hidden' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/product/${prod.slug}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setCopiedId(prod.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      });
                    }}
                    title="Copy Product Permalink for Facebook Ads"
                    aria-label="Copy product permalink"
                    className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:border-[#0066FF] hover:text-[#0066FF] cursor-pointer"
                  >
                    {copiedId === prod.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditProduct(prod)}
                    aria-label="Edit product"
                    className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id)}
                    aria-label="Delete product"
                    className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name (e.g. Smart Lights)"
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0066FF]"
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-[#05163B] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Create
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{cat.name}</div>
                  <div className="text-xs text-slate-400">/{cat.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 flex items-center justify-center cursor-pointer"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Add/Edit Bottom Sheet Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#05163B]">
                {isNewProduct ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              {/* Image Preview & Upload + Size Guidance */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl bg-white border border-slate-200 object-contain p-1 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#05163B] text-white text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'Uploading...' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="Or paste image URL"
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <Info className="w-3.5 h-3.5 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>
                    Recommended Product Image Size: <strong>800 × 800 px (1:1 Square)</strong>, JPG/PNG/WebP under 2MB on clean light background.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Short Tag</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. Best Seller"
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Old Price (৳)</label>
                  <input
                    type="number"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              {/* Color & Size Variations */}
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#05163B]">Color & Size Variations</span>
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#0066FF] text-xs font-semibold cursor-pointer"
                  >
                    + Add Variant
                  </button>
                </div>

                {variations.map((v, idx) => (
                  <div key={v.id} className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      type="color"
                      value={v.colorHex || '#05163B'}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...v, colorHex: e.target.value };
                        setVariations(next);
                      }}
                      className="col-span-2 h-9 w-full rounded cursor-pointer border border-slate-200"
                      title="Swatch Color"
                    />
                    <input
                      type="text"
                      value={v.color || ''}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...v, color: e.target.value };
                        setVariations(next);
                      }}
                      placeholder="Color"
                      className="col-span-3 h-9 px-2 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={v.size || ''}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...v, size: e.target.value };
                        setVariations(next);
                      }}
                      placeholder="Size/Spec"
                      className="col-span-3 h-9 px-2 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="number"
                      value={v.priceDelta || 0}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...v, priceDelta: Number(e.target.value) || 0 };
                        setVariations(next);
                      }}
                      placeholder="+৳"
                      className="col-span-3 h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setVariations((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-1 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-[#0066FF]"
                  />
                  Visible on Store
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 accent-[#0066FF]"
                  />
                  Featured Top
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl bg-[#0066FF] hover:bg-[#05163B] text-white text-sm font-semibold cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
