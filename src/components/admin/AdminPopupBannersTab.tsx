import React, { useState } from 'react';
import { Upload, Trash2, Plus, Info, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { HeroBanner, PopupConfig, PopupThemeKey } from '../../types';

interface AdminPopupBannersTabProps {
  token: string;
  popup: PopupConfig;
  banners: HeroBanner[];
  onRefresh: () => Promise<void>;
}

const THEME_LABELS: Array<{ id: PopupThemeKey; label: string; swatch: string }> = [
  { id: 'midnight-gold', label: 'Midnight Navy & Gold', swatch: '#05163B' },
  { id: 'cobalt-electric', label: 'Cobalt Electric Blue', swatch: '#0052D4' },
  { id: 'emerald-velvet', label: 'Royal Emerald', swatch: '#064E3B' },
  { id: 'obsidian-minimal', label: 'Obsidian Black', swatch: '#18181B' },
  { id: 'crimson-luxe', label: 'Crimson Velvet', swatch: '#881337' },
];

export const AdminPopupBannersTab: React.FC<AdminPopupBannersTabProps> = ({
  token,
  popup: initialPopup,
  banners: initialBanners,
  onRefresh,
}) => {
  const [popup, setPopup] = useState<PopupConfig>(initialPopup);
  const [banners, setBanners] = useState<HeroBanner[]>(initialBanners);
  const [savingPopup, setSavingPopup] = useState(false);
  const [savingBanners, setSavingBanners] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const uploadFile = async (file: File): Promise<string | null> => {
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
      return data.url || null;
    } finally {
      setUploading(false);
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPopup(true);
    setSavedMsg('');
    try {
      await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(popup),
      });
      await onRefresh();
      setSavedMsg('Popup settings saved!');
    } finally {
      setSavingPopup(false);
    }
  };

  const handleSaveBanners = async (nextBanners: HeroBanner[]) => {
    setBanners(nextBanners);
    setSavingBanners(true);
    try {
      await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ banners: nextBanners }),
      });
      await onRefresh();
    } finally {
      setSavingBanners(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Website Entry Popup Config */}
      <form onSubmit={handleSavePopup} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0066FF]" />
            <h3 className="text-sm font-bold text-[#05163B]">Website Entry Popup</h3>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={popup.enabled}
              onChange={(e) => setPopup({ ...popup, enabled: e.target.checked })}
              className="w-4 h-4 accent-[#0066FF]"
            />
            {popup.enabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setPopup({ ...popup, mode: 'text' })}
            className={`h-9 rounded-lg text-xs font-semibold cursor-pointer ${
              popup.mode === 'text' ? 'bg-white text-[#05163B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Premium Text Popup
          </button>
          <button
            type="button"
            onClick={() => setPopup({ ...popup, mode: 'banner' })}
            className={`h-9 rounded-lg text-xs font-semibold cursor-pointer ${
              popup.mode === 'banner' ? 'bg-white text-[#05163B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Banner Image Popup
          </button>
        </div>

        {popup.mode === 'banner' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2 text-[11px] text-[#05163B]">
              <Info className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
              <span>
                Perfect Popup Banner Size: <strong>1080 × 1080 px (1:1 Square)</strong> or <strong>1200 × 800 px (3:2)</strong>. Looks crisp on both mobile and desktop modals.
              </span>
            </div>

            {popup.bannerImage && (
              <img
                src={popup.bannerImage}
                alt="Popup Banner"
                className="w-full max-h-48 object-contain rounded-xl border border-slate-200 bg-slate-50"
              />
            )}

            <div className="flex gap-2">
              <label className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-[#05163B] text-white text-xs font-semibold cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload Banner'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadFile(file);
                    if (url) setPopup({ ...popup, bannerImage: url });
                  }}
                />
              </label>
              <input
                type="text"
                value={popup.bannerLink}
                onChange={(e) => setPopup({ ...popup, bannerLink: e.target.value })}
                placeholder="Click link (e.g. #products)"
                className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Premium Color Palette
              </label>
              <div className="flex flex-wrap gap-2">
                {THEME_LABELS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPopup({ ...popup, textTheme: t.id })}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      popup.textTheme === t.id
                        ? 'border-[#0066FF] bg-blue-50 text-[#05163B]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: t.swatch }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
              <input
                type="text"
                value={popup.title}
                onChange={(e) => setPopup({ ...popup, title: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Offer Text</label>
              <textarea
                rows={2}
                value={popup.subtitle}
                onChange={(e) => setPopup({ ...popup, subtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code Badge</label>
                <input
                  type="text"
                  value={popup.highlightCode}
                  onChange={(e) => setPopup({ ...popup, highlightCode: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={popup.ctaText}
                  onChange={(e) => setPopup({ ...popup, ctaText: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Show after</span>
            <input
              type="number"
              min={0}
              max={60}
              value={popup.delaySeconds}
              onChange={(e) => setPopup({ ...popup, delaySeconds: Number(e.target.value) || 0 })}
              className="w-16 h-9 px-2 rounded-lg border border-slate-200 text-center font-mono"
            />
            <span>seconds</span>
          </div>

          <button
            type="submit"
            disabled={savingPopup}
            className="px-5 h-11 rounded-xl bg-[#0066FF] text-white text-xs font-semibold cursor-pointer"
          >
            {savingPopup ? 'Saving...' : 'Save Popup'}
          </button>
        </div>

        {savedMsg && <p className="text-xs font-semibold text-emerald-600">{savedMsg}</p>}
      </form>

      {/* 16:9 Hero Banners Manager */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#0066FF]" />
            <h3 className="text-sm font-bold text-[#05163B]">Hero 16:9 Banners</h3>
          </div>
          <label className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-[#05163B] text-white text-xs font-semibold cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Upload 16:9
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadFile(file);
                if (url) {
                  const next = [
                    ...banners,
                    {
                      id: `bn-${Date.now()}`,
                      image: url,
                      alt: 'All In One Gadget Banner',
                      active: true,
                      order: banners.length + 1,
                    },
                  ];
                  await handleSaveBanners(next);
                }
              }}
            />
          </label>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          Recommended Hero Banner Size: <strong>1920 × 1080 px (16:9 Ratio)</strong>. Banners display full-bleed without overlay buttons or text.
        </div>

        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 overflow-hidden">
              <img
                src={b.image}
                alt={b.alt}
                className="w-full aspect-video object-cover bg-slate-100"
              />
              <div className="p-2.5 flex items-center justify-between gap-2 bg-slate-50">
                <span className="text-xs text-slate-600 truncate">{b.alt}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={savingBanners}
                    onClick={() =>
                      handleSaveBanners(
                        banners.map((item) =>
                          item.id === b.id ? { ...item, active: !item.active } : item
                        )
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {b.active ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveBanners(banners.filter((item) => item.id !== b.id))
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
