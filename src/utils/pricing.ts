// Sample competitor price data (no AI / API), per region. Deterministic
// from product name + region so results stay consistent on every search.

export type Region = {
  city: string;
  province: string;
  priceIndex: number; // 1 = national average
  districts: string[];
};

export const REGIONS: Region[] = [
  { city: "Jakarta Selatan", province: "DKI Jakarta", priceIndex: 1.14, districts: ["Kebayoran Baru", "Tebet", "Pancoran", "Cilandak", "Mampang"] },
  { city: "Bogor", province: "West Java", priceIndex: 1.03, districts: ["Bogor Tengah", "Bogor Utara", "Tanah Sareal", "Bogor Barat", "Bogor Timur"] },
  { city: "Bandung", province: "West Java", priceIndex: 1.0, districts: ["Coblong", "Sukajadi", "Lengkong", "Buahbatu", "Cicendo"] },
  { city: "Semarang", province: "Central Java", priceIndex: 0.95, districts: ["Semarang Tengah", "Banyumanik", "Tembalang", "Candisari", "Gajahmungkur"] },
  { city: "Surakarta", province: "Central Java", priceIndex: 0.92, districts: ["Laweyan", "Banjarsari", "Jebres", "Pasar Kliwon", "Serengan"] },
  { city: "Yogyakarta", province: "DI Yogyakarta", priceIndex: 0.9, districts: ["Gondokusuman", "Umbulharjo", "Danurejan", "Jetis", "Mergangsan"] },
  { city: "Surabaya", province: "East Java", priceIndex: 1.02, districts: ["Gubeng", "Tegalsari", "Wonokromo", "Sukolilo", "Rungkut"] },
  { city: "Malang", province: "East Java", priceIndex: 0.94, districts: ["Klojen", "Lowokwaru", "Blimbing", "Sukun", "Kedungkandang"] },
  { city: "Denpasar", province: "Bali", priceIndex: 1.1, districts: ["Denpasar Selatan", "Denpasar Barat", "Denpasar Timur", "Denpasar Utara"] },
  { city: "Medan", province: "North Sumatra", priceIndex: 1.0, districts: ["Medan Baru", "Medan Petisah", "Medan Kota", "Medan Johor"] },
  { city: "Makassar", province: "South Sulawesi", priceIndex: 1.04, districts: ["Panakkukang", "Rappocini", "Tamalate", "Makassar"] },
  { city: "Balikpapan", province: "East Kalimantan", priceIndex: 1.15, districts: ["Balikpapan Kota", "Balikpapan Selatan", "Balikpapan Utara"] },
];

// City center coordinates (latitude, longitude) for the map
export const CITY_COORDINATES: Record<string, [number, number]> = {
  "Jakarta Selatan": [-6.261, 106.81],
  Bogor: [-6.595, 106.806],
  Bandung: [-6.917, 107.619],
  Semarang: [-6.99, 110.42],
  Surakarta: [-7.566, 110.823],
  Yogyakarta: [-7.797, 110.37],
  Surabaya: [-7.257, 112.752],
  Malang: [-7.98, 112.63],
  Denpasar: [-8.65, 115.216],
  Medan: [3.595, 98.672],
  Makassar: [-5.147, 119.432],
  Balikpapan: [-1.265, 116.831],
};

export type Competitor = {
  store: string;
  product: string;
  channel: "Shopee" | "Tokopedia" | "TikTok Shop" | "GrabFood" | "Physical store";
  district: string;
  distanceKm: number;
  price: number;
  rating: number;
  sold: number;
  similarity: number; // 0–1, how similar the product is
  relevance: number; // 0–100, combined score
};

export type MarketPricing = {
  region: Region;
  average: number;
  lowest: number;
  highest: number;
  competitors: Competitor[]; // relevant, sorted from most relevant
  all: Competitor[]; // every search result
};

const STORES = ["Sumber Rejeki", "Kedai Nusantara", "Berkah Jaya", "Mitra Usaha", "Toko Sinar", "Rumah Produk", "Pojok Hemat", "Warung Barokah", "Sentosa", "Kios Makmur", "Dapur Ibu", "Sahabat"];
const CHANNELS: Competitor["channel"][] = ["Shopee", "Tokopedia", "TikTok Shop", "GrabFood", "Physical store"];

// Product variants that appear in search results and how similar they are to your product
const VARIANTS: [(n: string) => string, number][] = [
  [(n) => n, 1],
  [(n) => n, 1],
  [(n) => `${n} Original`, 0.9],
  [(n) => `${n} Jumbo`, 0.75],
  [(n) => `${n} Premium`, 0.7],
  [(n) => `${n} Value Pack`, 0.6],
  [(n) => `${n} 2-Pack`, 0.5],
  [(n) => `${n.split(" ")[0]} other variant`, 0.4],
];

function random(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function roundPrice(v: number) {
  const step = v >= 100_000 ? 1000 : v >= 10_000 ? 500 : 100;
  return Math.round(v / step) * step;
}

export function findRegion(city: string) {
  return REGIONS.find((r) => r.city === city) ?? REGIONS[1];
}

/**
 * @param productName product name to search for
 * @param reference estimated national price (e.g. selling price of a similar product in inventory)
 * @param city search region
 * @param radiusKm max competitor distance considered relevant
 */
export function fetchMarketPricing(productName: string, reference: number, city: string, radiusKm = 10): Promise<MarketPricing> {
  const region = findRegion(city);
  const seed = Array.from(`${productName.toLowerCase()}|${region.city}`).reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 100_000;
  const localReference = reference * region.priceIndex;

  const all: Competitor[] = Array.from({ length: 12 }, (_, i) => {
    const [makeName, similarity] = VARIANTS[i % VARIANTS.length];
    // "jumbo/premium" variants tend to cost more, "pack/other variant" drift further from the reference price
    const premium = 1 + (1 - similarity) * (i % 2 === 0 ? 0.6 : -0.3);
    const variation = 0.85 + random(seed + i * 13) * 0.3;
    const distanceKm = Math.round((0.4 + random(seed + i * 5) * 24) * 10) / 10;
    const price = roundPrice(localReference * variation * premium);
    const proximity = Math.max(0, 1 - distanceKm / 25);
    const priceGap = Math.min(1, Math.abs(price - localReference) / localReference);
    const relevance = Math.round((similarity * 0.5 + proximity * 0.3 + (1 - priceGap) * 0.2) * 100);
    return {
      store: `${STORES[(seed + i) % STORES.length]}`,
      product: makeName(productName),
      channel: CHANNELS[(seed + i * 2) % CHANNELS.length],
      district: region.districts[(seed + i) % region.districts.length],
      distanceKm,
      price,
      rating: Math.round((4.2 + random(seed + i * 7) * 0.8) * 10) / 10,
      sold: Math.round(50 + random(seed + i * 3) * 950),
      similarity,
      relevance,
    };
  }).sort((a, b) => b.relevance - a.relevance);

  const result = summarizeMarket(all, region, radiusKm);
  return new Promise((resolve) => setTimeout(() => resolve(result), 600));
}

// Relevant competitors: product is similar enough (≥ 70%) and within the radius.
// Kept separate from the search so changing the radius doesn't use another token.
export function summarizeMarket(all: Competitor[], region: Region, radiusKm: number): MarketPricing {
  let competitors = all.filter((c) => c.similarity >= 0.7 && c.distanceKm <= radiusKm);
  if (competitors.length < 3) competitors = all.filter((c) => c.similarity >= 0.7).slice(0, 5);
  const prices = competitors.map((c) => c.price);
  const average = roundPrice(prices.reduce((s, p) => s + p, 0) / prices.length);
  return { region, average, lowest: Math.min(...prices), highest: Math.max(...prices), competitors, all };
}
