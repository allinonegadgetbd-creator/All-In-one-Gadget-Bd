import React, { useMemo, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  MessageCircle,
  Tag,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import type { CartItem, Order, SiteSettings } from '../../types';
import { buildWhatsAppOrderUrl } from '../../utils/whatsapp';
import { trackMetaEvent } from '../../utils/metaPixel';
import { storeClient } from '../../utils/storeClient';
import { assetUrl } from '../../utils/assetUrl';
import {
  BD_DIVISIONS,
  divisionToZone,
  normalizePhoneInput,
  sanitizeCustomerNameInput,
  validateOrderFields,
} from '../../utils/orderValidation';

interface CheckoutDrawerProps {
  open: boolean;
  items: CartItem[];
  settings: SiteSettings;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  open,
  items,
  settings,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [division, setDivision] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: 'percent' | 'fixed';
    value: number;
  } | null>(null);
  const [couponStatus, setCouponStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unit = Math.max(0, item.product.price + (item.variation?.priceDelta || 0));
        return sum + unit * item.quantity;
      }, 0),
    [items]
  );

  // Automatic Shopping Tier Discount
  const { tierDiscount, activeTier, nextTier } = useMemo(() => {
    const active = (settings.discountTiers || [])
      .filter((t) => t.active)
      .sort((a, b) => a.minSpend - b.minSpend);

    const matched = [...active].reverse().find((t) => subtotal >= t.minSpend);
    const upcoming = active.find((t) => subtotal < t.minSpend);

    let discount = 0;
    if (matched) {
      discount =
        matched.type === 'percent'
          ? Math.round((subtotal * matched.value) / 100)
          : Math.min(subtotal, matched.value);
    }
    return { tierDiscount: discount, activeTier: matched, nextTier: upcoming };
  }, [settings.discountTiers, subtotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const afterTier = Math.max(0, subtotal - tierDiscount);
    return appliedCoupon.type === 'percent'
      ? Math.round((afterTier * appliedCoupon.value) / 100)
      : Math.min(afterTier, appliedCoupon.value);
  }, [appliedCoupon, subtotal, tierDiscount]);

  const deliveryCharge = useMemo(() => {
    if (!settings.deliveryChargeEnabled) return 0;
    if (settings.freeDeliveryMinSpend > 0 && subtotal >= settings.freeDeliveryMinSpend) {
      return 0;
    }
    return deliveryZone === 'inside_dhaka'
      ? settings.insideDhakaFee
      : settings.outsideDhakaFee;
  }, [settings, subtotal, deliveryZone]);

  const total = Math.max(0, subtotal - tierDiscount - couponDiscount + deliveryCharge);

  if (!open) return null;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponStatus(null);
    try {
      const data = await storeClient.validateCoupon(code, subtotal);
      if (!data.ok || !data.valid || !data.coupon) {
        setAppliedCoupon(null);
        setCouponStatus({ ok: false, msg: data.message || 'Invalid coupon' });
      } else {
        setAppliedCoupon(data.coupon);
        setCouponStatus({ ok: true, msg: `${data.coupon.code} applied!` });
      }
    } catch {
      setCouponStatus({ ok: false, msg: 'Could not verify coupon right now.' });
    }
  };

  const handleDivisionChange = (nextDivision: string) => {
    setDivision(nextDivision);
    if (nextDivision) {
      setDeliveryZone(divisionToZone(nextDivision));
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (items.length === 0) return;

    const validated = validateOrderFields({
      customerName,
      customerPhone,
      customerAddress,
      division,
      requireDivision: true,
    });
    if (!validated.ok) {
      setErrorMsg(validated.error || 'Please check your order details.');
      return;
    }

    const effectiveZone = divisionToZone(validated.cleanDivision || division);
    setSubmitting(true);
    trackMetaEvent('InitiateCheckout', {
      value: total,
      currency: 'BDT',
      num_items: items.reduce((s, i) => s + i.quantity, 0),
    });

    try {
      const data = await storeClient.createOrder({
        customerName: validated.cleanName,
        customerPhone: validated.cleanPhone,
        customerAddress: validated.cleanAddress,
        division: validated.cleanDivision,
        deliveryZone: effectiveZone,
        couponCode: appliedCoupon?.code,
        notes,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          variationId: item.variation?.id,
          variationLabel: item.variation
            ? [item.variation.color, item.variation.size].filter(Boolean).join(' / ')
            : undefined,
        })),
      });
      if (!data.ok || !data.order) {
        setErrorMsg(data.error || 'Could not place order. Please check your details.');
      } else {
        setConfirmedOrder(data.order);
        onClearCart();
        trackMetaEvent('Purchase', {
          value: data.order.total,
          currency: 'BDT',
          content_ids: data.order.items.map((i) => i.productId),
        });
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 h-16 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0066FF]" />
            <h2 className="font-display text-lg font-bold text-[#05163B]">
              {confirmedOrder ? 'Order Confirmed' : 'Easy Cash on Delivery'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkout drawer"
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {confirmedOrder ? (
            <div className="py-4 space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <div className="text-xs font-semibold text-emerald-700">
                  Cash on Delivery Confirmed
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#05163B]">
                  {confirmedOrder.orderNumber}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Thank you, <span className="font-semibold text-slate-900">{confirmedOrder.customerName}</span>! Our team will call{' '}
                  <span className="font-mono font-medium">{confirmedOrder.customerPhone}</span> shortly to dispatch.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5 text-sm">
                <div className="font-semibold text-[#05163B]">Order Summary</div>
                {confirmedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-3 text-slate-600">
                    <span className="truncate">
                      {item.name} {item.variationLabel ? `(${item.variationLabel})` : ''} × {item.quantity}
                    </span>
                    <span className="font-mono tabular-nums font-medium text-slate-900 shrink-0">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-[#05163B]">
                  <span>Total Payable (COD)</span>
                  <span className="font-mono tabular-nums">৳{confirmedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              <a
                href={buildWhatsAppOrderUrl(confirmedOrder, settings.whatsappOrderNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Send Order Details to WhatsApp
              </a>

              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">Your shopping bag is empty</p>
              <p className="mt-1 text-sm text-slate-500">Tap any gadget to add it and order in 30 seconds.</p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#0066FF] text-white text-sm font-semibold hover:bg-[#05163B] cursor-pointer"
              >
                Browse Gadgets
              </button>
            </div>
          ) : (
            <>
              {/* Shopping Tier Banner */}
              {(activeTier || nextTier) && (
                <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200/80 text-xs text-[#05163B]">
                  {activeTier ? (
                    <div className="font-semibold">
                      Unlocked: {activeTier.label} (-৳{tierDiscount.toLocaleString()})
                    </div>
                  ) : null}
                  {nextTier ? (
                    <div className={activeTier ? 'mt-1 text-slate-600' : 'font-medium'}>
                      Add <span className="font-mono font-bold">৳{(nextTier.minSpend - subtotal).toLocaleString()}</span> more to unlock: {nextTier.label}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-3">
                {items.map((item) => {
                  const unitPrice = Math.max(0, item.product.price + (item.variation?.priceDelta || 0));
                  const varLabel = item.variation
                    ? [item.variation.color, item.variation.size].filter(Boolean).join(' / ')
                    : '';
                  return (
                    <div
                      key={item.key}
                      className="flex gap-3 p-3 rounded-xl border border-slate-200/80 bg-white"
                    >
                      <img
                        src={assetUrl(item.product.image)}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg bg-[#F8FAFC] object-contain p-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.product.name}
                        </div>
                        {varLabel && (
                          <div className="text-xs text-slate-500 mt-0.5">{varLabel}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.key, -1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-700 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono tabular-nums w-6 text-center text-xs font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.key, 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-700 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums text-sm font-bold text-[#05163B]">
                              ৳{(unitPrice * item.quantity).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.key)}
                              aria-label="Remove item"
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Input */}
              <div className="pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon code (e.g. GADGET10)"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm uppercase placeholder:normal-case focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 h-10 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-[#0066FF] transition-colors cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
                {couponStatus && (
                  <p className={`mt-1.5 text-xs font-medium ${couponStatus.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {couponStatus.msg}
                  </p>
                )}
              </div>

              {/* Simple Cash on Delivery Form */}
              <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3 pt-2 border-t border-slate-200">
                <div className="text-sm font-bold text-[#05163B]">Delivery Details</div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name * (Letters only)</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(sanitizeCustomerNameInput(e.target.value))}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mobile Number * (11 digits, starts with 01)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    minLength={11}
                    maxLength={11}
                    pattern="01[3-9][0-9]{8}"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(normalizePhoneInput(e.target.value))}
                    placeholder="017XXXXXXXX"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Division *</label>
                  <select
                    required
                    value={division}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0066FF]"
                  >
                    <option value="">Select your Division</option>
                    {BD_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div} {div === 'Dhaka' ? '(Inside Dhaka)' : '(Outside Dhaka)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="House, Road, Area, Thana, District"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                {settings.deliveryChargeEnabled && division && (
                  <div className="px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs font-semibold text-[#05163B] flex items-center justify-between">
                    <span>
                      Auto Delivery Zone:{' '}
                      {deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                    </span>
                    <span className="font-mono">
                      {deliveryCharge === 0 ? 'Free' : `৳${deliveryCharge}`}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Order Note (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Preferred delivery time or color note"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                {/* Totals Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">৳{subtotal.toLocaleString()}</span>
                  </div>
                  {tierDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Shopping Offer Discount</span>
                      <span className="font-mono tabular-nums">-৳{tierDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span className="font-mono tabular-nums">-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    <span className="font-mono tabular-nums">
                      {deliveryCharge === 0 ? 'Free' : `৳${deliveryCharge.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-base text-[#05163B]">
                    <span>Total Payable</span>
                    <span className="font-mono tabular-nums">৳{total.toLocaleString()}</span>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-[#0066FF] hover:bg-[#05163B] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {submitting ? 'Confirming Order...' : `Confirm Order (৳${total.toLocaleString()})`}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
