import { useEffect, useState } from 'react';
import { StorefrontPage } from './pages/StorefrontPage';
import { ProductLandingPage } from './pages/ProductLandingPage';
import { AdminApp } from './pages/AdminApp';
import { trackMetaEvent } from './utils/metaPixel';
import { routeUrl, stripBase } from './utils/assetUrl';
import type { CartItem, Product, ProductVariation } from './types';

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? stripBase(window.location.pathname) : '/'
  );

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aiog_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const onPop = () => setPathname(stripBase(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('aiog_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const navigate = (to: string) => {
    const normalized = to.startsWith('/') ? to : `/${to}`;
    const fullUrl = routeUrl(normalized);
    if (window.location.pathname !== fullUrl) {
      window.history.pushState({}, '', fullUrl);
      setPathname(stripBase(fullUrl));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const addItemToCart = (product: Product, variation?: ProductVariation, qty = 1) => {
    const key = `${product.id}:${variation?.id || 'default'}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { key, product, quantity: qty, variation }];
    });
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      value: product.price * qty,
      currency: 'BDT',
    });
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  };

  const [popupDismissed, setPopupDismissed] = useState(false);

  const clearCart = () => setCart([]);

  if (pathname.startsWith('/admin')) {
    return <AdminApp onNavigateStore={() => navigate('/')} />;
  }

  if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.slice('/product/'.length).replace(/\/+$/, ''));
    if (slug) {
      return (
        <ProductLandingPage
          slug={slug}
          cart={cart}
          onAddToCart={addItemToCart}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onClearCart={clearCart}
          onNavigate={navigate}
        />
      );
    }
  }

  return (
    <StorefrontPage
      cart={cart}
      popupDismissed={popupDismissed}
      onDismissPopup={() => setPopupDismissed(true)}
      onAddToCart={addItemToCart}
      onUpdateQty={handleUpdateQty}
      onRemoveItem={handleRemoveItem}
      onClearCart={clearCart}
      onNavigate={navigate}
    />
  );
}
