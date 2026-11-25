import React, { useEffect, useState } from 'react';
import { TopMarqueeBar } from '../components/storefront/TopMarqueeBar';
import { Header } from '../components/storefront/Header';
import { HeroBannerSlider } from '../components/storefront/HeroBannerSlider';
import { ProductCatalog } from '../components/storefront/ProductCatalog';
import { CheckoutDrawer } from '../components/storefront/CheckoutDrawer';
import { ReviewsSection } from '../components/storefront/ReviewsSection';
import { TrackOrderModal } from '../components/storefront/TrackOrderModal';
import { PromoPopupModal } from '../components/storefront/PromoPopupModal';
import { Footer } from '../components/storefront/Footer';
import { storeClient } from '../utils/storeClient';
import { assetUrl, routeUrl } from '../utils/assetUrl';
import type { CartItem, Product, ProductVariation, StorefrontData } from '../types';

interface StorefrontPageProps {
  cart: CartItem[];
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onNavigate: (to: string) => void;
}

export const StorefrontPage: React.FC<StorefrontPageProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onNavigate,
}) => {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);

  const [cartOpen, setCartOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  useEffect(() => {
    storeClient
      .getStorefront()
      .then((json: StorefrontData) => {
        setData(json);
      })
      .finally(() => setLoading(false));
  }, []);

  // Inject SEO Canonical + Schema.org JSON-LD for Store & Products
  useEffect(() => {
    if (!data) return;

    document.title = data.settings.seoTitle || 'All In One Gadget — Budget-Friendly Tech & Smart Gadgets BD';

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + '/';

    const ldId = 'aiog-jsonld';
    let script = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = ldId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: data.settings.brandName,
      description: data.settings.seoDescription,
      url: window.location.origin,
      telephone: data.settings.hotlineNumber,
      email: data.settings.supportEmail,
      priceRange: '৳180 - ৳3500',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Gadgets Catalog',
        itemListElement: data.products.slice(0, 20).map((prod, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Product',
            name: prod.name,
            description: prod.description,
            url: `${window.location.origin}${routeUrl(`/product/${prod.slug}`)}`,
            image: window.location.origin + assetUrl(prod.image),
            offers: {
              '@type': 'Offer',
              priceCurrency: 'BDT',
              price: prod.price,
              availability: prod.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          },
        })),
      },
    });
  }, [data]);

  const handleSelectProduct = (product: Product) => {
    onNavigate(`/product/${product.slug}`);
  };

  const handleQuickOrder = (product: Product, variation?: ProductVariation, qty = 1) => {
    onAddToCart(product, variation, qty);
    setCartOpen(true);
  };

  const totalBagCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <img
          src={assetUrl('/assets/logo-header.png')}
          alt="All In One Gadget"
          className="h-12 w-auto object-contain"
        />
        <div className="text-xs font-medium text-slate-400">Loading store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* 1. Admin-controlled Topbar Marquee */}
      <TopMarqueeBar
        enabled={data.settings.topbarEnabled}
        text={data.settings.topbarText}
      />

      {/* 2. Header */}
      <Header
        cartCount={totalBagCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenTrackOrder={() => setTrackOpen(true)}
        onNavigateHome={() => onNavigate('/')}
      />

      {/* 3. Pure 16:9 Hero Banners (No text/buttons overlaid) */}
      <main className="flex-1">
        <HeroBannerSlider banners={data.banners} />

        {/* 4. Products Grid */}
        <ProductCatalog
          categories={data.categories}
          products={data.products}
          onSelectProduct={handleSelectProduct}
          onAddToCart={(prod, vari) => {
            onAddToCart(prod, vari, 1);
            setCartOpen(true);
          }}
          onQuickOrder={(prod, vari) => handleQuickOrder(prod, vari, 1)}
        />

        {/* 5. Banglish Mixed-Rating Customer Reviews */}
        <ReviewsSection reviews={data.reviews} />
      </main>

      {/* 6. Footer */}
      <Footer settings={data.settings} />

      <CheckoutDrawer
        open={cartOpen}
        items={cart}
        settings={data.settings}
        onClose={() => setCartOpen(false)}
        onUpdateQty={onUpdateQty}
        onRemoveItem={onRemoveItem}
        onClearCart={onClearCart}
      />

      <TrackOrderModal open={trackOpen} onClose={() => setTrackOpen(false)} />

      <PromoPopupModal popup={data.popup} />
    </div>
  );
};
