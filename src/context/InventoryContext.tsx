import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { BusinessSector } from "./BusinessSectorContext";
import { useBusinessSector } from "./BusinessSectorContext";
import { useAccount } from "./AccountContext";
import { stockFactor, storeKey } from "../utils/store";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  unitCost: number; // COGS
  // Per-unit COGS used for pricing/reference (non-accounting COGS)
  cogsSalesBasis?: number;
  sellingPrice: number; // Selling price
  image?: string;
  supplier?: string;
};

// v3: English product names; older data is ignored
const STORAGE_PREFIX = "inventory_v3_";

type InventoryCtx = {
  products: InventoryItem[];
  addProduct: (p: Omit<InventoryItem, "id">) => void;
  updateProduct: (id: string, p: Partial<InventoryItem>) => void;
  deleteProduct: (id: string) => void;
  decrementStock: (id: string, qty: number) => boolean;
  incrementStock: (id: string, qty: number) => void;
  getById: (id: string) => InventoryItem | undefined;
  setProducts: (items: InventoryItem[]) => void;
};

const ctx = createContext<InventoryCtx | undefined>(undefined);

function seedForSector(sector: BusinessSector): InventoryItem[] {
  const make = (
    n: string,
    category: string,
    qty: number,
    unitCost: number,
    folder: string,
    idx: number,
    sellingPrice?: number,
  ) =>
    ({
      id: `${sector}-${idx}-${n.replace(/\s+/g, "-").toLowerCase()}`,
      name: n,
      category,
      qty,
      unit: "pcs",
      unitCost,
      sellingPrice: sellingPrice ?? Math.round((unitCost * 1.3) / 500) * 500,
      image: `/${encodeURIComponent(folder)}/${idx}.png`,
      supplier: "Default Supplier",
    }) as InventoryItem;

  if (sector === "trade") {
    // Retail photos are only available for the first 2 products (/retail/1.png, 2.png)
    const names = [
      "Instant Noodles",
      "Rice 5kg",
      "ABC Soy Sauce 600ml",
      "UHT Milk 1L",
      "Granulated Sugar 1kg",
      "Cooking Oil 1L",
      "Coffee Sachet",
      "Tea Bags",
    ];
    return names.map((n, i) => {
      const item = make(
        n,
        "Retail",
        Math.max(50, 200 - i * 20),
        [4000, 72000, 18000, 12000, 12000, 16000, 2500, 2000][i] || 10000,
        "retail",
        i + 1,
      );
      return i < 2 ? item : { ...item, image: undefined };
    });
  }

  if (sector === "culinary") {
    // culinary images /culinary/1.png..10.png
    const names = [
      "Meatball Soup",
      "Chicken Noodles",
      "Fried Rice",
      "French Fries",
      "Chicken Rice Platter",
      "Matcha Latte",
      "Tubruk Coffee",
      "Palm Sugar Latte",
      "Butterscotch Latte",
      "Iced Tea",
    ];
    const costs = [
      25000, 20000, 25000, 15000, 35000, 20000, 12000, 22000, 25000, 8000,
    ];
    const base = names.map((n, i) =>
      make(
        n,
        "Culinary",
        Math.max(30, 150 - i * 10),
        costs[i] || 10000,
        "culinary",
        i + 1,
      ),
    );

    // Add requested mock items: 5x Catfish, 5x Tilapia, 5x Chicken for the culinary sector
    const extraNames: string[] = [
      // Catfish
      "Fried Catfish (1 serving)",
      "Grilled Catfish (1 serving)",
      "Catfish with Sambal (1 serving)",
      "Creamy Catfish (1 serving)",
      "Catfish Fillet (1 pack)",
      // Tilapia
      "Fried Tilapia (1 serving)",
      "Grilled Tilapia (1 serving)",
      "Tilapia with Sambal (1 serving)",
      "Tilapia Fillet (1 pack)",
      "Pepes Tilapia (1 serving)",
      // Chicken
      "Fried Chicken (1 serving)",
      "Grilled Chicken (1 serving)",
      "Rica-Rica Chicken (1 serving)",
      "Kremes Fried Chicken (1 serving)",
      "Chicken Fillet (1 pack)",
    ];
    const extraCosts: number[] = [
      18000,
      20000,
      20000,
      22000,
      40000, // catfish
      22000,
      24000,
      24000,
      45000,
      23000, // tilapia
      18000,
      20000,
      20000,
      19000,
      42000, // chicken
    ];

    // No dedicated photos for these menu items yet, so show a placeholder
    // (previously reused the meatball/noodle photos, which looked duplicated)
    const extras = extraNames.map((n, i) => ({
      ...make(n, "Culinary", Math.max(10, 80 - i * 2), extraCosts[i] || 20000, "culinary", 1),
      image: undefined,
    }));

    return [...base, ...extras];
  }

  if (sector === "agribusiness") {
    // agribusiness folder images `/agribusiness/1.png..9.png`
    const names = [
      "NPK Mutiara Biru Fertilizer 5kg",
      "NPK Fertilizer RG Variant 2kg",
      "Neem Oil 500ml",
      "Ready-to-Use Liquid Pesticide 750ml",
      "Electric Farm Sprayer 16L",
      "Basil Vegetable Seeds",
      "Farmjet Electric Sprayer",
      "REAIM Mist Blower",
      "Nasturtium Flower Seeds",
    ];
    const costs = [
      120000, 60000, 45000, 80000, 450000, 15000, 420000, 1200000, 8000,
    ];

    const base = names.map((n, i) =>
      make(
        n,
        "Agribusiness",
        Math.max(20, 200 - i * 10),
        costs[i] || 20000,
        "agribusiness",
        i + 1,
      ),
    );

    return base;
  }

  if (sector === "fashion") {
    const folder = "fashion-beauty";
    const names = [
      "Oversized Graphic Tee",
      "Long Sleeve Linen Shirt",
      "Cargo Pants",
      "Varsity Bomber Jacket",
      "Pleated Maxi Skirt",
      "Vitamin C Brightening Serum",
      "Sunscreen Gel SPF 50",
      "Ceramide Gel Moisturizer",
      "Transferproof Lip Tint",
      "Cleansing Micellar Water",
    ];
    const costs = [
      120000, 150000, 180000, 320000, 220000, 90000, 75000, 95000, 65000, 50000,
    ];
    return names.map((n, i) =>
      make(
        n,
        "Fashion & Beauty",
        Math.max(10, 200 - i * 15),
        costs[i] || 50000,
        folder,
        i + 1,
      ),
    );
  }

  // manufacturing -> use livestock images as industrial/farm supplies
  if (sector === "manufacturing") {
    const names = [
      "Chicken Feed",
      "Beef Cattle Feed",
      "Laying Duck Concentrate",
      "Liquid Livestock Vitamin Supplement",
      "Livestock Dewormer",
      "Coop Disinfectant",
      "Automatic Feeder",
      "Nipple Drinker",
      "Infrared Heat Lamp 250W",
      "Sawdust Coop Bedding",
    ];
    const costs = [
      250000, 450000, 180000, 90000, 60000, 70000, 120000, 45000, 350000, 15000,
    ];
    return names.map((n, i) =>
      make(
        n,
        "Manufacturing",
        Math.max(10, 100 - i * 5),
        costs[i] || 50000,
        "livestock",
        i + 1,
      ),
    );
  }

  return [];
}

function normalize(items: InventoryItem[]) {
  return items.map((item) => ({
    ...item,
    sellingPrice: item.sellingPrice ?? item.unitCost,
  }));
}

// Products per store (branch). New branches use the same sample catalog with different stock.
function loadStore(sector: BusinessSector, store: string): InventoryItem[] {
  try {
    const raw = localStorage.getItem(storeKey(STORAGE_PREFIX, sector, store));
    if (raw) return normalize(JSON.parse(raw) as InventoryItem[]);
  } catch {
    // ignore, use sample data
  }
  return normalize(seedForSector(sector).map((p, i) => ({ ...p, qty: Math.round(p.qty * stockFactor(store, i)) })));
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { sector } = useBusinessSector();
  const { activeStore } = useAccount();
  const key = `${sector}|${activeStore}`;

  // Inventory is stored per sector in a single object, so the product list
  // is always bound to its own sector. The old version wrote the active
  // list to the new sector key right after switching sectors (products of
  // one sector could end up in another) and overwrote all data with sample
  // data on every page reload.
  const [store, setStore] = useState<Record<string, InventoryItem[]>>(() => ({ [key]: loadStore(sector, activeStore) }));

  useEffect(() => {
    try {
      for (const [k, items] of Object.entries(store)) {
        const [s, storeName] = k.split("|");
        localStorage.setItem(storeKey(STORAGE_PREFIX, s, storeName), JSON.stringify(items));
      }
    } catch {
      // ignore storage failures
    }
  }, [store]);

  // Sectors not opened yet are read straight from storage,
  // then enter the store on the first change
  const products = useMemo(() => store[key] ?? loadStore(sector, activeStore), [store, key, sector, activeStore]);

  const update = (fn: (items: InventoryItem[]) => InventoryItem[]) =>
    setStore((prev) => ({ ...prev, [key]: fn(prev[key] ?? loadStore(sector, activeStore)) }));

  const addProduct = (p: Omit<InventoryItem, "id">) => {
    const item: InventoryItem = {
      id: `${sector}-prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...p,
      sellingPrice: p.sellingPrice ?? p.unitCost,
    };
    update((s) => [item, ...s]);
  };

  const updateProduct = (id: string, p: Partial<InventoryItem>) =>
    update((s) => s.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const deleteProduct = (id: string) => update((s) => s.filter((it) => it.id !== id));

  const decrementStock = (id: string, qty: number) => {
    const current = products.find((p) => p.id === id);
    if (!current || current.qty < qty) return false;
    update((s) => s.map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty - qty) } : p)));
    return true;
  };

  const incrementStock = (id: string, qty: number) =>
    update((s) => s.map((p) => (p.id === id ? { ...p, qty: p.qty + qty } : p)));

  const getById = (id: string) => products.find((p) => p.id === id);

  return (
    <ctx.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        decrementStock,
        incrementStock,
        getById,
        setProducts: (items) => update(() => items),
      }}
    >
      {children}
    </ctx.Provider>
  );
}

export function useInventory() {
  const c = useContext(ctx);
  if (!c) throw new Error("useInventory must be used within InventoryProvider");
  return c;
}
