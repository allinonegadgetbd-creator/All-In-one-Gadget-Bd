import type { Order } from '../types';

export function buildWhatsAppOrderUrl(order: Order, whatsappNumber: string): string {
  const cleanPhone = (whatsappNumber || '8801791478704').replace(/\D/g, '');
  const formattedItems = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name}${item.variationLabel ? ` (${item.variationLabel})` : ''} x${item.quantity} = ৳${(item.price * item.quantity).toLocaleString()}`
    )
    .join('\n');

  const zoneLabel = order.deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';

  const lines = [
    `*NEW ORDER: ${order.orderNumber}*`,
    `Status: ${order.status}`,
    `------------------------`,
    `*Customer:* ${order.customerName}`,
    `*Phone:* ${order.customerPhone}`,
    order.division ? `*Division:* ${order.division}` : null,
    `*Address:* ${order.customerAddress}`,
    `*Zone:* ${zoneLabel}`,
    `------------------------`,
    `*Items:*`,
    formattedItems,
    `------------------------`,
    `Subtotal: ৳${order.subtotal.toLocaleString()}`,
    order.tierDiscount > 0 ? `Offer Discount: -৳${order.tierDiscount.toLocaleString()}` : null,
    order.couponDiscount > 0 ? `Coupon (${order.couponCode}): -৳${order.couponDiscount.toLocaleString()}` : null,
    `Delivery Charge: ৳${order.deliveryCharge.toLocaleString()}`,
    `*Total Payable: ৳${order.total.toLocaleString()}*`,
    order.notes ? `Note: ${order.notes}` : null,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
