import React, { useEffect, useState } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import type { HeroBanner } from '../../types';

interface HeroBannerSliderProps {
  banners: HeroBanner[];
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({ banners }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[activeIndex % banners.length];

  return (
    <section aria-label="Featured Banners" className="w-full bg-white pt-3 sm:pt-5 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className="relative w-full aspect-video overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-sm"
          onClick={() => setActiveIndex((prev) => (prev + 1) % banners.length)}
        >
          {banners.map((banner, idx) => (
            <img
              key={banner.id}
              src={assetUrl(banner.image)}
              alt={banner.alt || `All In One Gadget Banner ${idx + 1}`}
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                idx === activeIndex % banners.length ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          ))}
        </div>

        {/* Minimal indicator strip below the 16:9 image (no overlay text or buttons inside hero) */}
        {banners.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {banners.map((banner, idx) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`View banner ${idx + 1}: ${banner.alt}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex % banners.length
                    ? 'w-7 bg-[#0066FF]'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
