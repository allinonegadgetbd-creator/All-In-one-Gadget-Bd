import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSeedDatabase } from './seed.ts';
import { getPublicSupabaseConfig } from './auth.ts';
import type { StoreDatabase, Order, OrderItem, OrderStatus } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

let dbCache: StoreDatabase | null = null;
let supabaseServiceClient: SupabaseClient | null = null;
let supabaseAvailable = false;

function getSupabaseAdminOrUser(userJwt?: string): SupabaseClient | null {
  const { url, key: pubKey } = getPublicSupabaseConfig();
  const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (url && serviceKey) {
    if (!supabaseServiceClient) {
      supabaseServiceClient = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return supabaseServiceClient;
  }

  if (url && pubKey && userJwt) {
    return createClient(url, pubKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
  }

  return null;
}

function getSupabasePublic(): SupabaseClient | null {
  const { url, key } = getPublicSupabaseConfig();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapOrderRow(r: any): Order {
  return {
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
  };
}

export async function refreshOrdersFromSupabase(userJwt?: string): Promise<void> {
  const sb = getSupabaseAdminOrUser(userJwt);
  if (!sb || !dbCache) return;
  try {
    const { data: orderRows, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(orderRows)) {
      supabaseAvailable = true;
      dbCache.orders = orderRows.map(mapOrderRow);
    }
  } catch {
    // Non-fatal
  }
}

export async function initStore(): Promise<StoreDatabase> {
  if (dbCache) return dbCache;

  // 1. Try loading public store_state & orders from Supabase if available
  const sb = getSupabaseAdminOrUser() || getSupabasePublic();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('store_state')
        .select('payload')
        .eq('id', 'default')
        .maybeSingle();

      if (!error) {
        supabaseAvailable = true;
        if (data?.payload) {
          const loaded = data.payload as StoreDatabase;
          const adminSb = getSupabaseAdminOrUser();
          if (adminSb) {
            const { data: orderRows } = await adminSb
              .from('orders')
              .select('*')
              .order('created_at', { ascending: false });
            if (Array.isArray(orderRows)) {
              loaded.orders = orderRows.map(mapOrderRow);
            }
          }
          dbCache = loaded;
          return dbCache;
        }
      }
    } catch {
      supabaseAvailable = false;
    }
  }

  // 2. Fallback to local persistent JSON file
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as StoreDatabase;
      dbCache = parsed;
      return dbCache;
    }
  } catch {
    // Corrupted or unreadable, re-seed cleanly
  }

  dbCache = createSeedDatabase();
  await persistStore(dbCache);
  return dbCache;
}

export function getStoreSync(): StoreDatabase {
  if (!dbCache) {
    if (fs.existsSync(DATA_FILE)) {
      try {
        dbCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as StoreDatabase;
        return dbCache;
      } catch {
        // ignore
      }
    }
    dbCache = createSeedDatabase();
  }
  return dbCache;
}

export async function persistStore(nextDb: StoreDatabase, userJwt?: string): Promise<void> {
  dbCache = nextDb;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(nextDb, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Non-fatal in read-only containers if Supabase is primary
  }

  const sb = getSupabaseAdminOrUser(userJwt);
  if (sb) {
    try {
      const publicPayload: StoreDatabase = {
        ...nextDb,
        orders: [],
        adminCredential: null,
      };
      const { error } = await sb.from('store_state').upsert({
        id: 'default',
        payload: publicPayload,
        updated_at: new Date().toISOString(),
      });
      if (!error) supabaseAvailable = true;
    } catch {
      // Non-fatal
    }
  }
}

export async function insertPublicOrderToSupabase(order: Order): Promise<void> {
  const sb = getSupabaseAdminOrUser() || getSupabasePublic();
  if (!sb) return;
  try {
    await sb.from('orders').insert({
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
  } catch {
    // Non-fatal
  }
}

export async function updateOrderStatusInSupabase(
  orderId: string,
  status: OrderStatus,
  userJwt?: string
): Promise<void> {
  const sb = getSupabaseAdminOrUser(userJwt);
  if (!sb) return;
  try {
    await sb.from('orders').update({ status }).eq('id', orderId);
  } catch {
    // Non-fatal
  }
}

export async function deleteOrderFromSupabase(orderId: string, userJwt?: string): Promise<void> {
  const sb = getSupabaseAdminOrUser(userJwt);
  if (!sb) return;
  try {
    await sb.from('orders').delete().eq('id', orderId);
  } catch {
    // Non-fatal
  }
}

export function calculateOrderTotals(
  db: StoreDatabase,
  requestedItems: Array<{ productId: string; quantity: number; variationId?: string; variationLabel?: string }>,
  deliveryZone: 'inside_dhaka' | 'outside_dhaka',
  couponCode?: string
): {
  items: OrderItem[];
  subtotal: number;
  tierDiscount: number;
  appliedTierLabel?: string;
  couponDiscount: number;
  appliedCouponCode?: string;
  deliveryCharge: number;
  total: number;
} {
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

  // 1. Auto Tiered Shopping Discount (best matching active tier)
  let tierDiscount = 0;
  let appliedTierLabel: string | undefined;
  const activeTiers = (db.settings.discountTiers || [])
    .filter((t) => t.active && subtotal >= t.minSpend)
    .sort((a, b) => b.minSpend - a.minSpend);

  if (activeTiers.length > 0) {
    const bestTier = activeTiers[0];
    tierDiscount =
      bestTier.type === 'percent'
        ? Math.round((subtotal * bestTier.value) / 100)
        : Math.min(subtotal, bestTier.value);
    appliedTierLabel = bestTier.label;
  }

  // 2. Coupon Discount
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

  // 3. Delivery Charge
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

  return {
    items,
    subtotal,
    tierDiscount,
    appliedTierLabel,
    couponDiscount,
    appliedCouponCode,
    deliveryCharge,
    total,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getPublicSupabaseConfig();
  return Boolean(url && key) || supabaseAvailable;
}
