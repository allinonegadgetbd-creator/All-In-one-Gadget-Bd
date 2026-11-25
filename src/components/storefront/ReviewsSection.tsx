import React from 'react';
import { Star } from 'lucide-react';
import type { Review } from '../../types';

interface ReviewsSectionProps {
  reviews: Review[];
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  if (!reviews.length) return null;

  return (
    <section id="reviews" className="bg-slate-50/80 border-t border-slate-200/80 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#05163B] text-balance">
            Customer Feedback
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Real buyer experiences across Dhaka, Chattogram, Sylhet & Rajshahi
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((rev) => (
            <article
              key={rev.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between"
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
                <div className="text-xs text-slate-500 mt-0.5">
                  {rev.location} · Bought {rev.productName} · {rev.date}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
