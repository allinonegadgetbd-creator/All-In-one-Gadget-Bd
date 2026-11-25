import React, { useState } from 'react';
import { Plus, Trash2, Tag, Percent } from 'lucide-react';
import { storeClient } from '../../utils/storeClient';
import type { Coupon, DiscountTier, SiteSettings } from '../../types';

interface AdminOffersTabProps {
  token: string;
  coupons: Coupon[];
  settings: SiteSettings;
  onRefresh: () => Promise<void>;
}

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({
  token,
  coupons,
  settings,
  onRefresh,
}) => {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('10');
  const [minSpend, setMinSpend] = useState('1000');

  const [tierMinSpend, setTierMinSpend] = useState('2000');
  const [tierType, setTierType] = useState<'percent' | 'fixed'>('fixed');
  const [tierValue, setTierValue] = useState('150');
  const [actionError, setActionError] = useState('');

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setActionError('');
    try {
      await storeClient.addCoupon(token, {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value) || 0,
        minSpend: Number(minSpend) || 0,
        active: true,
      });
      setCode('');
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create coupon.');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    setActionError('');
    try {
      await storeClient.toggleCoupon(token, coupon);
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update coupon.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    setActionError('');
    try {
      await storeClient.deleteCoupon(token, id);
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete coupon.');
    }
  };

  const saveTiers = async (tiers: DiscountTier[]) => {
    setActionError('');
    try {
      await storeClient.saveSettings(token, { discountTiers: tiers });
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update discount tiers.');
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = Number(tierMinSpend) || 0;
    const val = Number(tierValue) || 0;
    if (min <= 0 || val <= 0) return;

    const newTier: DiscountTier = {
      id: `tier-${Date.now()}`,
      minSpend: min,
      type: tierType,
      value: val,
      label:
        tierType === 'percent'
          ? `Spend ৳${min.toLocaleString()}+ → ${val}% OFF`
          : `Spend ৳${min.toLocaleString()}+ → ৳${val.toLocaleString()} OFF`,
      active: true,
    };
    await saveTiers([...(settings.discountTiers || []), newTier]);
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {actionError}
        </div>
      )}
      {/* Automatic Shopping Spend Tiers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-[#0066FF]" />
          <div>
            <h3 className="text-sm font-bold text-[#05163B]">Auto Shopping Discount Tiers</h3>
            <p className="text-xs text-slate-500">
              Automatically reward customers when cart total reaches threshold (Spend X → Get Y OFF)
            </p>
          </div>
        </div>

        <form onSubmit={handleAddTier} className="grid grid-cols-12 gap-2">
          <input
            type="number"
            value={tierMinSpend}
            onChange={(e) => setTierMinSpend(e.target.value)}
            placeholder="Min Spend ৳"
            className="col-span-4 h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono"
          />
          <select
            value={tierType}
            onChange={(e) => setTierType(e.target.value as 'percent' | 'fixed')}
            className="col-span-3 h-11 px-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="fixed">৳ OFF</option>
            <option value="percent">% OFF</option>
          </select>
          <input
            type="number"
            value={tierValue}
            onChange={(e) => setTierValue(e.target.value)}
            placeholder="Value"
            className="col-span-3 h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono"
          />
          <button
            type="submit"
            className="col-span-2 h-11 rounded-xl bg-[#05163B] text-white flex items-center justify-center cursor-pointer"
            aria-label="Add tier"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-2">
          {(settings.discountTiers || []).map((tier) => (
            <div
              key={tier.id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              <span className="text-xs font-semibold text-slate-800">{tier.label}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    saveTiers(
                      settings.discountTiers.map((t) =>
                        t.id === tier.id ? { ...t, active: !t.active } : t
                      )
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    tier.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tier.active ? 'Active' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    saveTiers(settings.discountTiers.filter((t) => t.id !== tier.id))
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupon Codes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#0066FF]" />
          <div>
            <h3 className="text-sm font-bold text-[#05163B]">Coupon Codes</h3>
            <p className="text-xs text-slate-500">Create promo codes customers can apply at checkout</p>
          </div>
        </div>

        <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (e.g. EID20)"
            className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono uppercase"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
            className="h-11 px-3 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount (৳)</option>
          </select>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Discount Value"
            className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono"
          />
          <input
            type="number"
            value={minSpend}
            onChange={(e) => setMinSpend(e.target.value)}
            placeholder="Min Spend ৳"
            className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono"
          />
          <button
            type="submit"
            className="col-span-2 h-11 rounded-xl bg-[#0066FF] text-white text-xs font-semibold cursor-pointer"
          >
            Create Coupon
          </button>
        </form>

        <div className="space-y-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              <div>
                <span className="font-mono text-xs font-bold text-[#05163B]">{c.code}</span>
                <span className="ml-2 text-xs text-slate-600">
                  {c.type === 'percent' ? `${c.value}% OFF` : `৳${c.value} OFF`} · Min ৳{c.minSpend}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleCoupon(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {c.active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCoupon(c.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
