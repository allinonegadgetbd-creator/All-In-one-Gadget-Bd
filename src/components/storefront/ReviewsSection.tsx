import React from 'react';
import { Star } from 'lucide-react';
import type { Review } from '../../types';

interface ReviewsSectionProps {
  reviews: Review[];
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  if (!reviews.length) return null;

  const renderCard = (rev: Review, key: string, ariaHidden = false) => (
    <article
      key={key}
      aria-hidden={ariaHidden || undefined}
      className="w-[290px] sm:w-[350px] shrink-0 mr-4 sm:mr-5 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= rev.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {rev.rating}.0 / 5
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-700 leading-relaxed">
          &ldquo;{rev.comment}&rdquo;
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="text-sm font-semibold text-[#05163B]">
          {rev.customerName}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {rev.location} · Bought {rev.productName} · {rev.date}
        </div>
      </div>
    </article>
  );

  return (
    <section id="reviews" className="bg-slate-50/80 border-t border-slate-200/80 py-12 sm:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#05163B] text-balance">
            Customer Feedback
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Real buyer experiences across Dhaka, Chattogram, Sylhet & Rajshahi
          </p>
        </div>
      </div>

      {/* Continuous Right-to-Left Review Cards Marquee */}
      <div className="relative mt-8 w-full overflow-hidden">
        <div className="pointer-events-none hidden sm:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-50/95 to-transparent z-10" />
        <div className="pointer-events-none hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-50/95 to-transparent z-10" />

        <div className="animate-reviews-marquee-rtl py-1">
          {reviews.map((rev) => renderCard(rev, `r1-${rev.id}`))}
          {reviews.map((rev) => renderCard(rev, `r2-${rev.id}`, true))}
        </div>
      </div>
    </section>
  );
};
