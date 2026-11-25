import React, { useMemo, useState } from 'react';
import { MessageCircle, Phone, MapPin, Trash2, Search } from 'lucide-react';
import type { Order, OrderStatus } from '../../types';
import { buildWhatsAppOrderUrl } from '../../utils/whatsapp';

interface AdminOrdersTabProps {
  orders: Order[];
  whatsappOrderNumber: string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

const STATUS_OPTIONS: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_STYLE: Record<OrderStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  Shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  whatsappOrderNumber,
  onUpdateStatus,
  onDeleteOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<'All' | OrderStatus>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filterStatus !== 'All' && o.status !== filterStatus) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [orders, filterStatus, search]);

  const totalRevenue = useMemo(
    () => orders.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  return (
    <div className="space-y-4">
      {/* Compact Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Total Orders</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#05163B]">
            {orders.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Pending</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-amber-600">
            {orders.filter((o) => o.status === 'Pending').length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Sales</div>
          <div className="mt-1 font-mono tabular-nums text-lg sm:text-xl font-bold text-[#0066FF] truncate">
            ৳{totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, customer name or phone..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0066FF]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(['All', ...STATUS_OPTIONS] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer min-h-[38px] ${
                filterStatus === st
                  ? 'bg-[#05163B] text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No orders match your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#05163B]">
                      {order.orderNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_STYLE[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {order.customerName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono tabular-nums text-base font-bold text-[#05163B]">
                    ৳{order.total.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${order.customerPhone}`} className="font-mono font-semibold text-[#0066FF]">
                    {order.customerPhone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {order.customerAddress} ({order.division ? `${order.division} · ` : ''}
                    {order.deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
                  </span>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="space-y-1.5 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2 text-slate-700">
                    <span className="truncate">
                      {item.name} {item.variationLabel ? `(${item.variationLabel})` : ''} × {item.quantity}
                    </span>
                    <span className="font-mono tabular-nums font-medium shrink-0">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                {(order.tierDiscount > 0 || order.couponDiscount > 0) && (
                  <div className="text-emerald-700 font-medium">
                    Discount: -৳{(order.tierDiscount + order.couponDiscount).toLocaleString()}
                    {order.couponCode ? ` (${order.couponCode})` : ''}
                  </div>
                )}
              </div>

              {/* 1-Click WhatsApp Send + Status Selector */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <a
                  href={buildWhatsAppOrderUrl(order, whatsappOrderNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[160px] h-11 px-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send to WhatsApp
                </a>

                <select
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                  aria-label={`Change status for ${order.orderNumber}`}
                  className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0066FF]"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onDeleteOrder(order.id)}
                  aria-label="Delete order"
                  className="w-11 h-11 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
