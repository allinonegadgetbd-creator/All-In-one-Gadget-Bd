export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface ProductVariation {
  id: string;
  color?: string;
  colorHex?: string;
  size?: string;
  priceDelta?: number;
  stock?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  description: string;
  tag?: string;
  stock: number;
  active: boolean;
  featured: boolean;
  variations: ProductVariation[];
  createdAt: string;
}

export interface CartItem {
  key: string;
  product: Product;
  quantity: number;
  variation?: ProductVariation;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variationLabel?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  division?: string;
  deliveryZone: 'inside_dhaka' | 'outside_dhaka';
  items: OrderItem[];
  subtotal: number;
  tierDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  active: boolean;
}

export interface DiscountTier {
  id: string;
  minSpend: number;
  type: 'percent' | 'fixed';
  value: number;
  label: string;
  active: boolean;
}

export interface HeroBanner {
  id: string;
  image: string;
  alt: string;
  active: boolean;
  order: number;
}

export type PopupThemeKey = 'midnight-gold' | 'cobalt-electric' | 'emerald-velvet' | 'obsidian-minimal' | 'crimson-luxe';

export interface PopupConfig {
  enabled: boolean;
  mode: 'banner' | 'text';
  bannerImage: string;
  bannerLink: string;
  textTheme: PopupThemeKey;
  title: string;
  subtitle: string;
  highlightCode: string;
  ctaText: string;
  ctaLink: string;
  delaySeconds: number;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
}

export interface SiteSettings {
  brandName: string;
  topbarEnabled: boolean;
  topbarText: string;
  deliveryChargeEnabled: boolean;
  insideDhakaFee: number;
  outsideDhakaFee: number;
  freeDeliveryMinSpend: number;
  whatsappOrderNumber: string;
  hotlineNumber: string;
  supportEmail: string;
  socialLinks: SocialLinks;
  discountTiers: DiscountTier[];
  seoTitle: string;
  seoDescription: string;
}

export interface Review {
  id: string;
  customerName: string;
  location: string;
  productName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface StorefrontData {
  categories: Category[];
  products: Product[];
  banners: HeroBanner[];
  popup: PopupConfig;
  settings: SiteSettings;
  reviews: Review[];
}
