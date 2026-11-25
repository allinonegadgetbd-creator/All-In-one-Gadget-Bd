import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  Package,
  Tag,
  Sparkles,
  Settings,
  Bell,
  Download,
  ExternalLink,
  Lock,
  LogOut,
  Mail,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { storeClient } from '../utils/storeClient';
import { assetUrl } from '../utils/assetUrl';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminCatalogTab } from '../components/admin/AdminCatalogTab';
import { AdminOffersTab } from '../components/admin/AdminOffersTab';
import { AdminPopupBannersTab } from '../components/admin/AdminPopupBannersTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import type {
  Category,
  Coupon,
  HeroBanner,
  Order,
  OrderStatus,
  PopupConfig,
  Product,
  SiteSettings,
} from '../types';

type AdminTab = 'orders' | 'catalog' | 'offers' | 'popup' | 'settings';

interface AdminBootstrap {
  categories: Category[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  banners: HeroBanner[];
  popup: PopupConfig;
  settings: SiteSettings;
}

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio playback blocked before user gesture
  }
}

export const AdminApp: React.FC<{ onNavigateStore: () => void }> = ({ onNavigateStore }) => {
  const [token, setToken] = useState<string>('');
  const [authMode, setAuthMode] = useState<'supabase' | 'passcode'>('passcode');
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [data, setData] = useState<AdminBootstrap | null>(null);
  const [liveToast, setLiveToast] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // PWA installability & SW registration activated ONLY on /admin
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    storeClient
      .getAuthStatus()
      .then((res) => {
        setAuthMode(res.authMode === 'supabase' ? 'supabase' : 'passcode');
        setNeedsSetup(Boolean(res.needsSetup));
        if (res.existingToken) {
          setToken(res.existingToken);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const fetchBootstrap = useCallback(async (authToken: string) => {
    const json = await storeClient.getAdminBootstrap(authToken);
    if (!json) {
      setToken('');
      return;
    }
    setData(json);
  }, []);

  const triggerOrderNotification = useCallback(async (order: Order) => {
    playNotificationChime();
    setLiveToast(`New Order ${order.orderNumber} · ৳${order.total.toLocaleString()} (${order.customerName})`);
    setTimeout(() => setLiveToast(''), 6000);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const title = `New Order ${order.orderNumber} (৳${order.total.toLocaleString()})`;
      const body = `${order.customerName} · ${order.customerPhone} · ${order.items.length} item(s)`;
      const iconUrl = assetUrl('/pwa-192x192.png');
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: iconUrl,
            badge: iconUrl,
            data: { url: assetUrl('/admin') },
          });
          return;
        }
      } catch {
        // Fallback to direct Notification constructor
      }
      new Notification(title, { body, icon: iconUrl });
    }
  }, []);

  // Live SSE / Supabase Realtime Stream for incoming orders
  useEffect(() => {
    if (!token) return;
    fetchBootstrap(token);

    const unsubscribe = storeClient.subscribeAdminOrders(token, (order) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              orders: [order, ...prev.orders.filter((o) => o.id !== order.id)],
            }
          : prev
      );
      triggerOrderNotification(order);
    });

    return () => {
      unsubscribe();
    };
  }, [token, fetchBootstrap, triggerOrderNotification]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const result = await storeClient.loginAdmin({
        mode: authMode,
        needsSetup,
        email,
        password,
        passcode,
      });
      if (!result.ok || !result.token) {
        setAuthError(result.error || 'Authentication failed.');
      } else {
        setNeedsSetup(false);
        setPassword('');
        setPasscode('');
        setToken(result.token);
      }
    } catch {
      setAuthError('Network error. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const sendTestNotification = async () => {
    if (notifPermission !== 'granted') {
      await requestNotifications();
      return;
    }
    playNotificationChime();
    const title = 'All In One Gadget Admin';
    const body = 'Order alerts are active! New orders will notify you immediately.';
    const iconUrl = assetUrl('/pwa-192x192.png');
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: iconUrl,
          data: { url: assetUrl('/admin') },
        });
        return;
      } catch {
        // fallback
      }
    }
    new Notification(title, { body, icon: iconUrl });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setActionError('');
    try {
      await storeClient.updateOrderStatus(token, orderId, status);
      await fetchBootstrap(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order status.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setActionError('');
    try {
      await storeClient.deleteOrder(token, orderId);
      await fetchBootstrap(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete order.');
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'catalog', label: 'Catalog', icon: Package },
    { id: 'offers', label: 'Offers', icon: Tag },
    { id: 'popup', label: 'Popup', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Login / First-Run Setup Gate
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-col items-center text-center">
            <img
              src={assetUrl('/assets/aistudio/Glossy_Blue_Shopping_Bag_Icon_8e9d9e96.png')}
              alt="All In One Gadget Admin"
              className="w-16 h-16 object-contain"
            />
            <h1 className="mt-3 font-display text-xl font-bold text-[#05163B]">
              {authMode === 'supabase'
                ? 'Admin App Sign In'
                : needsSetup
                  ? 'Set Admin Passcode'
                  : 'Admin App Sign In'}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {authMode === 'supabase'
                ? 'Sign in with your authorized Supabase Authentication email & password.'
                : needsSetup
                  ? 'Create your private store passcode to unlock the Admin App.'
                  : 'Enter your passcode to manage orders, products & offers.'}
            </p>
          </div>

          {checkingAuth ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading...</div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'supabase' ? (
                <>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Admin email"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={needsSetup ? 'Create passcode (min 4 chars)' : 'Enter admin passcode'}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              )}

              {authError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full h-12 rounded-xl bg-[#05163B] hover:bg-[#0066FF] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {authSubmitting
                  ? 'Signing In...'
                  : authMode === 'supabase'
                    ? 'Sign In to Admin App'
                    : needsSetup
                      ? 'Activate Admin App'
                      : 'Open Admin App'}
              </button>
            </form>
          )}

          {/* Install Admin PWA directly from Admin screen */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                className="w-full h-11 rounded-xl border border-blue-200 bg-blue-50 text-[#0066FF] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Install Admin App on Phone
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onNavigateStore}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-[#0066FF] cursor-pointer"
          >
            Back to Storefront
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-[#05163B]">Install on iPhone / iPad</h3>
              <p className="text-sm text-slate-600">
                1. Tap the <strong>Share</strong> button in Safari.<br />
                2. Tap <strong>Add to Home Screen</strong> to install AIOG Admin.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-10 rounded-xl bg-slate-100 text-sm font-semibold text-slate-800"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const pendingCount = data?.orders.filter((o) => o.status === 'Pending').length || 0;

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#05163B] text-white p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <img
              src={assetUrl('/assets/aistudio/Glossy_Blue_Shopping_Bag_Icon_8e9d9e96.png')}
              alt="AIOG"
              className="w-9 h-9 rounded-xl bg-white p-1"
            />
            <div>
              <div className="font-display text-sm font-bold leading-tight">AIOG Admin</div>
              <div className="text-[11px] text-sky-300">Store Control App</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full h-11 px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? 'bg-[#0066FF] text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.id === 'orders' && pendingCount > 0 && (
                    <span className="font-mono text-xs bg-amber-400 text-[#05163B] font-bold px-2 py-0.5 rounded-md">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onNavigateStore}
            className="w-full h-10 px-3 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            View Live Store
          </button>
          <button
            type="button"
            onClick={() => {
              storeClient.logoutAdmin();
              setToken('');
            }}
            className="w-full h-10 px-3 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Lock Admin
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Compact Mobile-App Top Header (56px) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={assetUrl('/assets/aistudio/Glossy_Blue_Shopping_Bag_Icon_8e9d9e96.png')}
              alt="Admin"
              className="w-8 h-8 rounded-lg lg:hidden"
            />
            <span className="font-display text-base font-bold text-[#05163B] capitalize">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                className="h-9 px-3 rounded-xl bg-[#0066FF] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}

            <button
              type="button"
              onClick={sendTestNotification}
              aria-label="Order notifications"
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer ${
                notifPermission === 'granted'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onNavigateStore}
              aria-label="View Storefront"
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Live Order Toast */}
        {liveToast && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-[#05163B] text-white text-xs font-semibold flex items-center justify-between shadow-lg">
            <span>{liveToast}</span>
            <button type="button" onClick={() => setLiveToast('')} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError('')} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable App Body */}
        <main className="flex-1 p-4 pb-24 lg:pb-8 max-w-4xl w-full mx-auto">
          {!data ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading store controls...
            </div>
          ) : (
            <>
              {activeTab === 'orders' && (
                <AdminOrdersTab
                  orders={data.orders}
                  whatsappOrderNumber={data.settings.whatsappOrderNumber}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                />
              )}
              {activeTab === 'catalog' && (
                <AdminCatalogTab
                  token={token}
                  categories={data.categories}
                  products={data.products}
                  onRefresh={() => fetchBootstrap(token)}
                />
              )}
              {activeTab === 'offers' && (
                <AdminOffersTab
                  token={token}
                  coupons={data.coupons}
                  settings={data.settings}
                  onRefresh={() => fetchBootstrap(token)}
                />
              )}
              {activeTab === 'popup' && (
                <AdminPopupBannersTab
                  token={token}
                  popup={data.popup}
                  banners={data.banners}
                  onRefresh={() => fetchBootstrap(token)}
                />
              )}
              {activeTab === 'settings' && (
                <AdminSettingsTab
                  token={token}
                  settings={data.settings}
                  notifPermission={notifPermission}
                  onRequestNotifications={requestNotifications}
                  onSendTestNotification={sendTestNotification}
                  pwaInstallable={isInstallable}
                  pwaInstalled={isInstalled}
                  pwaIsIOS={isIOS}
                  onInstallPWA={install}
                  onRefresh={() => fetchBootstrap(token)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Navigation) */}
      <nav
        aria-label="Admin App Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center h-full cursor-pointer ${
                  isActive ? 'text-[#0066FF]' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1 tracking-tight">
                  {item.label}
                </span>
                {item.id === 'orders' && pendingCount > 0 && (
                  <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
