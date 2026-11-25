import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSeedDatabase } from './seed.ts';
import type { StoreDatabase, Order, OrderItem } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

let dbCache: StoreDatabase | null = null;
let supabaseClient: SupabaseClient | null = null;
let supabaseAvailable = false;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

export async function initStore(): Promise<StoreDatabase> {
  if (dbCache) return dbCache;

  // 1. Try loading from Supabase if configured
  const sb = getSupabase();
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
          dbCache = data.payload as StoreDatabase;
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
      const v1ToV2: Record<string, string> = {
        '/src/assets/images/hero_banner_audio_watch_1795593261882.jpg':
          '/src/assets/images/hero_campaign_audio_watch_v2_1795595150933.jpg',
        '/src/assets/images/hero_banner_power_charging_1795593262469.jpg':
          '/src/assets/images/hero_campaign_power_charge_v2_1795595150816.jpg',
        '/src/assets/images/hero_banner_smart_lifestyle_1795593263595.jpg':
          '/src/assets/images/hero_campaign_smart_living_v2_1795595151239.jpg',
      };
      let changed = false;
      parsed.banners = (parsed.banners || []).map((b) => {
        if (v1ToV2[b.image]) {
          changed = true;
          return { ...b, image: v1ToV2[b.image] };
        }
        return b;
      });
      dbCache = parsed;
      if (changed) await persistStore(dbCache);
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

export async function persistStore(nextDb: StoreDatabase): Promise<void> {
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

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('store_state').upsert({
        id: 'default',
        payload: nextDb,
        updated_at: new Date().toISOString(),
      });
      if (!error) supabaseAvailable = true;
    } catch {
      // Non-fatal
    }
  }
}

export async function syncOrderToSupabase(order: Order): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('orders').upsert({
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
  return Boolean((process.env.SUPABASE_URL || '').trim() && (process.env.SUPABASE_SECRET_KEY || '').trim());
}
