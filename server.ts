import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import type { Request, Response } from 'express';
import {
  initStore,
  getStoreSync,
  persistStore,
  insertPublicOrderToSupabase,
  updateOrderStatusInSupabase,
  deleteOrderFromSupabase,
  refreshOrdersFromSupabase,
  calculateOrderTotals,
  isSupabaseConfigured,
} from './server/store.ts';
import {
  hashPasscode,
  verifyPasscode,
  needsFirstRunSetup,
  createAdminToken,
  getSessionSupabaseJwt,
  requireAdmin,
  isSupabaseAuthEnabled,
  verifySupabaseUserLogin,
} from './server/auth.ts';
import type { Order, OrderStatus, Product, Category, Coupon } from './server/types.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure Cloudinary if env credentials exist
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const cloudKey = (process.env.CLOUDINARY_API_KEY || '').trim();
const cloudSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
const cloudinaryConfigured = Boolean(cloudName && cloudKey && cloudSecret);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudKey,
    api_secret: cloudSecret,
    secure: true,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// SSE connected admin clients for real-time order notifications
const sseClients = new Set<Response>();

function broadcastOrderEvent(order: Order): void {
  const payload = `event: new_order\ndata: ${JSON.stringify(order)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectAdminManifest(html: string, reqPath: string): string {
  if (reqPath.startsWith('/admin')) {
    if (!html.includes('admin-manifest.webmanifest')) {
      return html.replace(
        '</head>',
        '  <link rel="manifest" href="/admin-manifest.webmanifest" />\n  </head>'
      );
    }
  }
  return html;
}

function injectProductSeoMeta(html: string, reqPath: string, baseUrl: string): string {
  const cleanPath = reqPath.split('?')[0];
  if (!cleanPath.startsWith('/product/')) return html;

  const slug = decodeURIComponent(cleanPath.slice('/product/'.length).replace(/\/+$/, ''));
  if (!slug) return html;

  const db = getStoreSync();
  const product = db.products.find((p) => p.active && (p.slug === slug || p.id === slug));
  if (!product) return html;

  const title = escapeHtmlAttr(`${product.name} — ৳${product.price.toLocaleString()} | All In One Gadget`);
  const desc = escapeHtmlAttr(
    `${product.description || product.name} Order online for ৳${product.price.toLocaleString()} with fast Cash on Delivery across Bangladesh.`
  );
  const absImg = product.image.startsWith('http')
    ? product.image
    : `${baseUrl}${product.image.startsWith('/') ? '' : '/'}${product.image}`;
  const canonicalUrl = escapeHtmlAttr(`${baseUrl}/product/${product.slug}`);

  let updated = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${desc}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${desc}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${escapeHtmlAttr(absImg)}" />`
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="product" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${title}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${desc}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtmlAttr(absImg)}" />`
    );

  const extraMeta = `  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="BDT" />`;

  return updated.replace('</head>', `${extraMeta}\n  </head>`);
}

// Simple in-memory rate limiter for auth endpoints
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

async function startServer() {
  await initStore();

  const app = express();
  const httpServer = http.createServer(app);
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // Baseline Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Serve static uploaded files & product assets
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/products', express.static(path.resolve(ROOT_DIR, 'public', 'products')));
  app.use('/assets', express.static(path.resolve(ROOT_DIR, 'public', 'assets')));

  // =========================
  // SEO Routes (Sitemap & Robots)
  // =========================
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\n\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const db = getStoreSync();
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const urls = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...db.categories.map(
        (c) => `<url><loc>${baseUrl}/?category=${encodeURIComponent(c.slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
      ...db.products
        .filter((p) => p.active)
        .map(
          (p) => `<url><loc>${baseUrl}/product/${encodeURIComponent(p.slug)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`
        ),
    ];
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    );
  });

  // =========================
  // Public Storefront APIs
  // =========================
  app.get('/api/storefront', (_req, res) => {
    const db = getStoreSync();
    res.json({
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      products: db.products.filter((p) => p.active),
      banners: db.banners.filter((b) => b.active).sort((a, b) => a.order - b.order),
      popup: db.popup,
      settings: db.settings,
      reviews: db.reviews,
      activeCouponsCount: db.coupons.filter((c) => c.active).length,
    });
  });

  app.get('/api/products/:slug', (req, res) => {
    const db = getStoreSync();
    const slug = String(req.params.slug || '').trim();
    const product = db.products.find((p) => p.active && (p.slug === slug || p.id === slug));
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const related = db.products
      .filter((p) => p.active && p.categoryId === product.categoryId && p.id !== product.id)
      .slice(0, 4);
    res.json({
      product,
      related,
      settings: db.settings,
    });
  });

  app.post('/api/coupons/validate', (req, res) => {
    const db = getStoreSync();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const subtotal = Number(req.body?.subtotal || 0);

    if (!code) {
      res.status(400).json({ valid: false, message: 'Enter a coupon code.' });
      return;
    }

    const coupon = db.coupons.find((c) => c.active && c.code.toUpperCase() === code);
    if (!coupon) {
      res.status(404).json({ valid: false, message: 'Invalid or expired coupon code.' });
      return;
    }

    if (subtotal < coupon.minSpend) {
      res.status(400).json({
        valid: false,
        message: `Minimum spend ৳${coupon.minSpend.toLocaleString()} required for ${coupon.code}.`,
      });
      return;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minSpend: coupon.minSpend,
      },
    });
  });

  app.post('/api/orders', async (req, res) => {
    const db = getStoreSync();
    const customerName = String(req.body?.customerName || '').trim();
    const customerPhone = String(req.body?.customerPhone || '').trim();
    const customerAddress = String(req.body?.customerAddress || '').trim();
    const deliveryZone = req.body?.deliveryZone === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
    const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim() : undefined;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 300) : undefined;
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!customerName || customerName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      res.status(400).json({ error: 'Please enter a valid mobile number.' });
      return;
    }
    if (!customerAddress || customerAddress.length < 5) {
      res.status(400).json({ error: 'Please enter your delivery address.' });
      return;
    }
    if (rawItems.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const calc = calculateOrderTotals(db, rawItems, deliveryZone, couponCode);
    if (calc.items.length === 0) {
      res.status(400).json({ error: 'Selected products are unavailable.' });
      return;
    }

    const nextSeq = 1043 + db.orders.length;
    const order: Order = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderNumber: `AIOG-${nextSeq}`,
      customerName,
      customerPhone,
      customerAddress,
      deliveryZone,
      items: calc.items,
      subtotal: calc.subtotal,
      tierDiscount: calc.tierDiscount,
      couponCode: calc.appliedCouponCode,
      couponDiscount: calc.couponDiscount,
      deliveryCharge: calc.deliveryCharge,
      total: calc.total,
      status: 'Pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(order);
    await persistStore(db);
    await insertPublicOrderToSupabase(order);
    broadcastOrderEvent(order);

    res.status(201).json({ order });
  });

  app.get('/api/orders/track/:orderNumber', (req, res) => {
    const db = getStoreSync();
    const orderNum = String(req.params.orderNumber || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').replace(/\D/g, '');
    const order = db.orders.find((o) => o.orderNumber.toUpperCase() === orderNum);

    if (!order) {
      res.status(404).json({ error: 'Order not found. Check your Order ID.' });
      return;
    }

    if (phone.length < 4 || !order.customerPhone.replace(/\D/g, '').endsWith(phone.slice(-4))) {
      res.status(403).json({ error: 'Phone number does not match this order.' });
      return;
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      deliveryZone: order.deliveryZone,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
    });
  });

  // =========================
  // Admin Authentication APIs
  // =========================
  app.get('/api/admin/auth/status', (_req, res) => {
    const db = getStoreSync();
    const supabaseAuth = isSupabaseAuthEnabled();
    res.json({
      authMode: supabaseAuth ? 'supabase' : 'passcode',
      needsSetup: needsFirstRunSetup(db.adminCredential),
      supabaseConfigured: isSupabaseConfigured(),
    });
  });

  app.post('/api/admin/auth/setup', async (req, res) => {
    const db = getStoreSync();
    if (!needsFirstRunSetup(db.adminCredential)) {
      res.status(403).json({ error: 'Admin access is already configured.' });
      return;
    }
    const passcode = String(req.body?.passcode || '').trim();
    if (passcode.length < 4) {
      res.status(400).json({ error: 'Passcode must be at least 4 characters.' });
      return;
    }
    const { salt, hash } = hashPasscode(passcode);
    db.adminCredential = {
      salt,
      hash,
      claimedAt: new Date().toISOString(),
    };
    await persistStore(db);
    const token = createAdminToken();
    res.json({ token });
  });

  app.post('/api/admin/auth/login', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkLoginRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
      return;
    }

    if (isSupabaseAuthEnabled()) {
      const email = String(req.body?.email || '').trim();
      const password = String(req.body?.password || '');
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const result = await verifySupabaseUserLogin(email, password);
      if (!result.ok) {
        res.status(401).json({ error: result.error || 'Invalid credentials.' });
        return;
      }
      const token = createAdminToken(result.email, result.supabaseJwt);
      await refreshOrdersFromSupabase(result.supabaseJwt);
      res.json({ token, email: result.email });
      return;
    }

    const db = getStoreSync();
    if (needsFirstRunSetup(db.adminCredential)) {
      res.status(400).json({ error: 'Please set up your admin passcode first.' });
      return;
    }
    const passcode = String(req.body?.passcode || '').trim();
    if (!verifyPasscode(passcode, db.adminCredential)) {
      res.status(401).json({ error: 'Incorrect admin passcode.' });
      return;
    }
    const token = createAdminToken();
    res.json({ token });
  });

  // =========================
  // Protected Admin APIs
  // =========================
  app.get('/api/admin/bootstrap', requireAdmin, async (req, res) => {
    await refreshOrdersFromSupabase(getSessionSupabaseJwt(req));
    const db = getStoreSync();
    res.json({
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      products: db.products,
      orders: db.orders,
      coupons: db.coupons,
      banners: [...db.banners].sort((a, b) => a.order - b.order),
      popup: db.popup,
      settings: db.settings,
      reviews: db.reviews,
      integrations: {
        cloudinary: cloudinaryConfigured,
        supabase: isSupabaseConfigured(),
      },
    });
  });

  app.get('/api/admin/orders/stream', requireAdmin, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write('event: connected\ndata: {"ok":true}\n\n');

    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const validStatuses: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    const status = req.body?.status as OrderStatus;
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    order.status = status;
    const sbJwt = getSessionSupabaseJwt(req);
    await persistStore(db, sbJwt);
    await updateOrderStatusInSupabase(order.id, status, sbJwt);
    res.json({ order });
  });

  app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const sbJwt = getSessionSupabaseJwt(req);
    db.orders = db.orders.filter((o) => o.id !== req.params.id);
    await persistStore(db, sbJwt);
    await deleteOrderFromSupabase(String(req.params.id), sbJwt);
    res.json({ ok: true });
  });

  // Products CRUD
  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Product name is required.' });
      return;
    }
    const cat = db.categories.find((c) => c.id === body.categoryId) || db.categories[0];
    const id = `p-${crypto.randomUUID().slice(0, 8)}`;
    const product: Product = {
      id,
      name,
      slug: slugify(`${name}-${id}`),
      categoryId: cat ? cat.id : 'cat-earbuds',
      categoryName: cat ? cat.name : 'Gadgets',
      price: Math.max(0, Number(body.price) || 0),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
      image: String(body.image || '/products/p01_im1.jpg').trim(),
      description: String(body.description || '').trim(),
      tag: body.tag ? String(body.tag).trim() : undefined,
      stock: Math.max(0, Number(body.stock ?? 20)),
      active: body.active !== false,
      featured: Boolean(body.featured),
      variations: Array.isArray(body.variations) ? body.variations : [],
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(product);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.status(201).json({ product });
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const body = req.body || {};
    const current = db.products[idx];
    const cat = db.categories.find((c) => c.id === body.categoryId);
    const updated: Product = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      categoryId: cat ? cat.id : current.categoryId,
      categoryName: cat ? cat.name : current.categoryName,
      price: body.price !== undefined ? Math.max(0, Number(body.price)) : current.price,
      compareAtPrice: body.compareAtPrice !== undefined ? (body.compareAtPrice ? Number(body.compareAtPrice) : undefined) : current.compareAtPrice,
      image: body.image !== undefined ? String(body.image).trim() : current.image,
      description: body.description !== undefined ? String(body.description).trim() : current.description,
      tag: body.tag !== undefined ? (String(body.tag).trim() || undefined) : current.tag,
      stock: body.stock !== undefined ? Math.max(0, Number(body.stock)) : current.stock,
      active: body.active !== undefined ? Boolean(body.active) : current.active,
      featured: body.featured !== undefined ? Boolean(body.featured) : current.featured,
      variations: Array.isArray(body.variations) ? body.variations : current.variations,
    };
    db.products[idx] = updated;
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ product: updated });
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    db.products = db.products.filter((p) => p.id !== req.params.id);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ ok: true });
  });

  // Categories CRUD
  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const category: Category = {
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      slug: slugify(name),
      order: db.categories.length + 1,
    };
    db.categories.push(category);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.status(201).json({ category });
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const cat = db.categories.find((c) => c.id === req.params.id);
    if (!cat) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    if (name) {
      cat.name = name;
      cat.slug = slugify(name);
      db.products.forEach((p) => {
        if (p.categoryId === cat.id) p.categoryName = name;
      });
    }
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ category: cat });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ ok: true });
  });

  // Coupons CRUD
  app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Coupon code is required.' });
      return;
    }
    const coupon: Coupon = {
      id: `cpn-${crypto.randomUUID().slice(0, 6)}`,
      code,
      type: req.body?.type === 'percent' ? 'percent' : 'fixed',
      value: Math.max(1, Number(req.body?.value) || 0),
      minSpend: Math.max(0, Number(req.body?.minSpend) || 0),
      active: req.body?.active !== false,
    };
    db.coupons.unshift(coupon);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.status(201).json({ coupon });
  });

  app.put('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const coupon = db.coupons.find((c) => c.id === req.params.id);
    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    if (req.body?.code !== undefined) coupon.code = String(req.body.code).trim().toUpperCase();
    if (req.body?.type !== undefined) coupon.type = req.body.type === 'percent' ? 'percent' : 'fixed';
    if (req.body?.value !== undefined) coupon.value = Math.max(1, Number(req.body.value));
    if (req.body?.minSpend !== undefined) coupon.minSpend = Math.max(0, Number(req.body.minSpend));
    if (req.body?.active !== undefined) coupon.active = Boolean(req.body.active);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ coupon });
  });

  app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    db.coupons = db.coupons.filter((c) => c.id !== req.params.id);
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ ok: true });
  });

  // Settings, Popup & Hero Banners
  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    const incoming = req.body || {};
    db.settings = {
      ...db.settings,
      ...incoming,
      socialLinks: {
        ...db.settings.socialLinks,
        ...(incoming.socialLinks || {}),
      },
      discountTiers: Array.isArray(incoming.discountTiers)
        ? incoming.discountTiers
        : db.settings.discountTiers,
    };
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ settings: db.settings });
  });

  app.put('/api/admin/popup', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    db.popup = {
      ...db.popup,
      ...(req.body || {}),
    };
    await persistStore(db, getSessionSupabaseJwt(req));
    res.json({ popup: db.popup });
  });

  app.put('/api/admin/banners', requireAdmin, async (req, res) => {
    const db = getStoreSync();
    if (Array.isArray(req.body?.banners)) {
      db.banners = req.body.banners;
      await persistStore(db, getSessionSupabaseJwt(req));
    }
    res.json({ banners: db.banners });
  });

  // Image Upload (Cloudinary when configured, otherwise local server upload)
  app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    if (cloudinaryConfigured) {
      try {
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'all-in-one-gadget', resource_type: 'image' },
            (error, uploadResult) => {
              if (error || !uploadResult) reject(error || new Error('Upload failed'));
              else resolve(uploadResult);
            }
          );
          stream.end(req.file!.buffer);
        });
        res.json({ url: result.secure_url, provider: 'cloudinary' });
        return;
      } catch (err) {
        console.error('Cloudinary upload failed, falling back to local storage:', err);
      }
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
    const targetPath = path.resolve(UPLOADS_DIR, filename);
    if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    fs.writeFileSync(targetPath, req.file.buffer);
    res.json({ url: `/uploads/${filename}`, provider: 'local' });
  });

  // =========================
  // Frontend Serving (Vite Dev / Static Prod)
  // =========================
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: true,
        ws: { server: httpServer },
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      if (
        req.method === 'GET' &&
        (req.originalUrl.startsWith('/admin') || req.originalUrl.startsWith('/product/')) &&
        !req.originalUrl.includes('.') &&
        (req.headers.accept || '').includes('text/html')
      ) {
        try {
          const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
          let template = fs.readFileSync(path.resolve(ROOT_DIR, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          template = injectAdminManifest(template, req.originalUrl);
          template = injectProductSeoMeta(template, req.originalUrl, baseUrl);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
          return;
        }
      }
      next();
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        let template = fs.readFileSync(path.resolve(ROOT_DIR, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        template = injectAdminManifest(template, req.originalUrl);
        template = injectProductSeoMeta(template, req.originalUrl, baseUrl);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir, { index: false }));

    app.use('*', (req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        res.status(500).send('Build not found. Run npm run build first.');
        return;
      }
      const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      let html = fs.readFileSync(indexPath, 'utf-8');
      html = injectAdminManifest(html, req.originalUrl);
      html = injectProductSeoMeta(html, req.originalUrl, baseUrl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`All In One Gadget server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
