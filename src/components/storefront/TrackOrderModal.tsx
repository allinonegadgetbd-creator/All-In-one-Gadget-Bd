import React, { useState } from 'react';
import { X, Search, PackageCheck } from 'lucide-react';
import { storeClient } from '../../utils/storeClient';
import type { OrderItem, OrderStatus } from '../../types';

interface TrackOrderModalProps {
  open: boolean;
  onClose: () => void;
}

interface TrackedResult {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ open, onClose }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackedResult | null>(null);

  if (!open) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await storeClient.trackOrder(orderNumber, phone);
      if (!res.ok || !res.data) {
        setError(res.error || 'Order not found.');
      } else {
        setResult(res.data);
      }
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#05163B]">Track Your Order</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Order Number</label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. AIOG-1042"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number (or last 4 digits)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#05163B] hover:bg-[#0066FF] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {result && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#05163B]">{result.orderNumber}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0066FF]">
                <PackageCheck className="w-4 h-4" />
                {result.status}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              Customer: {result.customerName} · Total: ৳{result.total.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
