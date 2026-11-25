import React, { useEffect, useState } from 'react';
import { Save, Bell, Download, CheckCircle2 } from 'lucide-react';
import { storeClient } from '../../utils/storeClient';
import type { SiteSettings } from '../../types';

interface AdminSettingsTabProps {
  token: string;
  settings: SiteSettings;
  notifPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => Promise<void>;
  onSendTestNotification: () => void;
  pwaInstallable: boolean;
  pwaInstalled: boolean;
  pwaIsIOS: boolean;
  onInstallPWA: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  token,
  settings: initialSettings,
  notifPermission,
  onRequestNotifications,
  onSendTestNotification,
  pwaInstallable,
  pwaInstalled,
  pwaIsIOS,
  onInstallPWA,
  onRefresh,
}) => {
  const [form, setForm] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setForm(initialSettings);
  }, [initialSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await storeClient.saveSettings(token, form);
      await onRefresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* PWA & Order Notifications Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="text-sm font-bold text-[#05163B]">Admin App & Order Alerts</div>

        <div className="flex flex-wrap gap-2.5">
          {notifPermission !== 'granted' ? (
            <button
              type="button"
              onClick={onRequestNotifications}
              className="flex-1 min-w-[160px] h-11 px-4 rounded-xl bg-[#05163B] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              Enable Order Notifications
            </button>
          ) : (
            <button
              type="button"
              onClick={onSendTestNotification}
              className="flex-1 min-w-[160px] h-11 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Notifications Active (Test Alert)
            </button>
          )}

          {!pwaInstalled && pwaInstallable && (
            <button
              type="button"
              onClick={onInstallPWA}
              className="flex-1 min-w-[150px] h-11 px-4 rounded-xl bg-[#0066FF] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install Admin App
            </button>
          )}
        </div>

        {!pwaInstalled && pwaIsIOS && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
            iPhone/iPad: Tap Safari <strong>Share</strong> icon and choose <strong>Add to Home Screen</strong> to install the Admin App.
          </p>
        )}
      </div>

      {/* Topbar Marquee Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#05163B]">Topbar Marquee</div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.topbarEnabled}
              onChange={(e) => setForm({ ...form, topbarEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#0066FF]"
            />
            {form.topbarEnabled ? 'ON' : 'OFF'}
          </label>
        </div>

        <textarea
          rows={2}
          value={form.topbarText}
          onChange={(e) => setForm({ ...form, topbarText: e.target.value })}
          placeholder="Text scrolling right-to-left in website topbar..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
        />
      </div>

      {/* Delivery Charge Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#05163B]">Delivery Charge</div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.deliveryChargeEnabled}
              onChange={(e) => setForm({ ...form, deliveryChargeEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#0066FF]"
            />
            {form.deliveryChargeEnabled ? 'Charge ON' : 'Free All Orders'}
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Inside Dhaka ৳</label>
            <input
              type="number"
              value={form.insideDhakaFee}
              onChange={(e) => setForm({ ...form, insideDhakaFee: Number(e.target.value) || 0 })}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Outside Dhaka ৳</label>
            <input
              type="number"
              value={form.outsideDhakaFee}
              onChange={(e) => setForm({ ...form, outsideDhakaFee: Number(e.target.value) || 0 })}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Free Above ৳</label>
            <input
              type="number"
              value={form.freeDeliveryMinSpend}
              onChange={(e) => setForm({ ...form, freeDeliveryMinSpend: Number(e.target.value) || 0 })}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Social Media & Contact Links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="text-sm font-bold text-[#05163B]">Contact & Social Media Links</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">WhatsApp Order Number (with 880)</label>
            <input
              type="text"
              value={form.whatsappOrderNumber}
              onChange={(e) => setForm({ ...form, whatsappOrderNumber: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Hotline Number</label>
            <input
              type="text"
              value={form.hotlineNumber}
              onChange={(e) => setForm({ ...form, hotlineNumber: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Support Email</label>
            <input
              type="email"
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Facebook URL</label>
            <input
              type="url"
              value={form.socialLinks.facebook}
              onChange={(e) =>
                setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Instagram URL</label>
            <input
              type="url"
              value={form.socialLinks.instagram}
              onChange={(e) =>
                setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">TikTok URL</label>
            <input
              type="url"
              value={form.socialLinks.tiktok}
              onChange={(e) =>
                setForm({ ...form, socialLinks: { ...form.socialLinks, tiktok: e.target.value } })
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">YouTube URL</label>
            <input
              type="url"
              value={form.socialLinks.youtube}
              onChange={(e) =>
                setForm({ ...form, socialLinks: { ...form.socialLinks, youtube: e.target.value } })
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">WhatsApp Chat Link</label>
            <input
              type="url"
              value={form.socialLinks.whatsapp}
              onChange={(e) =>
                setForm({ ...form, socialLinks: { ...form.socialLinks, whatsapp: e.target.value } })
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {saveError}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full h-12 rounded-xl bg-[#0066FF] hover:bg-[#05163B] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving Settings...' : saved ? 'Settings Saved!' : 'Save All Settings'}
      </button>
    </form>
  );
};
