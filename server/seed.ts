import type { StoreDatabase, Product } from './types.ts';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const p = (
  id: string,
  name: string,
  categoryId: string,
  categoryName: string,
  price: number,
  image: string,
  description: string,
  opts?: {
    compareAtPrice?: number;
    tag?: string;
    featured?: boolean;
    variations?: Product['variations'];
  }
): Product => ({
  id,
  name,
  slug: slugify(`${name}-${id}`),
  categoryId,
  categoryName,
  price,
  compareAtPrice: opts?.compareAtPrice,
  image,
  description,
  tag: opts?.tag,
  stock: 25,
  active: true,
  featured: opts?.featured ?? false,
  variations: opts?.variations ?? [],
  createdAt: '2026-11-01T10:00:00.000Z',
});

export function createSeedDatabase(): StoreDatabase {
  const categories = [
    { id: 'cat-earbuds', name: 'Earbuds & TWS', slug: 'earbuds-tws', order: 1 },
    { id: 'cat-watches', name: 'Smartwatches', slug: 'smartwatches', order: 2 },
    { id: 'cat-power', name: 'Power Banks', slug: 'power-banks', order: 3 },
    { id: 'cat-adapters', name: 'Adapters & Cables', slug: 'adapters-cables', order: 4 },
    { id: 'cat-trimmers', name: 'Trimmers & Grooming', slug: 'trimmers-grooming', order: 5 },
    { id: 'cat-headphones', name: 'Headphones & Neckbands', slug: 'headphones-neckbands', order: 6 },
    { id: 'cat-lights', name: 'Torches & Lamps', slug: 'torches-lamps', order: 7 },
    { id: 'cat-fans', name: 'Mini Fans & Cooling', slug: 'mini-fans-cooling', order: 8 },
    { id: 'cat-home', name: 'Home & Kitchen', slug: 'home-kitchen', order: 9 },
    { id: 'cat-creator', name: 'Creator Gear & Stands', slug: 'creator-gear-stands', order: 10 },
    { id: 'cat-speakers', name: 'Speakers & Network', slug: 'speakers-network', order: 11 },
    { id: 'cat-covers', name: 'Covers & Lifestyle', slug: 'covers-lifestyle', order: 12 },
  ];

  const products: Product[] = [
    // Page 1-4: Earbuds & TWS
    p('p-1', 'Apple AirPods Pro 2nd Gen (ANC)', 'cat-earbuds', 'Earbuds & TWS', 1290, '/products/p01_im1.jpg', 'Active Noise Cancellation, spatial audio, MagSafe charging case, pop-up pairing.', {
      compareAtPrice: 1650,
      tag: 'Best Seller',
      featured: true,
      variations: [
        { id: 'v1', color: 'White', colorHex: '#F8FAFC', stock: 20 },
        { id: 'v2', color: 'Matte Black', colorHex: '#18181B', stock: 15 },
      ],
    }),
    p('p-2', 'Awei T29 Pro Gaming Earbuds', 'cat-earbuds', 'Earbuds & TWS', 1150, '/products/p01_im3.jpg', 'Low-latency gaming Bluetooth earbuds with crisp bass and LED battery readout.', {
      compareAtPrice: 1450,
      tag: 'Gaming',
      variations: [{ id: 'v3', color: 'Black', colorHex: '#0F172A', stock: 18 }],
    }),
    p('p-3', 'A9 Pro ANC Smart Screen Earbuds', 'cat-earbuds', 'Earbuds & TWS', 1390, '/products/p03_im2.jpg', 'Full-color smart touch display charging case with ANC/ENC, music control & equalizer.', {
      compareAtPrice: 1800,
      tag: 'Hot Deal',
      featured: true,
      variations: [
        { id: 'v4', color: 'Black', colorHex: '#111827', stock: 22 },
        { id: 'v5', color: 'White', colorHex: '#F1F5F9', stock: 16 },
      ],
    }),
    p('p-4', 'E9 Pro Smart Display Earbuds', 'cat-earbuds', 'Earbuds & TWS', 1250, '/products/p03_im4.jpg', 'Dual-mic ENC noise reduction, touch screen charging case, Type-C fast charge.', {
      compareAtPrice: 1550,
      variations: [
        { id: 'v6', color: 'Black', colorHex: '#1E293B', stock: 14 },
        { id: 'v7', color: 'White', colorHex: '#FFFFFF', stock: 12 },
      ],
    }),
    p('p-5', 'Ultrapods Pro Transparent TWS', 'cat-earbuds', 'Earbuds & TWS', 590, '/products/p04_im1.jpg', 'Translucent crystal case with digital LED battery display and clear HD calling.', {
      compareAtPrice: 850,
      featured: true,
      variations: [
        { id: 'v8', color: 'Sky Blue', colorHex: '#38BDF8', stock: 20 },
        { id: 'v9', color: 'Pink', colorHex: '#F472B6', stock: 14 },
        { id: 'v10', color: 'Black', colorHex: '#0F172A', stock: 18 },
      ],
    }),
    p('p-6', 'M10 TWS Powerbank Earbuds', 'cat-earbuds', 'Earbuds & TWS', 490, '/products/p04_im2.jpg', 'Classic LED mirror display case that doubles as an emergency phone power bank.', { compareAtPrice: 750 }),
    p('p-7', 'M25 Cyber Gaming TWS', 'cat-earbuds', 'Earbuds & TWS', 690, '/products/p04_im3.jpg', 'Metallic sliding mecha case with RGB accent lights and low-latency wireless audio.', { compareAtPrice: 950 }),
    p('p-8', 'M19 TWS Dual LED Earbuds', 'cat-earbuds', 'Earbuds & TWS', 550, '/products/p04_im4.jpg', 'Dual digital percentage indicator with built-in emergency torchlight.', { compareAtPrice: 790 }),
    p('p-9', 'M28 Pro RGB Gaming Earbuds', 'cat-earbuds', 'Earbuds & TWS', 640, '/products/p04_im5.jpg', 'Neon breathing RGB charging case, touch controls, and deep bass drivers.', { compareAtPrice: 890 }),
    p('p-10', 'OnePlus AirPods Pro + Free Cover', 'cat-earbuds', 'Earbuds & TWS', 850, '/products/p03_im1.jpg', 'Balanced sound profile with protective silicone cover included.', { compareAtPrice: 1100 }),
    p('p-11', 'Vivo / OnePlus / Oraimo / Xiaomi TWS Series', 'cat-earbuds', 'Earbuds & TWS', 520, '/products/p02_im1.jpg', 'Budget-friendly wireless pods available in multiple brand-style editions.', {
      variations: [
        { id: 'v11', size: 'Vivo Edition' },
        { id: 'v12', size: 'OnePlus Edition' },
        { id: 'v13', size: 'Oraimo Edition' },
        { id: 'v14', size: 'Xiaomi Edition' },
      ],
    }),

    // Page 5: Covers
    p('p-12', 'Premium Leather AirPods Protective Case', 'cat-covers', 'Covers & Lifestyle', 250, '/products/p05_im1.jpg', 'Stitched PU leather shockproof earbuds case with metal carabiner hook.', {
      variations: [
        { id: 'v15', color: 'Brown', colorHex: '#92400E' },
        { id: 'v16', color: 'Black', colorHex: '#18181B' },
        { id: 'v17', color: 'Chocolate', colorHex: '#451A03' },
        { id: 'v18', color: 'Navy Blue', colorHex: '#1E3A8A' },
      ],
    }),
    p('p-13', 'Universal Waterproof Phone Pouch', 'cat-covers', 'Covers & Lifestyle', 180, '/products/p05_im5.jpg', 'Touch-sensitive waterproof bag for rain, travel, and swimming up to 6.8" phones.', {
      variations: [
        { id: 'v19', color: 'Blue', colorHex: '#2563EB' },
        { id: 'v20', color: 'Yellow', colorHex: '#FACC15' },
        { id: 'v21', color: 'Pink', colorHex: '#EC4899' },
      ],
    }),

    // Page 6-9: Earphones, Neckbands, Headphones, LCD Tab
    p('p-14', 'AKG Metal Original 3.5mm Earphone', 'cat-headphones', 'Headphones & Neckbands', 350, '/products/p06_im1.jpg', 'Tangle-free braided wire with metallic acoustic housing and carry pouch.', { compareAtPrice: 490 }),
    p('p-15', 'UiiSii CX Type-C Wired Earphone', 'cat-headphones', 'Headphones & Neckbands', 420, '/products/p06_im3.jpg', 'Direct USB Type-C digital DAC earphone with crisp inline HD microphone.', { compareAtPrice: 550 }),
    p('p-16', 'Lenovo HE05x Magnetic Neckband', 'cat-headphones', 'Headphones & Neckbands', 490, '/products/p06_im4.jpg', 'IPX5 sweatproof Bluetooth 5.0 neckband with magnetic snap earbuds.', { compareAtPrice: 690 }),
    p('p-17', 'UiiSii R05 50H Transparent Neckband', 'cat-headphones', 'Headphones & Neckbands', 890, '/products/p06_im5.jpg', '50 hours continuous playback, clear transparent housing, fast Type-C charging.', { compareAtPrice: 1150 }),
    p('p-18', 'Cavix-006 80H Magnetic Neckband', 'cat-headphones', 'Headphones & Neckbands', 990, '/products/p07_im1.jpg', 'Massive 80-hour music time with magnetic power on/off and vibration alert.', { compareAtPrice: 1290 }),
    p('p-19', 'Moxx BN-100 35H Neckband', 'cat-headphones', 'Headphones & Neckbands', 690, '/products/p07_im2.jpg', '35 hours playtime, lightweight silicone band, punchy stereo bass.', { compareAtPrice: 890 }),
    p('p-20', 'AirPods Max ANC Wireless Headphone', 'cat-headphones', 'Headphones & Neckbands', 1850, '/products/p08_im1.jpg', 'Over-ear wireless headphones with Active Noise Cancellation & memory foam cushions.', {
      compareAtPrice: 2450,
      tag: 'Top Rated',
      featured: true,
      variations: [
        { id: 'v22', color: 'Silver White', colorHex: '#E2E8F0' },
        { id: 'v23', color: 'Space Black', colorHex: '#1E293B' },
      ],
    }),
    p('p-21', 'Hoco W35 Max 90H Wireless Headphone', 'cat-headphones', 'Headphones & Neckbands', 1690, '/products/p08_im2.jpg', '800mAh battery delivering up to 90 hours playback, AUX + Bluetooth 5.3.', { compareAtPrice: 2100 }),
    p('p-22', 'P9 Wireless Over-Ear Headphone', 'cat-headphones', 'Headphones & Neckbands', 790, '/products/p08_im3.jpg', 'MicroSD slot, FM radio, Bluetooth wireless streaming, breathable earcups.', {
      compareAtPrice: 1050,
      variations: [
        { id: 'v24', color: 'Black', colorHex: '#18181B' },
        { id: 'v25', color: 'Silver', colorHex: '#CBD5E1' },
      ],
    }),
    p('p-23', 'Oraimo OR-880 Wireless Headphone', 'cat-headphones', 'Headphones & Neckbands', 1450, '/products/p08_im4.jpg', 'Heavy bass driver, 400mAh battery, ergonomic foldable headband.', { compareAtPrice: 1850 }),
    p('p-24', 'STN-28 Cat Ear LED Wireless Headphone', 'cat-headphones', 'Headphones & Neckbands', 750, '/products/p09_im1.jpg', 'RGB glowing cat ears, kid-friendly volume limit, foldable travel design.', {
      variations: [
        { id: 'v26', color: 'Pink', colorHex: '#F472B6' },
        { id: 'v27', color: 'Black', colorHex: '#0F172A' },
        { id: 'v28', color: 'Blue', colorHex: '#3B82F6' },
      ],
    }),
    p('p-25', 'XG88 Pro Smart Audio Sunglasses', 'cat-headphones', 'Headphones & Neckbands', 1190, '/products/p09_im2.jpg', 'Open-ear Bluetooth audio sunglasses with HD voice mic & UV lens protection.', { compareAtPrice: 1550 }),
    p('p-26', '8.5" Digital LCD Writing Tablet', 'cat-creator', 'Creator Gear & Stands', 240, '/products/p09_im3.jpg', 'Paperless one-click erase LCD drawing & note pad for kids and office memos.', { compareAtPrice: 350 }),

    // Page 9-13: Trimmers & Grooming
    p('p-27', 'Vintage T9 Dragon Type-C Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 490, '/products/p09_im4.jpg', 'Zero-gapped T-blade metal body trimmer with fast USB Type-C charging.', {
      compareAtPrice: 750,
      tag: 'Best Seller',
      featured: true,
    }),
    p('p-28', 'ENCHEN Boost Ceramic Hair Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 990, '/products/p09_im5.jpg', 'Nano-ceramic quiet cutter head with 2-speed turbo button & USB-C charging.', {
      compareAtPrice: 1290,
      variations: [
        { id: 'v29', color: 'White', colorHex: '#F8FAFC' },
        { id: 'v30', color: 'Black', colorHex: '#18181B' },
      ],
    }),
    p('p-29', 'Kemei KM-809A LCD Digital Clipper', 'cat-trimmers', 'Trimmers & Grooming', 1290, '/products/p10_im1.jpg', 'Heavy-duty salon clipper with digital battery display and 4 guide combs.', { compareAtPrice: 1600 }),
    p('p-30', 'Kemei KM-5015 Waterproof Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 1050, '/products/p10_im2.jpg', 'Whole-body washable cordless trimmer with precision stainless blade.', { compareAtPrice: 1350 }),
    p('p-31', 'Kemei KM-5017 Rechargeable Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 850, '/products/p10_im3.jpg', 'Compact ergonomic beard & hair trimmer with long-life motor.', { compareAtPrice: 1100 }),
    p('p-32', 'Kemei KM-3909 Beard & Hair Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 890, '/products/p10_im4.jpg', 'Dual-power rechargeable trimmer with precision stainless steel blade.', { compareAtPrice: 1150 }),
    p('p-33', 'Kemei KM-039 Professional Clipper', 'cat-trimmers', 'Trimmers & Grooming', 1150, '/products/p10_im5.jpg', 'Digital charge percentage display with 3 precision guide attachments.', { compareAtPrice: 1450 }),
    p('p-34', 'Kemei KM-6330 3-in-1 Grooming Kit', 'cat-trimmers', 'Trimmers & Grooming', 1190, '/products/p11_im2.jpg', 'Beard trimmer, foil shaver, and nose hair trimmer interchangeable heads.', { compareAtPrice: 1500 }),
    p('p-35', 'Kemei KM-6637 4-in-1 Beauty Tools Kit', 'cat-trimmers', 'Trimmers & Grooming', 1090, '/products/p11_im5.jpg', '4-in-1 facial, eyebrow, and body grooming set for women.', { compareAtPrice: 1390 }),
    p('p-36', 'HTC AT-538 Precision Beard Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 790, '/products/p12_im1.jpg', '20-length adjustable dial with stainless steel self-sharpening blades.', { compareAtPrice: 1050 }),
    p('p-37', 'HTC AT-522 / AT-528 Cordless Trimmer', 'cat-trimmers', 'Trimmers & Grooming', 650, '/products/p12_im3.jpg', 'Lightweight daily beard trimmer with quiet motor and USB charging.', {
      variations: [
        { id: 'v31', color: 'Matte Black (AT-522)', colorHex: '#18181B' },
        { id: 'v32', color: 'Cobalt Blue (AT-528)', colorHex: '#1D4ED8' },
        { id: 'v33', color: 'Amber Yellow (AT-530)', colorHex: '#EAB308' },
      ],
    }),
    p('p-38', 'Blackhead Remover Vacuum Pore Cleaner', 'cat-trimmers', 'Trimmers & Grooming', 550, '/products/p13_im3.jpg', '3 suction levels with 4 interchangeable beauty probes for deep pore cleansing.', { compareAtPrice: 790 }),
    p('p-39', 'Kemei KM-328 Hair Straightener', 'cat-trimmers', 'Trimmers & Grooming', 790, '/products/p13_im5.jpg', 'Fast-heating ceramic coated plates for smooth frizz-free hair styling.', { compareAtPrice: 1050 }),
    p('p-40', 'Kemei KM-3365 1800W Hair Dryer', 'cat-trimmers', 'Trimmers & Grooming', 990, '/products/p14_im1.jpg', '1800W salon-grade airflow with cool/warm switch and concentrator nozzle.', { compareAtPrice: 1290 }),

    // Page 14-15: Power Banks
    p('p-41', 'Baseus Bipow 10,000mAh 15W Power Bank', 'cat-power', 'Power Banks', 1390, '/products/p14_im3.jpg', 'Digital LED battery indicator, dual USB + Type-C input/output, slim pocket body.', {
      compareAtPrice: 1690,
      featured: true,
    }),
    p('p-42', 'Baseus Bipow 20,000mAh 22.5W Fast Power Bank', 'cat-power', 'Power Banks', 2050, '/products/p14_im4.jpg', '22.5W PD + QC3.0 super fast charging with digital percentage readout.', {
      compareAtPrice: 2450,
      tag: 'Best Seller',
      featured: true,
    }),
    p('p-43', 'Baseus 30,000mAh 22.5W High-Capacity Power Bank', 'cat-power', 'Power Banks', 2790, '/products/p14_im5.jpg', 'Massive 30,000mAh capacity with 5-port output for phones and tablets.', { compareAtPrice: 3250 }),
    p('p-44', 'Joyroom JR-PBF12 10,000mAh 2.4A Power Bank', 'cat-power', 'Power Banks', 1190, '/products/p15_im1.jpg', 'Flight-approved compact power bank with digital LED screen & dual ports.', { compareAtPrice: 1450 }),
    p('p-45', 'Awei P5K 10,000mAh Dual Cable Power Bank', 'cat-power', 'Power Banks', 1050, '/products/p15_im3.jpg', 'Built-in charging cables + LED battery display, slim travel build.', { compareAtPrice: 1350 }),
    p('p-46', 'itel Star 200 20,000mAh Power Bank', 'cat-power', 'Power Banks', 1490, '/products/p15_im4.jpg', 'High-density 20,000mAh dual USB output with multi-protect safety chip.', { compareAtPrice: 1790 }),

    // Page 16-18 & 34-35: Adapters & Cables
    p('p-47', 'Remax RP-U23 Universal Travel Adapter', 'cat-adapters', 'Adapters & Cables', 790, '/products/p16_im1.jpg', 'All-in-one UK/EU/US/AU travel plug with 2.4A USB + Type-C charging.', { compareAtPrice: 990 }),
    p('p-48', 'Oppo 65W SuperVOOC Fast Charger Kit', 'cat-adapters', 'Adapters & Cables', 890, '/products/p16_im2.jpg', '65W high-speed adapter with heavy-duty Type-C cable included.', { compareAtPrice: 1150 }),
    p('p-49', 'Vivo 44W / 66W / 80W FlashCharge Adapter', 'cat-adapters', 'Adapters & Cables', 850, '/products/p16_im4.jpg', 'Original-grade FlashCharge adapter and cable combo for Vivo & iQOO.', {
      variations: [
        { id: 'v34', size: '44W', priceDelta: 0 },
        { id: 'v35', size: '66W', priceDelta: 150 },
        { id: 'v36', size: '80W', priceDelta: 250 },
      ],
    }),
    p('p-50', 'Samsung 25W / 45W PD Fast Adapter + Cable', 'cat-adapters', 'Adapters & Cables', 790, '/products/p17_im2.jpg', 'Super Fast Charging USB-C PD adapter with 5A Type-C to Type-C cable.', {
      featured: true,
      variations: [
        { id: 'v37', size: '25W (2-Pin)', priceDelta: 0 },
        { id: 'v38', size: '25W (3-Pin)', priceDelta: 50 },
        { id: 'v39', size: '45W PD (3-Pin)', priceDelta: 260 },
      ],
    }),
    p('p-51', 'Xiaomi Mi 33W / 67W / 120W Turbo Charger', 'cat-adapters', 'Adapters & Cables', 750, '/products/p17_im4.jpg', 'Mi HyperCharge / Turbo Charge adapter with high-current orange-tip USB-C cable.', {
      variations: [
        { id: 'v40', size: '33W Turbo', priceDelta: 0 },
        { id: 'v41', size: '67W Turbo', priceDelta: 200 },
        { id: 'v42', size: '120W HyperCharge', priceDelta: 400 },
      ],
    }),
    p('p-52', 'Apple 20W / 25W USB-C Power Adapter', 'cat-adapters', 'Adapters & Cables', 890, '/products/p18_im2.jpg', 'Compact USB-C PD fast charger compatible with iPhone & iPad models.', {
      variations: [
        { id: 'v43', size: '20W (3-Pin UK)' },
        { id: 'v44', size: '25W (2-Pin EU)' },
      ],
    }),
    p('p-53', 'Awei CL-219T 60W Type-C to Type-C Cable', 'cat-adapters', 'Adapters & Cables', 290, '/products/p35_im1.jpg', '60W PD fast charging & data sync cable, reinforced connectors.', { compareAtPrice: 390 }),
    p('p-54', 'Samsung / Xiaomi / Vivo / OnePlus Fast Cable', 'cat-adapters', 'Adapters & Cables', 250, '/products/p35_im2.jpg', 'Durable fast-charging USB-C data cable in brand-matched specs.', {
      variations: [
        { id: 'v45', size: 'Samsung Type-C to C' },
        { id: 'v46', size: 'Xiaomi USB to C' },
        { id: 'v47', size: 'OnePlus Red Type-C' },
      ],
    }),

    // Page 19-23: Routers, Tracker, TV Box, Smartwatches
    p('p-55', 'Jio MF680s 4G LTE Pocket WiFi Router', 'cat-speakers', 'Speakers & Network', 2450, '/products/p19_im1.jpg', 'Portable 4G LTE hotspot router supporting all local SIM cards with long battery.', { compareAtPrice: 2950 }),
    p('p-56', 'MiLi MiTag GPS Item Finder (iOS / Android)', 'cat-covers', 'Covers & Lifestyle', 1150, '/products/p19_im2.jpg', 'Smart Bluetooth tracker compatible with Apple Find My or Google Find My Device.', {
      variations: [
        { id: 'v48', size: 'iOS (Apple Find My)' },
        { id: 'v49', size: 'Android (Google Find)' },
      ],
    }),
    p('p-57', 'TX10 Pro 8K Android Smart TV Box', 'cat-speakers', 'Speakers & Network', 2390, '/products/p19_im4.jpg', 'Turn any TV into a smart Android TV with YouTube, Netflix, 4K/8K playback & WiFi.', { compareAtPrice: 2890 }),
    p('p-58', 'T800 Ultra 2 Bluetooth Calling Smartwatch', 'cat-watches', 'Smartwatches', 950, '/products/p20_im1.jpg', '2.09" big infinity display, Bluetooth calling, heart rate, sport modes, wireless charge.', {
      compareAtPrice: 1350,
      tag: 'Best Seller',
      featured: true,
      variations: [
        { id: 'v50', color: 'Orange', colorHex: '#F97316' },
        { id: 'v51', color: 'Black', colorHex: '#18181B' },
        { id: 'v52', color: 'Starlight White', colorHex: '#F1F5F9' },
      ],
    }),
    p('p-59', 'T900 Ultra 2 Smartwatch (2.19" Display)', 'cat-watches', 'Smartwatches', 1050, '/products/p20_im3.jpg', 'Upgraded fluid UI, always-on dial, voice assistant, wireless magnetic charger.', {
      compareAtPrice: 1450,
      variations: [
        { id: 'v53', color: 'Orange', colorHex: '#EA580C' },
        { id: 'v54', color: 'Black', colorHex: '#0F172A' },
      ],
    }),
    p('p-60', 'COLMI P81 AMOLED Calling Smartwatch', 'cat-watches', 'Smartwatches', 1750, '/products/p21_im1.jpg', 'Official COLMI P81 with IP68 waterproofing, clear BT calling, and 7-day battery.', {
      compareAtPrice: 2150,
      tag: 'Original',
      featured: true,
      variations: [
        { id: 'v55', color: 'Midnight Black', colorHex: '#111827' },
        { id: 'v56', color: 'Rose Pink', colorHex: '#F9A8D4' },
      ],
    }),
    p('p-61', 'COLMI P71 Smart Calling Watch', 'cat-watches', 'Smartwatches', 1550, '/products/p21_im2.jpg', '1.9" HD IPS display, 100+ workout modes, health monitoring & voice call.', { compareAtPrice: 1950 }),
    p('p-62', 'DT900 Ultra 7-in-1 Strap Combo Smartwatch', 'cat-watches', 'Smartwatches', 1390, '/products/p21_im3.jpg', 'Includes 7 interchangeable straps (Alpine, Ocean, Metal & Silicone) + watch case.', { compareAtPrice: 1850 }),
    p('p-63', 'S30 Ultra 2 / 10 Series S30 Pro Combo Watch', 'cat-watches', 'Smartwatches', 1490, '/products/p22_im3.jpg', 'Series 10 edge-to-edge display with 7 designer straps included in gift box.', { compareAtPrice: 1950 }),
    p('p-64', 'Ultra S9 Android 4G SIM Watch (32/256 GB)', 'cat-watches', 'Smartwatches', 3490, '/products/p22_im5.jpg', 'Full Android OS on your wrist — Play Store, WhatsApp, YouTube, 4G SIM & WiFi.', { compareAtPrice: 4200, tag: 'Flagship' }),
    p('p-65', 'Ocean Silicone Watch Strap (44/45/49mm)', 'cat-watches', 'Smartwatches', 190, '/products/p23_im2.jpg', 'Soft durable ribbed silicone band compatible with all Ultra & Series watches.', {
      variations: [
        { id: 'v57', color: 'Red', colorHex: '#EF4444' },
        { id: 'v58', color: 'Orange', colorHex: '#F97316' },
        { id: 'v59', color: 'Black', colorHex: '#18181B' },
      ],
    }),

    // Page 23-26: Lights, Torches, Lamps, Humidifiers
    p('p-66', 'W5147 COB Keychain Work Light', 'cat-lights', 'Torches & Lamps', 260, '/products/p23_im3.jpg', 'Super bright rechargeable pocket floodlight with magnetic base & bottle opener.', { compareAtPrice: 390 }),
    p('p-67', 'T40 Silver 50,000mAh Zoom Tactical Torch', 'cat-lights', 'Torches & Lamps', 990, '/products/p23_im4.jpg', 'CNC aluminum alloy waterproof flashlight with telescopic zoom & USB power output.', { compareAtPrice: 1350 }),
    p('p-68', 'Sanford 40,000mAh Long-Range LED Torch', 'cat-lights', 'Torches & Lamps', 1290, '/products/p24_im1.jpg', 'High-lumen beam for outdoor security, camping, and village power outages.', { compareAtPrice: 1650 }),
    p('p-69', 'Black Cobra 60,000mAh Heavy Duty Flashlight', 'cat-lights', 'Torches & Lamps', 1450, '/products/p24_im4.jpg', '25.5cm heavy aluminum tactical beam with digital power indicator.', { compareAtPrice: 1850 }),
    p('p-70', 'GearUP K57 Dual-Light Emergency Torch', 'cat-lights', 'Torches & Lamps', 690, '/products/p25_im2.jpg', 'Front spotlight + warm side camping lantern with Type-C fast recharge.', { compareAtPrice: 890 }),
    p('p-71', 'Retro Camp Atmosphere Warm Lantern', 'cat-lights', 'Torches & Lamps', 650, '/products/p25_im3.jpg', 'Stepless rotary dimmer LED filament lantern for desk decor & camping.', { compareAtPrice: 890 }),
    p('p-72', 'Dual-Arc Windproof Plasma Lighter', 'cat-lights', 'Torches & Lamps', 590, '/products/p25_im1.jpg', 'Waterproof flameless USB rechargeable plasma arc lighter with lanyard.', { compareAtPrice: 790 }),
    p('p-73', 'Jellyfish Mood Lamp + Bluetooth Speaker', 'cat-lights', 'Torches & Lamps', 1350, '/products/p26_im2.jpg', 'Hypnotic color-changing floating jellyfish aquarium lamp with built-in speaker.', {
      compareAtPrice: 1750,
      tag: 'Gift Pick',
      featured: true,
    }),
    p('p-74', 'Rain Cloud Aroma Diffuser & Humidifier', 'cat-lights', 'Torches & Lamps', 1450, '/products/p26_im3.jpg', 'Soothing raindrop sound effect with 7-color LED ambient glow and essential oil mist.', { compareAtPrice: 1850 }),

    // Page 26-29 & 40: Home, Kitchen, CCTV, Cleaning
    p('p-75', 'Compact PTC Ceramic Room Heater', 'cat-home', 'Home & Kitchen', 1390, '/products/p26_im4.jpg', '3-second instant warm air, low noise desktop heater with overheat protection.', { compareAtPrice: 1750 }),
    p('p-76', 'MA-1612 Foldable Electric Travel Kettle', 'cat-home', 'Home & Kitchen', 890, '/products/p26_im5.jpg', 'Food-grade collapsible silicone electric kettle for hostel, office, and travel.', { compareAtPrice: 1190 }),
    p('p-77', 'Simplicity 1.8L Electric Multi Cooker + Steamer', 'cat-home', 'Home & Kitchen', 1090, '/products/p27_im2.jpg', 'Non-stick electric hot pot with stainless steamer tray for noodles, rice & curry.', { compareAtPrice: 1390, featured: true }),
    p('p-78', 'Philips 5.5L Stainless Electric Multi Cooker', 'cat-home', 'Home & Kitchen', 1890, '/products/p27_im4.jpg', 'Large 5.5L family size electric cooker with dual heat control & glass lid.', { compareAtPrice: 2350 }),
    p('p-79', 'Automatic Doi Maker 1.5L (Yogurt Maker)', 'cat-home', 'Home & Kitchen', 1290, '/products/p28_im1.jpg', 'Make fresh hygienic sweet or sour yogurt (Doi) at home effortlessly.', { compareAtPrice: 1650 }),
    p('p-80', 'SF-400 Digital Kitchen Scale (10kg)', 'cat-home', 'Home & Kitchen', 380, '/products/p28_im2.jpg', '1g high-precision LCD kitchen & baking scale with tare function.', { compareAtPrice: 550 }),
    p('p-81', 'V380 Dual-Lens 360° Bulb IP CCTV Camera', 'cat-home', 'Home & Kitchen', 1450, '/products/p28_im3.jpg', 'Screw into any E27 bulb holder — dual-screen preview, night vision & phone alerts.', {
      compareAtPrice: 1890,
      tag: 'Smart Security',
      featured: true,
    }),
    p('p-82', '5-in-1 Electric Spin Scrubber Cleaning Brush', 'cat-home', 'Home & Kitchen', 790, '/products/p29_im1.jpg', 'USB rechargeable motorized dish, sink & bathroom scrubber with 5 brush heads.', { compareAtPrice: 1090 }),
    p('p-83', 'Instant Hot Water Tap with Digital Display', 'cat-home', 'Home & Kitchen', 1950, '/products/p40_im3.jpg', '3-second instant hot water faucet with real-time LED temperature display.', {
      variations: [
        { id: 'v60', size: 'With Hand Shower', priceDelta: 250 },
        { id: 'v61', size: 'Without Shower', priceDelta: 0 },
      ],
    }),

    // Page 29-31 & 36: Creator Gear, Selfie Sticks, Mics, Tripods
    p('p-84', 'M-88 Clip-On Studio LED Video Light', 'cat-creator', 'Creator Gear & Stands', 690, '/products/p29_im2.jpg', '3 color temperature modes for Zoom calls, TikTok, Reels & product shoots.', { compareAtPrice: 950 }),
    p('p-85', 'P15 Auto-Balance Selfie Stick Tripod', 'cat-creator', 'Creator Gear & Stands', 850, '/products/p29_im5.jpg', 'Reinforced quad/tripod base with detachable Bluetooth remote & 360° rotation.', { compareAtPrice: 1150 }),
    p('p-86', 'Q07 790mm Fill-Light Tripod Selfie Stick', 'cat-creator', 'Creator Gear & Stands', 590, '/products/p30_im1.jpg', 'Built-in beauty fill light + wireless shutter remote for vlogging.', { compareAtPrice: 790 }),
    p('p-87', '360° Rotating Aluminum Metal Desk Stand', 'cat-creator', 'Creator Gear & Stands', 490, '/products/p30_im4.jpg', 'Heavy-duty carbon steel & alloy rotatable phone/tablet stand.', {
      variations: [
        { id: 'v62', size: 'Fixed Alloy (Metal-1)' },
        { id: 'v63', size: '360° Swivel (Metal-2)' },
      ],
    }),
    p('p-88', 'K35 Dual Wireless Lavalier Microphone (3.5mm)', 'cat-creator', 'Creator Gear & Stands', 890, '/products/p31_im3.jpg', '2-person wireless lapel mic for cameras, DSLR, PC & phones with noise reduction.', { compareAtPrice: 1190 }),
    p('p-89', 'SX9 Dual Wireless Microphone (Type-C / Lightning)', 'cat-creator', 'Creator Gear & Stands', 1350, '/products/p31_im4.jpg', 'Plug-and-play dual creator mic with crisp vocal clarity and long wireless range.', { compareAtPrice: 1690, featured: true }),
    p('p-90', 'SX21 Digital Case Dual Wireless Mic', 'cat-creator', 'Creator Gear & Stands', 1590, '/products/p31_im5.jpg', 'Round magnetic dual mics inside an LED battery charging case.', { compareAtPrice: 1990 }),
    p('p-91', 'Ulanzi MT-44 Extendable Vlog Tripod', 'cat-creator', 'Creator Gear & Stands', 1290, '/products/p36_im1.jpg', '2-in-1 hidden phone clip + cold shoe mount, 147cm max height, lightweight travel.', { compareAtPrice: 1650 }),
    p('p-92', '330A Professional Mobile & Camera Tripod', 'cat-creator', 'Creator Gear & Stands', 1050, '/products/p36_im3.jpg', 'Full-height aluminum alloy tripod with 3-way pan head and carry bag.', { compareAtPrice: 1390 }),

    // Page 32-34: Network Gadgets & Speakers
    p('p-93', 'WGP Mini UPS for WiFi Router & ONU', 'cat-speakers', 'Speakers & Network', 1490, '/products/p32_im1.jpg', 'Keep WiFi & ONU running up to 6-8 hours during load shedding (5V/9V/12V).', {
      compareAtPrice: 1850,
      tag: 'Essential',
      featured: true,
    }),
    p('p-94', 'GTS-2165 / GTS-1637 RGB Party Speaker', 'cat-speakers', 'Speakers & Network', 990, '/products/p32_im2.jpg', 'Loud dynamic bass Bluetooth speaker with mic input, USB/TF & party LED ring.', { compareAtPrice: 1350 }),
    p('p-95', 'JBL M3 Mini Metal Portable Speaker', 'cat-speakers', 'Speakers & Network', 490, '/products/p33_im1.jpg', 'Pocket-sized metallic Bluetooth speaker with punchy sound and wrist strap.', { compareAtPrice: 690 }),
    p('p-96', 'G-Clock G63 RGB Smart Lamp Speaker', 'cat-speakers', 'Speakers & Network', 1190, '/products/p33_im5.jpg', 'G-shaped sunrise alarm clock, 15W wireless phone charger, RGB light & BT speaker.', {
      compareAtPrice: 1590,
      tag: 'Trending',
      featured: true,
    }),
    p('p-97', 'H59 Wireless Charging Stand Speaker', 'cat-speakers', 'Speakers & Network', 1250, '/products/p34_im2.jpg', 'Induction audio speaker + magnetic wireless phone charging desk stand.', { compareAtPrice: 1590 }),

    // Page 36-42: Grinders, Fans, Mixers, Massagers, Winter
    p('p-98', 'Prestige 700W Electric Spice & Coffee Grinder', 'cat-home', 'Home & Kitchen', 1490, '/products/p36_im5.jpg', 'Stainless steel heavy-duty dry masala, coffee bean & nut grinder.', { compareAtPrice: 1850 }),
    p('p-99', 'Nima 1200W Mini Electric Grinder', 'cat-home', 'Home & Kitchen', 790, '/products/p40_im1.jpg', 'Compact stainless steel spice & coffee blender for everyday kitchen prep.', { compareAtPrice: 1050 }),
    p('p-100', 'High-Speed Digital Turbo Handheld Fan', 'cat-fans', 'Mini Fans & Cooling', 1150, '/products/p38_im3.jpg', '100-speed stepless wind control with crisp LED digital speed & battery display.', {
      compareAtPrice: 1490,
      tag: 'Summer Hit',
      featured: true,
      variations: [
        { id: 'v64', color: 'Space Grey', colorHex: '#475569' },
        { id: 'v65', color: 'Pearl White', colorHex: '#F8FAFC' },
      ],
    }),
    p('p-101', 'YL-56 Foldable Cooling Desk Fan', 'cat-fans', 'Mini Fans & Cooling', 790, '/products/p38_im2.jpg', 'One-piece foldable rechargeable desktop fan with quiet multi-angle airflow.', { compareAtPrice: 1050 }),
    p('p-102', 'JY-2516 / JY-2218 Rechargeable Table Fan', 'cat-fans', 'Mini Fans & Cooling', 890, '/products/p37_im5.jpg', '4-speed rechargeable pedestal mini fan for study desk and power backup.', { compareAtPrice: 1150 }),
    p('p-103', 'Scarlett 7-Speed Electric Hand Mixer', 'cat-home', 'Home & Kitchen', 690, '/products/p39_im4.jpg', '7-speed baking whisk & dough beater for cakes, cream, and eggs.', { compareAtPrice: 950 }),
    p('p-104', 'Rechargeable Coffee Frother & Milk Mixer', 'cat-home', 'Home & Kitchen', 390, '/products/p39_im5.jpg', 'Stainless whisk frother for café-style cappuccino foam in 15 seconds.', { compareAtPrice: 550 }),
    p('p-105', 'Warm Menstrual & Back Relief Heating Pad', 'cat-covers', 'Covers & Lifestyle', 890, '/products/p40_im2.jpg', '3-level fast warmth + soothing massage belt with soft velvet lining.', { compareAtPrice: 1190 }),
    p('p-106', 'Neck EMS Pulse Massager & Scalp Massager', 'cat-covers', 'Covers & Lifestyle', 750, '/products/p41_im2.jpg', 'Relaxing deep-kneading cordless massager for neck, shoulder, and head relief.', {
      variations: [
        { id: 'v66', size: '4-Head Scalp Massager', priceDelta: 0 },
        { id: 'v67', size: 'EMS Neck Massager', priceDelta: -200 },
      ],
    }),
    p('p-107', '16-Piece Luxury Manicure Nail Clipper Set', 'cat-covers', 'Covers & Lifestyle', 490, '/products/p41_im5.jpg', 'Stainless steel grooming kit in a sleek leatherette travel zipper case.', { compareAtPrice: 690 }),
    p('p-108', 'Smart LED Flashlight Winter Beanie Cap', 'cat-covers', 'Covers & Lifestyle', 450, '/products/p42_im1.jpg', 'Warm knitted winter beanie with 3-brightness removable USB rechargeable LED headlamp.', { compareAtPrice: 650 }),
    p('p-109', 'Original Kashmiri Woven Winter Shawl', 'cat-covers', 'Covers & Lifestyle', 1290, '/products/p42_im2.jpg', 'Soft authentic Kashmiri winter shawl with classic heritage border.', {
      compareAtPrice: 1650,
      variations: [
        { id: 'v68', size: 'Men (5.5 Hat)', priceDelta: 100 },
        { id: 'v69', size: 'Women (4 Hat)', priceDelta: 0 },
      ],
    }),
  ];

  return {
    categories,
    products,
    orders: [
      {
        id: 'ord-demo-1001',
        orderNumber: 'AIOG-1042',
        customerName: 'Tanvir Ahmed',
        customerPhone: '01712345678',
        customerAddress: 'House 14, Road 6, Mirpur-10, Dhaka',
        deliveryZone: 'inside_dhaka',
        items: [
          {
            productId: 'p-3',
            name: 'A9 Pro ANC Smart Screen Earbuds',
            image: '/products/p03_im2.jpg',
            price: 1390,
            quantity: 1,
            variationLabel: 'Black',
          },
          {
            productId: 'p-53',
            name: 'Awei CL-219T 60W Type-C to Type-C Cable',
            image: '/products/p35_im1.jpg',
            price: 290,
            quantity: 1,
          },
        ],
        subtotal: 1680,
        tierDiscount: 100,
        couponDiscount: 0,
        deliveryCharge: 70,
        total: 1650,
        status: 'Confirmed',
        createdAt: '2026-11-24T11:30:00.000Z',
      },
    ],
    coupons: [
      { id: 'cpn-1', code: 'GADGET10', type: 'percent', value: 10, minSpend: 1000, active: true },
      { id: 'cpn-2', code: 'WELCOME50', type: 'fixed', value: 50, minSpend: 500, active: true },
    ],
    banners: [
      {
        id: 'bn-1',
        image: '/src/assets/images/hero_banner_deals_16x9_1795593263329.jpg',
        alt: 'All In One Gadget — Budget-Friendly Best Deals Showcase',
        active: true,
        order: 1,
      },
      {
        id: 'bn-2',
        image: '/src/assets/images/hero_campaign_audio_watch_v2_1795595150933.jpg',
        alt: 'Next-Gen Audio & Watch — Smart Wearables Collection',
        active: true,
        order: 2,
      },
      {
        id: 'bn-3',
        image: '/src/assets/images/hero_campaign_power_charge_v2_1795595150816.jpg',
        alt: 'Non-Stop Power & Fast Charge — 22.5W Power Banks & GaN Adapters',
        active: true,
        order: 3,
      },
      {
        id: 'bn-4',
        image: '/src/assets/images/hero_campaign_smart_living_v2_1795595151239.jpg',
        alt: 'Everyday Smart Living — Grooming, Cooling & Home Tech',
        active: true,
        order: 4,
      },
    ],
    popup: {
      enabled: false,
      mode: 'text',
      bannerImage: '/src/assets/images/hero_banner_deals_16x9_1795593263329.jpg',
      bannerLink: '#products',
      textTheme: 'midnight-gold',
      title: 'Winter Gadget Deal — Extra ৳100 OFF!',
      subtitle: 'Spend ৳1,500 or more to unlock instant auto-discount, plus use code GADGET10 for an extra 10% off at checkout.',
      highlightCode: 'GADGET10',
      ctaText: 'Shop Deals Now',
      ctaLink: '#products',
      delaySeconds: 4,
    },
    settings: {
      brandName: 'All In One Gadget',
      topbarEnabled: true,
      topbarText: 'Cash on Delivery Nationwide  •  Spend ৳1,500+ Get ৳100 OFF  •  Use Code GADGET10 for 10% OFF  •  WhatsApp Order: 01791478704',
      deliveryChargeEnabled: true,
      insideDhakaFee: 70,
      outsideDhakaFee: 130,
      freeDeliveryMinSpend: 3500,
      whatsappOrderNumber: '8801791478704',
      hotlineNumber: '+8809696318704',
      supportEmail: 'mdnibirrasel@gmail.com',
      socialLinks: {
        facebook: 'https://facebook.com',
        instagram: 'https://instagram.com',
        youtube: 'https://youtube.com',
        tiktok: 'https://tiktok.com',
        whatsapp: 'https://wa.me/8801791478704',
      },
      discountTiers: [
        { id: 'tier-1', minSpend: 1500, type: 'fixed', value: 100, label: 'Spend ৳1,500+ → ৳100 OFF', active: true },
        { id: 'tier-2', minSpend: 3000, type: 'percent', value: 10, label: 'Spend ৳3,000+ → 10% OFF', active: true },
      ],
      seoTitle: 'All In One Gadget — Budget-Friendly Tech & Smart Gadgets BD',
      seoDescription: 'Shop wireless earbuds, smartwatches, power banks, trimmers, speakers, and smart home gadgets at All In One Gadget Bangladesh.',
    },
    reviews: [
      {
        id: 'rev-1',
        customerName: 'Mahmudul Hasan',
        location: 'Mirpur, Dhaka',
        productName: 'A9 Pro ANC Smart Screen Earbuds',
        rating: 5,
        comment: 'A9 Pro ta nsilam 2 din age. Touch screen case ta khub smooth kaj kore, ANC o decent ei budget e. Dhaka te next day delivery peyechi.',
        date: '2 days ago',
      },
      {
        id: 'rev-2',
        customerName: 'Sadia Afrin',
        location: 'Chattogram',
        productName: 'Jellyfish Mood Lamp + Speaker',
        rating: 4,
        comment: 'Lamp ta dekhte onek sundor, room er lighting mood puro change hoye jay. Packaging ektu aro valo hoile bhalo hoto, tobe product 100% ok ache.',
        date: '5 days ago',
      },
      {
        id: 'rev-3',
        customerName: 'Rakibul Islam',
        location: 'Uttara, Dhaka',
        productName: 'Baseus 20,000mAh 22.5W Power Bank',
        rating: 5,
        comment: 'Original Baseus Bipow power bank peyechi. Amar phone fast charge support kore ar 3-4 bar full charge dewa jay easy te.',
        date: '1 week ago',
      },
      {
        id: 'rev-4',
        customerName: 'Nayeem Hossain',
        location: 'Sylhet',
        productName: 'T800 Ultra 2 Smartwatch',
        rating: 4,
        comment: 'Price onujayi watch er display ar strap quality besh valo. Calling feature thik moto kaj kore, battery backup motamuti 2 din thake.',
        date: '1 week ago',
      },
      {
        id: 'rev-5',
        customerName: 'Farhan Tazwar',
        location: 'Rajshahi',
        productName: 'Vintage T9 Dragon Type-C Trimmer',
        rating: 4,
        comment: 'Trimmer ta metal body howay hate dhorle solid lage. Type-C charging thakay subidha hoyeche. Delivery 3 din lagche Rajshahi te.',
        date: '2 weeks ago',
      },
      {
        id: 'rev-6',
        customerName: 'Tasnim Jahan',
        location: 'Dhanmondi, Dhaka',
        productName: 'WGP Mini UPS for WiFi Router',
        rating: 5,
        comment: 'Current geleo router off hoy na ar! Online class ar office meeting er jonno life saver ekta gadget. Highly recommended.',
        date: '2 weeks ago',
      },
    ],
    adminCredential: null,
  };
}
