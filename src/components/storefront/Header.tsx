import React, { useState } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { assetUrl, routeUrl } from '../../utils/assetUrl';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenTrackOrder: () => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenTrackOrder,
  onNavigateHome,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigateHome) {
      e.preventDefault();
      onNavigateHome();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-6 sm:gap-8">
        {/* Zone 1: Prominent Trimmed Brand Logo */}
        <a
          href={routeUrl('/')}
          onClick={handleLogoClick}
          className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          aria-label="All In One Gadget Home"
        >
          <img
            src={assetUrl('/assets/logo-header.png')}
            alt="All In One Gadget"
            className="h-10 sm:h-12 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href={routeUrl('/#products')}
            className="hover:text-[#0066FF] transition-colors whitespace-nowrap shrink-0"
          >
            Products
          </a>
          <a
            href={routeUrl('/#categories')}
            className="hover:text-[#0066FF] transition-colors whitespace-nowrap shrink-0"
          >
            Categories
          </a>
          <a
            href={routeUrl('/#reviews')}
            className="hover:text-[#0066FF] transition-colors whitespace-nowrap shrink-0"
          >
            Reviews
          </a>
          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="hover:text-[#0066FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Track Order
          </button>
        </nav>

        {/* Zone 3: Single Primary Action (Shopping Bag) + Mobile Drawer Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#05163B] text-white text-sm font-semibold hover:bg-[#0066FF] transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px]"
            aria-label={`Open shopping bag with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Bag</span>
            <span className="font-mono tabular-nums text-xs bg-white/20 px-1.5 py-0.5 rounded-md min-w-[22px] text-center">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1">
          <a
            href={routeUrl('/#products')}
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Products
          </a>
          <a
            href={routeUrl('/#categories')}
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Categories
          </a>
          <a
            href={routeUrl('/#reviews')}
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reviews
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTrackOrder();
            }}
            className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Track Order
          </button>
        </div>
      )}
    </header>
  );
};
