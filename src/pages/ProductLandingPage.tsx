import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
} from 'lucide-react';
import { TopMarqueeBar } from '../components/storefront/TopMarqueeBar';
import { Header } from '../components/storefront/Header';
import { Footer } from '../components/storefront/Footer';
import { CheckoutDrawer } from '../components/storefront/CheckoutDrawer';
import { TrackOrderModal } from '../components/storefront/TrackOrderModal';
import { trackMetaEvent } from '../utils/metaPixel';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';
import type { CartItem, Order, Product, ProductVariation, SiteSettings } from '../types';

interface ProductLandingPageProps {
  slug: string;
  cart: CartItem[];
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onNavigate: (to: string) => void;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  slug,
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onNavigate,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedVarId, setSelectedVarId] = useState('');
  const [qty, setQty] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Direct 1-Page Cash on Delivery Checkout Form for Facebook Ad Landing Conversion
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: 'percent' | 'fixed';
    value: number;
  } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setConfirmedOrder(null);
    setQty(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProduct(data.product);
        setRelated(data.related || []);
        setSettings(data.settings);
        setSelectedVarId(data.product?.variations?.[0]?.id || '');

        trackMetaEvent('ViewContent', {
          content_ids: [data.product.id],
          content_name: data.product.name,
          content_type: 'product',
          value: data.product.price,
          currency: 'BDT',
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Update document title, canonical & Product JSON-LD
  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} — ৳${product.price.toLocaleString()} | All In One Gadget`;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/product/${product.slug}`;

    const ldId = 'aiog-product-jsonld';
    let script = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = ldId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: product.image.startsWith('http')
        ? product.image
        : `${window.location.origin}${product.image}`,
      description: product.description,
      category: product.categoryName,
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}/product/${product.slug}`,
        priceCurrency: 'BDT',
        price: product.price,
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    });

    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, [product]);

  const selectedVariation = useMemo(
    () => product?.variations.find((v) => v.id === selectedVarId) || product?.variations[0],
    [product, selectedVarId]
  );

  const unitPrice = product ? Math.max(0, product.price + (selectedVariation?.priceDelta || 0)) : 0;
  const subtotal = unitPrice * qty;

  const { tierDiscount, activeTier } = useMemo(() => {
    if (!settings) return { tierDiscount: 0, activeTier: undefined };
    const matched = (settings.discountTiers || [])
      .filter((t) => t.active && subtotal >= t.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend)[0];
    if (!matched) return { tierDiscount: 0, activeTier: undefined };
    const discount =
      matched.type === 'percent'
        ? Math.round((subtotal * matched.value) / 100)
        : Math.min(subtotal, matched.value);
    return { tierDiscount: discount, activeTier: matched };
  }, [settings, subtotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const afterTier = Math.max(0, subtotal - tierDiscount);
    return appliedCoupon.type === 'percent'
      ? Math.round((afterTier * appliedCoupon.value) / 100)
      : Math.min(afterTier, appliedCoupon.value);
  }, [appliedCoupon, subtotal, tierDiscount]);

  const deliveryCharge = useMemo(() => {
    if (!settings || !settings.deliveryChargeEnabled) return 0;
    if (settings.freeDeliveryMinSpend > 0 && subtotal >= settings.freeDeliveryMinSpend) return 0;
    return deliveryZone === 'inside_dhaka' ? settings.insideDhakaFee : settings.outsideDhakaFee;
  }, [settings, subtotal, deliveryZone]);

  const total = Math.max(0, subtotal - tierDiscount - couponDiscount + deliveryCharge);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponMsg(null);
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal }),
    });
    const json = await res.json();
    if (!res.ok || !json.valid) {
      setAppliedCoupon(null);
      setCouponMsg({ ok: false, text: json.message || 'Invalid coupon' });
    } else {
      setAppliedCoupon(json.coupon);
      setCouponMsg({ ok: true, text: `${json.coupon.code} applied!` });
    }
  };

  const handleDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setOrderError('');
    setSubmitting(true);

    trackMetaEvent('InitiateCheckout', {
      content_ids: [product.id],
      value: total,
      currency: 'BDT',
      num_items: qty,
    });

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          deliveryZone,
          couponCode: appliedCoupon?.code,
          items: [
            {
              productId: product.id,
              quantity: qty,
              variationId: selectedVariation?.id,
              variationLabel: selectedVariation
                ? [selectedVariation.color, selectedVariation.size].filter(Boolean).join(' / ')
                : undefined,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOrderError(json.error || 'Could not place order.');
      } else {
        setConfirmedOrder(json.order);
        trackMetaEvent('Purchase', {
          content_ids: [product.id],
          value: json.order.total,
          currency: 'BDT',
        });
      }
    } catch {
      setOrderError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPermalink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    });
  };

  const bagCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-medium text-slate-400">Loading product...</div>
      </div>
    );
  }

  if (notFound || !product || !settings) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-[#05163B]">Product Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">This product may have moved or is currently out of stock.</p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="mt-5 px-5 py-2.5 rounded-xl bg-[#0066FF] text-white text-sm font-semibold cursor-pointer"
        >
          Back to Storefront
        </button>
      </div>
    );
  }

  const discountPct =
    product.compareAtPrice && product.compareAtPrice > unitPrice
      ? Math.round(((product.compareAtPrice - unitPrice) / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <TopMarqueeBar enabled={settings.topbarEnabled} text={settings.topbarText} />

      <Header
        cartCount={bagCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenTrackOrder={() => setTrackOpen(true)}
        onNavigateHome={() => onNavigate('/')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb + Copy Permalink */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 text-[#05163B] hover:text-[#0066FF] font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Gadgets
            </button>
            <span>/</span>
            <span>{product.categoryName}</span>
            <span>/</span>
            <span className="text-slate-900 truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyPermalink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-[#0066FF] hover:text-[#0066FF] cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied' : 'Copy Link'}
          </button>
        </div>

        {/* Contiguous PDP Layout: Product Gallery Left, Details + Direct COD Checkout Right */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Gallery + Description */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-6 sm:p-10 aspect-square flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[460px]"
              />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
              <div className="text-sm font-bold text-[#05163B]">Product Highlights</div>
              <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
              <div className="pt-2 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0066FF] shrink-0" />
                  <span>Fast Nationwide COD Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0066FF] shrink-0" />
                  <span>Checked Before Dispatch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Price, Variations & Instant Order Form */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {product.categoryName} {product.tag ? `· ${product.tag}` : ''}
              </div>
              <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#05163B] text-balance leading-tight">
                {product.name}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono tabular-nums text-3xl font-bold text-[#05163B]">
                  ৳{unitPrice.toLocaleString()}
                </span>
                {product.compareAtPrice && product.compareAtPrice > unitPrice && (
                  <span className="font-mono tabular-nums text-base text-slate-400 line-through">
                    ৳{product.compareAtPrice.toLocaleString()}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-bold text-[#0066FF]">Save {discountPct}%</span>
                )}
              </div>
            </div>

            {/* Variations */}
            {product.variations.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">Choose Option</div>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((v) => {
                    const isSelected = selectedVariation?.id === v.id;
                    const label = [v.color, v.size].filter(Boolean).join(' / ');
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVarId(v.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#0066FF] bg-blue-50 text-[#05163B]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {v.colorHex && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Add to Bag */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center text-slate-700 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono tabular-nums w-9 text-center text-sm font-bold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="w-11 h-11 flex items-center justify-center text-slate-700 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, selectedVariation, qty);
                  setAddedFeedback(true);
                  setTimeout(() => setAddedFeedback(false), 1500);
                }}
                className="flex-1 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:border-[#05163B] text-slate-900 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {addedFeedback ? <Check className="w-4 h-4 text-emerald-600" /> : <ShoppingBag className="w-4 h-4" />}
                {addedFeedback ? 'Added to Bag' : 'Add to Bag'}
              </button>
            </div>

            {/* Direct 1-Step COD Checkout Box */}
            <div className="pt-4 border-t border-slate-200">
              {confirmedOrder ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">Order Confirmed!</div>
                    <div className="font-mono text-xl font-bold text-[#05163B] mt-0.5">
                      {confirmedOrder.orderNumber}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Total Payable: <strong>৳{confirmedOrder.total.toLocaleString()}</strong> (Cash on Delivery)
                    </p>
                  </div>
                  <a
                    href={buildWhatsAppOrderUrl(confirmedOrder, settings.whatsappOrderNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Order Details on WhatsApp
                  </a>
                </div>
              ) : (
                <form onSubmit={handleDirectOrder} className="space-y-3">
                  <div className="text-sm font-bold text-[#05163B]">
                    Quick Order — Cash on Delivery
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Full Name *"
                      className="h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                    />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Mobile Number (01XXXXXXXXX) *"
                      className="h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Full Delivery Address (House, Road, Area, District) *"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                  />

                  {settings.deliveryChargeEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryZone('inside_dhaka')}
                        className={`h-10 rounded-xl border text-xs font-semibold cursor-pointer ${
                          deliveryZone === 'inside_dhaka'
                            ? 'border-[#0066FF] bg-blue-50 text-[#05163B]'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        Inside Dhaka (৳{settings.insideDhakaFee})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryZone('outside_dhaka')}
                        className={`h-10 rounded-xl border text-xs font-semibold cursor-pointer ${
                          deliveryZone === 'outside_dhaka'
                            ? 'border-[#0066FF] bg-blue-50 text-[#05163B]'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        Outside Dhaka (৳{settings.outsideDhakaFee})
                      </button>
                    </div>
                  )}

                  {/* Coupon */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Coupon code (optional)"
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-xs uppercase placeholder:normal-case"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 h-10 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-xs font-medium ${couponMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {couponMsg.text}
                    </p>
                  )}

                  {/* Order Summary */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({qty} item{qty > 1 ? 's' : ''})</span>
                      <span className="font-mono">৳{subtotal.toLocaleString()}</span>
                    </div>
                    {tierDiscount > 0 && activeTier && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>{activeTier.label}</span>
                        <span className="font-mono">-৳{tierDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Coupon ({appliedCoupon?.code})</span>
                        <span className="font-mono">-৳{couponDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charge</span>
                      <span className="font-mono">{deliveryCharge === 0 ? 'Free' : `৳${deliveryCharge}`}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between text-sm font-bold text-[#05163B]">
                      <span>Total Payable</span>
                      <span className="font-mono">৳{total.toLocaleString()}</span>
                    </div>
                  </div>

                  {orderError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {orderError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-[#0066FF] hover:bg-[#05163B] text-white text-sm font-bold transition-colors cursor-pointer"
                  >
                    {submitting ? 'Confirming Order...' : `Confirm Order Now · ৳${total.toLocaleString()}`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-14 pt-8 border-t border-slate-200/80">
            <h2 className="font-display text-xl font-bold text-[#05163B]">
              More in {product.categoryName}
            </h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(`/product/${item.slug}`)}
                  className="text-left bg-white border border-slate-200/80 rounded-2xl p-3 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="aspect-square bg-[#F8FAFC] rounded-xl p-2 flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-2.5 text-xs font-semibold text-slate-900 line-clamp-2">
                    {item.name}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-[#05163B]">
                    ৳{item.price.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer settings={settings} />

      <CheckoutDrawer
        open={cartOpen}
        items={cart}
        settings={settings}
        onClose={() => setCartOpen(false)}
        onUpdateQty={onUpdateQty}
        onRemoveItem={onRemoveItem}
        onClearCart={onClearCart}
      />

      <TrackOrderModal open={trackOpen} onClose={() => setTrackOpen(false)} />
    </div>
  );
};
