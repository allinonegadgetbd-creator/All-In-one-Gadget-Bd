import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assetUrl } from './assetUrl';
import type {
  Category,
  Coupon,
  HeroBanner,
  Order,
  OrderItem,
  OrderStatus,
  PopupConfig,
  Product,
  Review,
  SiteSettings,
  StorefrontData,
} from '../types';

export interface AdminBootstrapData {
  categories: Category[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  banners: HeroBanner[];
  popup: PopupConfig;
  settings: SiteSettings;
}

interface StorePayload {
  categories: Category[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  banners: HeroBanner[];
  popup: PopupConfig;
  settings: SiteSettings;
  reviews: Review[];
}

const LOCAL_STORE_KEY = 'aiog_static_store_v1';
const LOCAL_ORDERS_KEY = 'aiog_static_orders_v1';

// Public client-safe configuration (private secret keys NEVER live in client code)
const DEFAULT_PUBLIC_SUPABASE_URL = 'https://nrwelgnjmkomdginctex.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_KEY = 'sb_publishable_P_CQ5U1MtMt7_o2U26vw1w_ha2Mdk1J';
const DEFAULT_PUBLIC_CLOUDINARY_CLOUD = 'cf2cihes';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_PUBLIC_SUPABASE_URL).trim();
const SUPABASE_PUB_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLIC_SUPABASE_KEY
).trim();
const CLOUDINARY_CLOUD = (
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_PUBLIC_CLOUDINARY_CLOUD
).trim();
const CLOUDINARY_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

let sbClient: SupabaseClient | null = null;
function getBrowserSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUB_KEY) return null;
  if (!sbClient) {
    sbClient = createClient(SUPABASE_URL, SUPABASE_PUB_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return sbClient;
}

let backendModePromise: Promise<boolean> | null = null;

export async function isBackendAvailable(): Promise<boolean> {
  if (import.meta.env.VITE_STATIC_MODE === 'true') return false;
  if (!backendModePromise) {
    backendModePromise = fetch('/api/admin/auth/status')
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.includes('application/json');
      })
      .catch(() => false);
  }
  return backendModePromise;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function compressImageDataUrl(file: File, maxDim = 1000, quality = 0.82): Promise<string> {
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const compressed = canvas.toDataURL('image/webp', quality);
          resolve(compressed.length < rawUrl.length ? compressed : rawUrl);
        } catch {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function loadSeedJson(): Promise<StorePayload> {
  const res = await fetch(assetUrl('/store-seed.json'));
  if (!res.ok) throw new Error('Failed to load store catalog');
  return (await res.json()) as StorePayload;
}

async function loadStaticStore(): Promise<StorePayload> {
  const sb = getBrowserSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('store_state')
        .select('payload')
        .eq('id', 'default')
        .maybeSingle();
      if (!error && data?.payload) {
        const payload = data.payload as StorePayload;
        try {
          localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(payload));
        } catch {
          // ignore
        }
        return payload;
      }
    } catch {
      // Fallback cleanly to local/seed
    }
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORE_KEY);
    if (cached) {
      return JSON.parse(cached) as StorePayload;
    }
  } catch {
    // ignore
  }

  const seed = await loadSeedJson();
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(seed));
  } catch {
    // ignore
  }
  return seed;
}

async function saveStaticStore(next: StorePayload): Promise<void> {
  const sanitized = {
    ...next,
    orders: [],
    adminCredential: null,
  };
  const sb = getBrowserSupabase();
  if (sb) {
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Your admin session expired. Please sign in again.');
    }
    const { error } = await sb.from('store_state').upsert({
      id: 'default',
      payload: sanitized,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(error.message || 'Could not save to database.');
    }
  }
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore
  }
}

async function assertOkResponse(res: Response, fallbackMsg: string): Promise<void> {
  if (!res.ok) {
    let msg = fallbackMsg;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) msg = json.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

function computeOrderTotals(
  db: StorePayload,
  requestedItems: Array<{ productId: string; quantity: number; variationId?: string; variationLabel?: string }>,
  deliveryZone: 'inside_dhaka' | 'outside_dhaka',
  couponCode?: string
) {
  const items: OrderItem[] = [];
  let subtotal = 0;

  for (const reqItem of requestedItems) {
    const product = db.products.find((p) => p.id === reqItem.productId && p.active);
    if (!product) continue;
    const qty = Math.max(1, Math.min(50, Math.floor(Number(reqItem.quantity) || 1)));
    let unitPrice = product.price;
    let varLabel = reqItem.variationLabel;

    if (reqItem.variationId && product.variations.length > 0) {
      const v = product.variations.find((item) => item.id === reqItem.variationId);
      if (v) {
        unitPrice = Math.max(0, product.price + (v.priceDelta || 0));
        varLabel = [v.color, v.size].filter(Boolean).join(' / ') || varLabel;
      }
    }

    subtotal += unitPrice * qty;
    items.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: unitPrice,
      quantity: qty,
      variationLabel: varLabel,
    });
  }

  let tierDiscount = 0;
  const activeTier = (db.settings.discountTiers || [])
    .filter((t) => t.active && subtotal >= t.minSpend)
    .sort((a, b) => b.minSpend - a.minSpend)[0];

  if (activeTier) {
    tierDiscount =
      activeTier.type === 'percent'
        ? Math.round((subtotal * activeTier.value) / 100)
        : Math.min(subtotal, activeTier.value);
  }

  let couponDiscount = 0;
  let appliedCouponCode: string | undefined;
  const cleanCode = (couponCode || '').trim().toUpperCase();
  if (cleanCode) {
    const coupon = db.coupons.find((c) => c.active && c.code.toUpperCase() === cleanCode);
    if (coupon && subtotal >= coupon.minSpend) {
      const afterTier = Math.max(0, subtotal - tierDiscount);
      couponDiscount =
        coupon.type === 'percent'
          ? Math.round((afterTier * coupon.value) / 100)
          : Math.min(afterTier, coupon.value);
      appliedCouponCode = coupon.code;
    }
  }

  let deliveryCharge = 0;
  if (db.settings.deliveryChargeEnabled) {
    const freeMin = db.settings.freeDeliveryMinSpend || 0;
    if (freeMin > 0 && subtotal >= freeMin) {
      deliveryCharge = 0;
    } else {
      deliveryCharge =
        deliveryZone === 'inside_dhaka' ? db.settings.insideDhakaFee : db.settings.outsideDhakaFee;
    }
  }

  const total = Math.max(0, subtotal - tierDiscount - couponDiscount + deliveryCharge);
  return { items, subtotal, tierDiscount, couponDiscount, appliedCouponCode, deliveryCharge, total };
}

export const storeClient = {
  async getStorefront(): Promise<StorefrontData> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/storefront');
      return (await res.json()) as StorefrontData;
    }
    const db = await loadStaticStore();
    return {
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      products: db.products.filter((p) => p.active),
      banners: db.banners.filter((b) => b.active).sort((a, b) => a.order - b.order),
      popup: db.popup,
      settings: db.settings,
      reviews: db.reviews,
    };
  },

  async getProductBySlug(
    slug: string
  ): Promise<{ product: Product; related: Product[]; settings: SiteSettings } | null> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      return (await res.json()) as { product: Product; related: Product[]; settings: SiteSettings };
    }
    const db = await loadStaticStore();
    const product = db.products.find((p) => p.active && (p.slug === slug || p.id === slug));
    if (!product) return null;
    const related = db.products
      .filter((p) => p.active && p.categoryId === product.categoryId && p.id !== product.id)
      .slice(0, 4);
    return { product, related, settings: db.settings };
  },

  async validateCoupon(
    code: string,
    subtotal: number
  ): Promise<{
    ok: boolean;
    valid: boolean;
    message?: string;
    coupon?: { code: string; type: 'percent' | 'fixed'; value: number; minSpend: number };
  }> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const json = await res.json();
      return { ok: res.ok, ...json };
    }

    const db = await loadStaticStore();
    const clean = code.trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.active && c.code.toUpperCase() === clean);
    if (!coupon) {
      return { ok: false, valid: false, message: 'Invalid or expired coupon code.' };
    }
    if (subtotal < coupon.minSpend) {
      return {
        ok: false,
        valid: false,
        message: `Minimum spend ৳${coupon.minSpend.toLocaleString()} required for ${coupon.code}.`,
      };
    }
    return {
      ok: true,
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minSpend: coupon.minSpend,
      },
    };
  },

  async createOrder(payload: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryZone: 'inside_dhaka' | 'outside_dhaka';
    couponCode?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number; variationId?: string; variationLabel?: string }>;
  }): Promise<{ ok: boolean; order?: Order; error?: string }> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return { ok: res.ok, order: json.order, error: json.error };
    }

    const name = payload.customerName.trim();
    const phone = payload.customerPhone.trim();
    const addr = payload.customerAddress.trim();
    if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
    if (phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'Please enter a valid mobile number.' };
    if (addr.length < 5) return { ok: false, error: 'Please enter your delivery address.' };

    const db = await loadStaticStore();
    const calc = computeOrderTotals(db, payload.items, payload.deliveryZone, payload.couponCode);
    if (calc.items.length === 0) return { ok: false, error: 'Your cart is empty.' };

    const uniqueSeq = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
    const order: Order = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderNumber: `AIOG-${uniqueSeq}`,
      customerName: name,
      customerPhone: phone,
      customerAddress: addr,
      deliveryZone: payload.deliveryZone,
      items: calc.items,
      subtotal: calc.subtotal,
      tierDiscount: calc.tierDiscount,
      couponCode: calc.appliedCouponCode,
      couponDiscount: calc.couponDiscount,
      deliveryCharge: calc.deliveryCharge,
      total: calc.total,
      status: 'Pending',
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    const sb = getBrowserSupabase();
    if (sb) {
      const { error } = await sb.from('orders').insert({
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_address: order.customerAddress,
        delivery_zone: order.deliveryZone,
        items: order.items,
        subtotal: order.subtotal,
        tier_discount: order.tierDiscount,
        coupon_code: order.couponCode || null,
        coupon_discount: order.couponDiscount,
        delivery_charge: order.deliveryCharge,
        total: order.total,
        status: order.status,
        notes: order.notes || null,
        created_at: order.createdAt,
      });
      if (error && error.code === '42501') {
        return { ok: false, error: 'Please check your name, mobile number, and address.' };
      }
    }

    try {
      const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([order, ...localOrders]));
    } catch {
      // ignore
    }

    return { ok: true, order };
  },

  async trackOrder(orderNumber: string, phone: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    if (await isBackendAvailable()) {
      const res = await fetch(
        `/api/orders/track/${encodeURIComponent(orderNumber.trim())}?phone=${encodeURIComponent(phone.trim())}`
      );
      const data = await res.json();
      return { ok: res.ok, data: res.ok ? data : undefined, error: data.error };
    }

    const cleanNum = orderNumber.trim().toUpperCase();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return { ok: false, error: 'Enter at least the last 4 digits of your phone.' };

    const sb = getBrowserSupabase();
    if (sb) {
      try {
        const { data } = await sb.rpc('track_order_public', {
          p_order_number: cleanNum,
          p_phone_last4: digits.slice(-4),
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          return {
            ok: true,
            data: {
              orderNumber: row.order_number,
              status: row.status,
              customerName: row.customer_name,
              items: row.items,
              total: row.total,
              createdAt: row.created_at,
            },
          };
        }
      } catch {
        // fallback below
      }
    }

    const db = await loadStaticStore();
    const localOrders: Order[] = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    const all = [...localOrders, ...(db.orders || [])];
    const found = all.find(
      (o) =>
        o.orderNumber.toUpperCase() === cleanNum &&
        o.customerPhone.replace(/\D/g, '').endsWith(digits.slice(-4))
    );
    if (!found) return { ok: false, error: 'Order not found or phone does not match.' };
    return {
      ok: true,
      data: {
        orderNumber: found.orderNumber,
        status: found.status,
        customerName: found.customerName,
        items: found.items,
        total: found.total,
        createdAt: found.createdAt,
      },
    };
  },

  async getAuthStatus(): Promise<{
    authMode: 'supabase' | 'passcode';
    needsSetup: boolean;
    supabaseConfigured: boolean;
    staticHosted: boolean;
    existingToken?: string;
  }> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/auth/status');
      const json = await res.json();
      return { ...json, staticHosted: false };
    }

    const sb = getBrowserSupabase();
    let existingToken: string | undefined;
    if (sb) {
      const { data } = await sb.auth.getSession();
      existingToken = data.session?.access_token;
    }
    return {
      authMode: 'supabase',
      needsSetup: false,
      supabaseConfigured: Boolean(sb),
      staticHosted: true,
      existingToken,
    };
  },

  async loginAdmin(params: {
    mode: 'supabase' | 'passcode';
    needsSetup?: boolean;
    email?: string;
    password?: string;
    passcode?: string;
  }): Promise<{ ok: boolean; token?: string; error?: string }> {
    if (await isBackendAvailable()) {
      const endpoint =
        params.mode === 'supabase'
          ? '/api/admin/auth/login'
          : params.needsSetup
            ? '/api/admin/auth/setup'
            : '/api/admin/auth/login';
      const body =
        params.mode === 'supabase'
          ? { email: params.email, password: params.password }
          : { passcode: params.passcode };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      return { ok: res.ok, token: json.token, error: json.error };
    }

    const sb = getBrowserSupabase();
    if (!sb) {
      return { ok: false, error: 'Authentication service is unavailable.' };
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: (params.email || '').trim(),
      password: params.password || '',
    });
    if (error || !data.session) {
      return { ok: false, error: error?.message || 'Invalid email or password.' };
    }
    return { ok: true, token: data.session.access_token };
  },

  async logoutAdmin(): Promise<void> {
    const sb = getBrowserSupabase();
    if (sb) await sb.auth.signOut().catch(() => undefined);
  },

  async getAdminBootstrap(token: string): Promise<AdminBootstrapData | null> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as AdminBootstrapData;
    }

    const sb = getBrowserSupabase();
    if (sb) {
      const { data: sessionData } = await sb.auth.getSession();
      if (!sessionData.session) return null;
    }

    const db = await loadStaticStore();
    let orders: Order[] = db.orders || [];
    if (sb) {
      const { data: rows, error } = await sb
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && rows) {
        orders = rows.map((r: any) => ({
          id: r.id,
          orderNumber: r.order_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          customerAddress: r.customer_address,
          deliveryZone: r.delivery_zone,
          items: r.items || [],
          subtotal: r.subtotal,
          tierDiscount: r.tier_discount || 0,
          couponCode: r.coupon_code || undefined,
          couponDiscount: r.coupon_discount || 0,
          deliveryCharge: r.delivery_charge || 0,
          total: r.total,
          status: r.status,
          notes: r.notes || undefined,
          createdAt: r.created_at,
        }));
      }
    }

    return {
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      products: db.products,
      orders,
      coupons: db.coupons,
      banners: [...db.banners].sort((a, b) => a.order - b.order),
      popup: db.popup,
      settings: db.settings,
    };
  },

  subscribeAdminOrders(token: string, onNewOrder: (order: Order) => void): () => void {
    let cleanup = () => {};

    isBackendAvailable().then((hasBackend) => {
      if (hasBackend) {
        const es = new EventSource(`/api/admin/orders/stream?token=${encodeURIComponent(token)}`);
        es.addEventListener('new_order', (event) => {
          try {
            onNewOrder(JSON.parse((event as MessageEvent).data) as Order);
          } catch {
            // ignore
          }
        });
        cleanup = () => es.close();
      } else {
        const sb = getBrowserSupabase();
        if (!sb) return;
        const channel = sb
          .channel('admin-orders-realtime')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
              const r: any = payload.new;
              if (!r) return;
              onNewOrder({
                id: r.id,
                orderNumber: r.order_number,
                customerName: r.customer_name,
                customerPhone: r.customer_phone,
                customerAddress: r.customer_address,
                deliveryZone: r.delivery_zone,
                items: r.items || [],
                subtotal: r.subtotal,
                tierDiscount: r.tier_discount || 0,
                couponCode: r.coupon_code || undefined,
                couponDiscount: r.coupon_discount || 0,
                deliveryCharge: r.delivery_charge || 0,
                total: r.total,
                status: r.status,
                notes: r.notes || undefined,
                createdAt: r.created_at,
              });
            }
          )
          .subscribe();
        cleanup = () => {
          sb.removeChannel(channel);
        };
      }
    });

    return () => cleanup();
  },

  async updateOrderStatus(token: string, orderId: string, status: OrderStatus): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      await assertOkResponse(res, 'Failed to update order status.');
      return;
    }
    const sb = getBrowserSupabase();
    if (sb) {
      const { error } = await sb.from('orders').update({ status }).eq('id', orderId);
      if (error) throw new Error(error.message || 'Failed to update order status.');
    }
  },

  async deleteOrder(token: string, orderId: string): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await assertOkResponse(res, 'Failed to delete order.');
      return;
    }
    const sb = getBrowserSupabase();
    if (sb) {
      const { error } = await sb.from('orders').delete().eq('id', orderId);
      if (error) throw new Error(error.message || 'Failed to delete order.');
    }
  },

  async saveProduct(
    token: string,
    isNew: boolean,
    editingId: string | undefined,
    payload: Partial<Product>
  ): Promise<void> {
    if (await isBackendAvailable()) {
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      await assertOkResponse(res, 'Failed to save product.');
      return;
    }
    const db = await loadStaticStore();
    const cat = db.categories.find((c) => c.id === payload.categoryId) || db.categories[0];
    if (isNew) {
      const id = `p-${crypto.randomUUID().slice(0, 8)}`;
      const prod: Product = {
        id,
        name: payload.name || 'New Gadget',
        slug: slugify(`${payload.name || 'gadget'}-${id}`),
        categoryId: cat?.id || 'cat-earbuds',
        categoryName: cat?.name || 'Gadgets',
        price: Number(payload.price) || 0,
        compareAtPrice: payload.compareAtPrice,
        image: payload.image || '/products/p01_im1.jpg',
        description: payload.description || '',
        tag: payload.tag || undefined,
        stock: Number(payload.stock ?? 20),
        active: payload.active !== false,
        featured: Boolean(payload.featured),
        variations: payload.variations || [],
        createdAt: new Date().toISOString(),
      };
      db.products.unshift(prod);
    } else {
      db.products = db.products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              ...payload,
              categoryId: cat ? cat.id : p.categoryId,
              categoryName: cat ? cat.name : p.categoryName,
            }
          : p
      );
    }
    await saveStaticStore(db);
  },

  async deleteProduct(token: string, id: string): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await assertOkResponse(res, 'Failed to delete product.');
      return;
    }
    const db = await loadStaticStore();
    db.products = db.products.filter((p) => p.id !== id);
    await saveStaticStore(db);
  },

  async addCategory(token: string, name: string): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      await assertOkResponse(res, 'Failed to create category.');
      return;
    }
    const db = await loadStaticStore();
    db.categories.push({
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      slug: slugify(name),
      order: db.categories.length + 1,
    });
    await saveStaticStore(db);
  },

  async deleteCategory(token: string, id: string): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await assertOkResponse(res, 'Failed to delete category.');
      return;
    }
    const db = await loadStaticStore();
    db.categories = db.categories.filter((c) => c.id !== id);
    await saveStaticStore(db);
  },

  async addCoupon(token: string, coupon: Omit<Coupon, 'id'>): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(coupon),
      });
      await assertOkResponse(res, 'Failed to add coupon.');
      return;
    }
    const db = await loadStaticStore();
    db.coupons.unshift({ id: `cpn-${crypto.randomUUID().slice(0, 6)}`, ...coupon });
    await saveStaticStore(db);
  },

  async toggleCoupon(token: string, coupon: Coupon): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !coupon.active }),
      });
      await assertOkResponse(res, 'Failed to update coupon.');
      return;
    }
    const db = await loadStaticStore();
    db.coupons = db.coupons.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c));
    await saveStaticStore(db);
  },

  async deleteCoupon(token: string, id: string): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await assertOkResponse(res, 'Failed to delete coupon.');
      return;
    }
    const db = await loadStaticStore();
    db.coupons = db.coupons.filter((c) => c.id !== id);
    await saveStaticStore(db);
  },

  async saveSettings(token: string, partial: Partial<SiteSettings>): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(partial),
      });
      await assertOkResponse(res, 'Failed to save settings.');
      return;
    }
    const db = await loadStaticStore();
    db.settings = {
      ...db.settings,
      ...partial,
      socialLinks: {
        ...db.settings.socialLinks,
        ...(partial.socialLinks || {}),
      },
      discountTiers: Array.isArray(partial.discountTiers)
        ? partial.discountTiers
        : db.settings.discountTiers,
    };
    await saveStaticStore(db);
  },

  async savePopup(token: string, popup: PopupConfig): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(popup),
      });
      await assertOkResponse(res, 'Failed to save popup.');
      return;
    }
    const db = await loadStaticStore();
    db.popup = popup;
    await saveStaticStore(db);
  },

  async saveBanners(token: string, banners: HeroBanner[]): Promise<void> {
    if (await isBackendAvailable()) {
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ banners }),
      });
      await assertOkResponse(res, 'Failed to save banners.');
      return;
    }
    const db = await loadStaticStore();
    db.banners = banners;
    await saveStaticStore(db);
  },

  async uploadImage(token: string, file: File): Promise<string | null> {
    if (await isBackendAvailable()) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      return data.url || null;
    }

    if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (json.secure_url) return json.secure_url;
      } catch {
        // fallback cleanly to compressed client image
      }
    }

    return await compressImageDataUrl(file);
  },
};
