// Sample raw material stock per sector, product recipes, and suppliers.
import type { BusinessSector } from "../context/BusinessSectorContext";
import { findRegion } from "../utils/pricing";

export type RawMaterial = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number; // "running low" threshold
  price: number; // average purchase price per unit
  dailyUsage: number; // average usage per day
};

export type RecipeItem = { materialId: string; qty: number }; // qty per 1 product unit
export type Recipe = Record<string, RecipeItem[]>; // key: product name (lowercase)

type Seed = [id: string, name: string, category: string, unit: string, stock: number, minStock: number, price: number, dailyUsage: number];

const SEED: Record<BusinessSector, { materials: Seed[]; recipes: Record<string, [string, number][]> }> = {
  culinary: {
    materials: [
      ["beef", "Beef", "Protein", "kg", 6, 8, 135_000, 2.4],
      ["chicken", "Chicken", "Protein", "kg", 22, 10, 38_000, 3.1],
      ["catfish", "Catfish", "Protein", "kg", 9, 6, 28_000, 1.6],
      ["tilapia", "Tilapia", "Protein", "kg", 4, 6, 34_000, 1.2],
      ["tapioca", "Tapioca flour", "Flour & carbs", "kg", 14, 5, 13_000, 0.9],
      ["noodles", "Fresh noodles", "Flour & carbs", "kg", 11, 6, 16_000, 1.8],
      ["rice", "Premium rice", "Flour & carbs", "kg", 48, 20, 15_000, 6.5],
      ["potato", "Potatoes", "Vegetables & spices", "kg", 7, 5, 18_000, 1.1],
      ["spices", "Ground spice paste", "Vegetables & spices", "kg", 3, 2, 60_000, 0.35],
      ["oil", "Cooking oil", "Oil & sugar", "liter", 16, 10, 17_500, 2.8],
      ["sugar", "Granulated sugar", "Oil & sugar", "kg", 9, 5, 17_000, 0.8],
      ["coffee", "Ground robusta coffee", "Beverages", "kg", 2.5, 2, 140_000, 0.3],
      ["milk", "Fresh milk", "Beverages", "liter", 12, 8, 21_000, 2.2],
      ["matcha", "Matcha powder", "Beverages", "kg", 0.8, 0.5, 420_000, 0.06],
      ["tea", "Tea bags (25 pcs)", "Beverages", "box", 6, 4, 11_000, 0.9],
    ],
    recipes: {
      "meatball soup": [["beef", 0.06], ["tapioca", 0.03], ["spices", 0.005]],
      "chicken noodles": [["noodles", 0.15], ["chicken", 0.05], ["oil", 0.01]],
      "fried rice": [["rice", 0.12], ["chicken", 0.03], ["oil", 0.02], ["spices", 0.005]],
      "french fries": [["potato", 0.15], ["oil", 0.03]],
      "chicken rice platter": [["rice", 0.12], ["chicken", 0.12], ["spices", 0.005]],
      "matcha latte": [["matcha", 0.01], ["milk", 0.15], ["sugar", 0.015]],
      "tubruk coffee": [["coffee", 0.015], ["sugar", 0.015]],
      "palm sugar latte": [["coffee", 0.015], ["milk", 0.15], ["sugar", 0.02]],
      "butterscotch latte": [["coffee", 0.015], ["milk", 0.15], ["sugar", 0.02]],
      "iced tea": [["tea", 0.04], ["sugar", 0.02]],
      "fried catfish (1 serving)": [["catfish", 0.25], ["oil", 0.03], ["rice", 0.12]],
      "grilled catfish (1 serving)": [["catfish", 0.25], ["spices", 0.01], ["rice", 0.12]],
      "catfish with sambal (1 serving)": [["catfish", 0.25], ["spices", 0.015], ["rice", 0.12]],
      "fried tilapia (1 serving)": [["tilapia", 0.3], ["oil", 0.03], ["rice", 0.12]],
      "grilled tilapia (1 serving)": [["tilapia", 0.3], ["spices", 0.01], ["rice", 0.12]],
      "fried chicken (1 serving)": [["chicken", 0.25], ["oil", 0.03], ["rice", 0.12]],
      "grilled chicken (1 serving)": [["chicken", 0.25], ["spices", 0.01], ["rice", 0.12]],
    },
  },
  agribusiness: {
    materials: [
      ["npk", "Bulk NPK fertilizer", "Fertilizer", "kg", 140, 100, 11_000, 16],
      ["compost", "Organic compost", "Fertilizer", "kg", 320, 150, 2_500, 22],
      ["neem", "Pure neem oil", "Botanical pesticide", "liter", 6, 5, 70_000, 0.7],
      ["pesticide", "Pesticide concentrate", "Botanical pesticide", "liter", 3, 4, 210_000, 0.4],
      ["basil-seeds", "Bulk basil seeds", "Seeds", "gram", 900, 500, 120, 60],
      ["flower-seeds", "Bulk flower seeds", "Seeds", "gram", 300, 300, 180, 25],
      ["sack", "Packaging sack", "Packaging", "pcs", 160, 80, 1_500, 14],
      ["bottle", "500 ml packaging bottle", "Packaging", "pcs", 120, 60, 2_200, 9],
      ["zip-bag", "Seed zip bag", "Packaging", "pcs", 600, 300, 150, 45],
    ],
    recipes: {
      "npk mutiara biru fertilizer 5kg": [["npk", 5], ["sack", 1]],
      "npk fertilizer rg variant 2kg": [["npk", 2], ["sack", 1]],
      "neem oil 500ml": [["neem", 0.5], ["bottle", 1]],
      "ready-to-use liquid pesticide 750ml": [["pesticide", 0.15], ["bottle", 1]],
      "basil vegetable seeds": [["basil-seeds", 10], ["zip-bag", 1]],
      "nasturtium flower seeds": [["flower-seeds", 5], ["zip-bag", 1]],
    },
  },
  fashion: {
    materials: [
      ["cotton", "Combed cotton fabric", "Fabric", "meter", 85, 60, 42_000, 7.5],
      ["linen", "Linen fabric", "Fabric", "meter", 34, 40, 68_000, 4.2],
      ["twill", "Twill fabric", "Fabric", "meter", 52, 40, 55_000, 5.1],
      ["thread", "Sewing thread", "Sewing accessories", "spool", 40, 25, 9_000, 2.6],
      ["buttons", "Shirt buttons", "Sewing accessories", "pcs", 900, 500, 350, 48],
      ["zipper", "Zipper", "Sewing accessories", "pcs", 140, 100, 2_500, 9],
      ["label", "Labels & hangtags", "Packaging", "pcs", 700, 400, 600, 30],
      ["jar", "Cosmetic bottles & jars", "Packaging", "pcs", 220, 150, 3_800, 12],
    ],
    recipes: {
      "oversized graphic tee": [["cotton", 1.2], ["thread", 0.1], ["label", 1]],
      "long sleeve linen shirt": [["linen", 1.6], ["buttons", 8], ["thread", 0.15], ["label", 1]],
      "cargo pants": [["twill", 1.4], ["zipper", 1], ["buttons", 1], ["thread", 0.15], ["label", 1]],
      "varsity bomber jacket": [["twill", 1.8], ["buttons", 6], ["thread", 0.2], ["label", 1]],
      "pleated maxi skirt": [["cotton", 2], ["zipper", 1], ["label", 1]],
      "vitamin c brightening serum": [["jar", 1], ["label", 1]],
      "sunscreen gel spf 50": [["jar", 1], ["label", 1]],
      "ceramide gel moisturizer": [["jar", 1], ["label", 1]],
    },
  },
  manufacturing: {
    materials: [
      ["corn", "Ground corn", "Feed ingredients", "kg", 1_400, 1_000, 6_200, 180],
      ["soymeal", "Soybean meal", "Feed ingredients", "kg", 520, 600, 9_800, 75],
      ["bran", "Rice bran", "Feed ingredients", "kg", 1_900, 900, 3_600, 210],
      ["premix", "Vitamin premix", "Additives", "kg", 36, 20, 48_000, 3.2],
      ["disinfectant", "Disinfectant base", "Additives", "liter", 14, 10, 65_000, 1.1],
      ["sack50", "50 kg sack", "Packaging", "pcs", 140, 80, 4_500, 9],
      ["bottle1l", "1 liter bottle", "Packaging", "pcs", 90, 60, 3_000, 5],
    ],
    recipes: {
      "chicken feed": [["corn", 25], ["soymeal", 10], ["bran", 12], ["premix", 0.5], ["sack50", 1]],
      "beef cattle feed": [["bran", 30], ["soymeal", 10], ["corn", 8], ["sack50", 1]],
      "laying duck concentrate": [["corn", 20], ["soymeal", 12], ["premix", 0.5], ["sack50", 1]],
      "liquid livestock vitamin supplement": [["premix", 0.2], ["bottle1l", 1]],
      "coop disinfectant": [["disinfectant", 0.2], ["bottle1l", 1]],
    },
  },
  trade: {
    materials: [
      ["bulk-rice", "Bulk rice", "Bulk staples", "kg", 260, 150, 12_800, 32],
      ["bulk-sugar", "Bulk granulated sugar", "Bulk staples", "kg", 70, 80, 15_500, 11],
      ["bulk-oil", "Bulk cooking oil", "Bulk staples", "liter", 95, 60, 14_200, 9],
      ["plastic", "Packaging plastic", "Packaging", "pcs", 900, 400, 250, 55],
      ["pouch", "1 L oil pouch", "Packaging", "pcs", 140, 80, 900, 9],
      ["bag", "Shopping bag", "Packaging", "pcs", 350, 300, 180, 40],
    ],
    recipes: {
      "rice 5kg": [["bulk-rice", 5], ["plastic", 1]],
      "granulated sugar 1kg": [["bulk-sugar", 1], ["plastic", 1]],
      "cooking oil 1l": [["bulk-oil", 1], ["pouch", 1]],
    },
  },
};

export function initialMaterials(sector: BusinessSector): RawMaterial[] {
  return SEED[sector].materials.map(([id, name, category, unit, stock, minStock, price, dailyUsage]) => ({
    id: `${sector}-${id}`,
    name,
    category,
    unit,
    stock,
    minStock,
    price,
    dailyUsage,
  }));
}

export function initialRecipes(sector: BusinessSector): Recipe {
  const out: Recipe = {};
  for (const [product, items] of Object.entries(SEED[sector].recipes)) {
    out[product] = items.map(([id, qty]) => ({ materialId: `${sector}-${id}`, qty }));
  }
  return out;
}

export type StockStatus = "out of stock" | "running low" | "safe";
export function stockStatus(m: RawMaterial): StockStatus {
  if (m.stock <= 0) return "out of stock";
  if (m.stock <= m.minStock) return "running low";
  return "safe";
}

export function daysLeft(m: RawMaterial) {
  return m.dailyUsage > 0 ? m.stock / m.dailyUsage : Infinity;
}

// ---------- 12-week stock trend (simulated backwards from current stock) ----------

function random(seed: number) {
  const x = Math.sin(seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type TrendPoint = { week: string; stock: number; used: number; restock: number };

export function stockTrend(m: RawMaterial, weekCount = 12): { points: TrendPoint[]; lowCount: number } {
  const seed = Array.from(m.id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const points: TrendPoint[] = [];
  // built from the oldest week: stock drops by usage; when the remaining
  // stock hits the minimum it counts as "running low" and is restocked
  // by 1–2 weeks of usage
  const weekly = m.dailyUsage * 7;
  let stock = m.minStock + weekly * (1 + random(seed) * 1.2);
  let count = 0;
  const now = new Date();
  for (let i = weekCount - 1; i >= 0; i--) {
    const used = weekly * (0.75 + random(seed + i) * 0.5);
    const remaining = Math.max(0, stock - used);
    let restock = 0;
    if (remaining <= m.minStock * (1 + random(seed + i * 3) * 0.3)) {
      if (remaining <= m.minStock) count++;
      restock = weekly * (1 + random(seed + i * 5));
    }
    stock = remaining + restock;
    const date = new Date(now.getTime() - i * 7 * 86_400_000);
    points.push({
      week: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      stock: Math.round(stock * 10) / 10,
      used: Math.round(used * 10) / 10,
      restock: Math.round(restock * 10) / 10,
    });
  }
  // last point = actual current stock
  points[points.length - 1].stock = Math.round(m.stock * 10) / 10;
  return { points, lowCount: count };
}

// ---------- Nearest suppliers per material ----------

export type MaterialSupplier = {
  name: string;
  type: "Wholesaler" | "Traditional market" | "Distributor";
  district: string;
  city: string;
  distanceKm: number;
  price: number;
  rating: number;
  minOrder: string;
  photo: StorePhoto;
};

// Illustrative store-type photos from Wikimedia Commons (Creative Commons license, credit required)
export type StorePhoto = { src: string; author: string; license: string; source: string };

const COMMONS = "https://commons.wikimedia.org/wiki/File:";
const STORE_PHOTOS: Record<MaterialSupplier["type"], StorePhoto[]> = {
  "Traditional market": [
    { src: "/supplier/market-1.jpg", author: "Nafisaacdr", license: "CC BY 4.0", source: `${COMMONS}Penjual_sayur_pasar.jpg` },
    { src: "/supplier/market-2.jpg", author: "Astari28", license: "CC BY 4.0", source: `${COMMONS}Sayur_di_pasar_tanjung.jpg` },
    { src: "/supplier/market-3.jpg", author: "Abdul Hanif Arromy", license: "CC BY 4.0", source: `${COMMONS}Pasar_Raya_Padang_171751.jpg` },
    { src: "/supplier/market-4.jpg", author: "Ivuvisual", license: "CC BY-SA 4.0", source: `${COMMONS}Pasar_Tradisional_Jawa_Timur.jpg` },
  ],
  Wholesaler: [
    { src: "/supplier/wholesale-1.jpg", author: "Indonesiagood", license: "CC BY 4.0", source: `${COMMONS}Suasana_Toko_Sembako_di_Pasar_Induk_Pare_Kediri.jpg` },
    { src: "/supplier/wholesale-2.jpg", author: "Indonesiagood", license: "CC BY 4.0", source: `${COMMONS}Pasar_Induk_Pare_Kediri-5.jpg` },
    { src: "/supplier/wholesale-3.jpg", author: "Nela Fatimatun", license: "CC BY 4.0", source: `${COMMONS}Penjual_sembako_di_pasar_tampak_samping.jpg` },
  ],
  Distributor: [
    { src: "/supplier/distributor-1.jpg", author: "Ivuvisual", license: "CC BY-SA 4.0", source: `${COMMONS}Penyimpanan_Kentang.jpg` },
    { src: "/supplier/distributor-2.jpg", author: "CocoyAguilar", license: "CC BY-SA 4.0", source: `${COMMONS}Philippines_worker.jpg` },
    { src: "/supplier/distributor-3.jpg", author: "Encik Tekateki", license: "CC BY 4.0", source: `${COMMONS}Warehouse_Interior_Storing_Batteries_in_Indonesia.jpg` },
  ],
};

const SUPPLIER_NAMES = ["Sumber Makmur", "Jaya Abadi", "Sinar Baru", "Berkah Tani", "Maju Jaya", "Sentosa", "Mulia Sejahtera", "Barokah", "Karya Mandiri", "Cahaya Baru"];
const TYPES: MaterialSupplier["type"][] = ["Wholesaler", "Traditional market", "Distributor"];

export function materialSuppliers(m: RawMaterial, city: string): MaterialSupplier[] {
  const r = findRegion(city);
  const seed = Array.from(m.id + r.city).reduce((s, c) => s + c.charCodeAt(0), 0);
  return TYPES.map((type, i) => {
    const name = SUPPLIER_NAMES[(seed + i * 3) % SUPPLIER_NAMES.length];
    const factor = type === "Distributor" ? 0.92 : type === "Wholesaler" ? 0.97 : 1.03;
    return {
      name: type === "Wholesaler" ? `${name} Wholesale` : type === "Distributor" ? `CV ${name}` : `${name} Stall (${r.districts[i % r.districts.length]} Market)`,
      type,
      district: r.districts[(seed + i) % r.districts.length],
      city: r.city,
      distanceKm: Math.round((0.6 + random(seed + i) * (type === "Distributor" ? 14 : 6)) * 10) / 10,
      price: Math.round((m.price * r.priceIndex * factor * (0.96 + random(seed + i * 7) * 0.08)) / 50) * 50,
      rating: Math.round((4.3 + random(seed + i * 11) * 0.7) * 10) / 10,
      minOrder: type === "Distributor" ? `min. ${Math.max(1, Math.round(m.minStock))} ${m.unit}` : type === "Wholesaler" ? `min. ${Math.max(1, Math.round(m.minStock / 3))} ${m.unit}` : "no minimum",
      photo: STORE_PHOTOS[type][(seed + i) % STORE_PHOTOS[type].length],
    };
  }).sort((a, b2) => a.distanceKm - b2.distanceKm);
}

export const mapsLink = (s: MaterialSupplier) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.district} ${s.city}`)}`;
export const shopeeLink = (m: RawMaterial) => `https://shopee.co.id/search?keyword=${encodeURIComponent(m.name)}`;
