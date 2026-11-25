import React, { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { PopupConfig, PopupThemeKey } from '../../types';

interface PromoPopupModalProps {
  popup: PopupConfig;
}

const POPUP_THEMES: Record<
  PopupThemeKey,
  { container: string; accent: string; codeBox: string; cta: string }
> = {
  'midnight-gold': {
    container: 'bg-[#05163B] text-white border border-[#1E3A8A]',
    accent: 'text-amber-300',
    codeBox: 'bg-white/10 border border-amber-300/40 text-amber-200',
    cta: 'bg-amber-400 text-[#05163B] hover:bg-amber-300',
  },
  'cobalt-electric': {
    container: 'bg-gradient-to-br from-[#0052D4] to-[#05163B] text-white border border-blue-400/30',
    accent: 'text-sky-200',
    codeBox: 'bg-white/15 border border-white/30 text-white',
    cta: 'bg-white text-[#05163B] hover:bg-slate-100',
  },
  'emerald-velvet': {
    container: 'bg-gradient-to-br from-[#064E3B] to-[#022C22] text-white border border-emerald-500/30',
    accent: 'text-emerald-300',
    codeBox: 'bg-white/10 border border-emerald-300/40 text-emerald-200',
    cta: 'bg-emerald-400 text-[#022C22] hover:bg-emerald-300',
  },
  'obsidian-minimal': {
    container: 'bg-zinc-950 text-white border border-zinc-800',
    accent: 'text-sky-400',
    codeBox: 'bg-zinc-900 border border-zinc-700 text-zinc-100',
    cta: 'bg-white text-zinc-950 hover:bg-zinc-200',
  },
  'crimson-luxe': {
    container: 'bg-gradient-to-br from-[#881337] to-[#4C0519] text-white border border-rose-400/30',
    accent: 'text-rose-200',
    codeBox: 'bg-white/10 border border-rose-200/40 text-rose-100',
    cta: 'bg-white text-[#4C0519] hover:bg-rose-50',
  },
};

export const PromoPopupModal: React.FC<PromoPopupModalProps> = ({ popup }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!popup.enabled) return;
    if (sessionStorage.getItem('aiog_popup_dismissed') === '1') return;

    const delayMs = Math.max(0, (popup.delaySeconds ?? 4) * 1000);
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [popup.enabled, popup.delaySeconds]);

  if (!visible || !popup.enabled) return null;

  const dismiss = () => {
    sessionStorage.setItem('aiog_popup_dismissed', '1');
    setVisible(false);
  };

  const theme = POPUP_THEMES[popup.textTheme] || POPUP_THEMES['midnight-gold'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close offer popup"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {popup.mode === 'banner' ? (
          <a
            href={popup.bannerLink || '#products'}
            onClick={dismiss}
            className="block bg-white"
          >
            <img
              src={popup.bannerImage}
              alt={popup.title || 'Special Offer'}
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </a>
        ) : (
          <div className={`p-7 sm:p-8 text-center ${theme.container}`}>
            <div className={`text-xs font-semibold tracking-wider uppercase ${theme.accent}`}>
              Exclusive Offer
            </div>
            <h3 className="mt-2 font-display text-2xl font-bold leading-snug text-balance">
              {popup.title}
            </h3>
            <p className="mt-3 text-sm opacity-90 leading-relaxed">
              {popup.subtitle}
            </p>

            {popup.highlightCode && (
              <div className={`mt-5 inline-block px-5 py-2.5 rounded-xl font-mono text-base font-bold tracking-widest ${theme.codeBox}`}>
                {popup.highlightCode}
              </div>
            )}

            <div className="mt-6">
              <a
                href={popup.ctaLink || '#products'}
                onClick={dismiss}
                className={`w-full h-12 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors ${theme.cta}`}
              >
                {popup.ctaText || 'Shop Deals Now'}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
