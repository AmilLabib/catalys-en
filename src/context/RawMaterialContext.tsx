import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useBusinessSector, type BusinessSector } from "./BusinessSectorContext";
import { initialMaterials, initialRecipes, type RawMaterial, type RecipeItem, type Recipe } from "../data/rawMaterials";
import { useAccount } from "./AccountContext";
import { stockFactor, storeKey } from "../utils/store";

const STORAGE_PREFIX = "catalys_materials_v1_";

type SectorData = { materials: RawMaterial[]; recipes: Recipe };

// Raw materials & recipes per store (branch). New branch: same sample materials, different stock.
function load(sector: BusinessSector, store: string): SectorData {
  try {
    const raw = localStorage.getItem(storeKey(STORAGE_PREFIX, sector, store));
    if (raw) return JSON.parse(raw) as SectorData;
  } catch {
    // ignore, use sample data
  }
  const materials = initialMaterials(sector).map((m, i) => ({ ...m, stock: Math.round(m.stock * stockFactor(store, i) * 10) / 10 }));
  return { materials, recipes: initialRecipes(sector) };
}

type Ctx = {
  materials: RawMaterial[];
  recipes: Recipe;
  getMaterial: (id: string) => RawMaterial | undefined;
  productRecipe: (productName: string) => RecipeItem[];
  setRecipe: (productName: string, items: RecipeItem[]) => void;
  addMaterial: (m: Omit<RawMaterial, "id">) => void;
  updateMaterial: (id: string, m: Partial<RawMaterial>) => void;
  removeMaterial: (id: string) => void;
  /** purchase: stock increases and the average price is updated (weighted average) */
  addStock: (id: string, qty: number, totalPrice: number) => void;
  /** material usage for sold products; returns the materials that became low */
  consumeForSales: (items: { name: string; quantity: number }[]) => RawMaterial[];
  matchMaterial: (text: string) => RawMaterial | undefined;
};

const ctx = createContext<Ctx | undefined>(undefined);

export function RawMaterialProvider({ children }: { children: React.ReactNode }) {
  const { sector } = useBusinessSector();
  const { activeStore } = useAccount();
  const key = `${sector}|${activeStore}`;
  const [store, setStore] = useState<Record<string, SectorData>>(() => ({ [key]: load(sector, activeStore) }));
  const data = useMemo(() => store[key] ?? load(sector, activeStore), [store, key, sector, activeStore]);

  useEffect(() => {
    try {
      for (const [k, d] of Object.entries(store)) {
        const [s, storeName] = k.split("|");
        localStorage.setItem(storeKey(STORAGE_PREFIX, s, storeName), JSON.stringify(d));
      }
    } catch {
      // ignore
    }
  }, [store]);

  const update = (fn: (d: SectorData) => SectorData) =>
    setStore((prev) => ({ ...prev, [key]: fn(prev[key] ?? load(sector, activeStore)) }));
  const updateList = (fn: (m: RawMaterial[]) => RawMaterial[]) => update((d) => ({ ...d, materials: fn(d.materials) }));

  const value: Ctx = {
    materials: data.materials,
    recipes: data.recipes,
    getMaterial: (id) => data.materials.find((m) => m.id === id),
    productRecipe: (name) => data.recipes[name.toLowerCase()] ?? [],
    setRecipe: (name, items) => update((d) => ({ ...d, recipes: { ...d.recipes, [name.toLowerCase()]: items } })),
    addMaterial: (m) => updateList((xs) => [{ ...m, id: `${sector}-material-${Date.now()}` }, ...xs]),
    updateMaterial: (id, p) => updateList((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x))),
    removeMaterial: (id) => updateList((xs) => xs.filter((x) => x.id !== id)),
    addStock: (id, qty, totalPrice) =>
      updateList((xs) =>
        xs.map((x) => {
          if (x.id !== id || qty <= 0) return x;
          const newStock = x.stock + qty;
          const newPrice = Math.round((x.stock * x.price + totalPrice) / newStock);
          return { ...x, stock: Math.round(newStock * 1000) / 1000, price: newPrice };
        }),
      ),
    consumeForSales: (items) => {
      const usage = new Map<string, number>();
      for (const it of items) {
        for (const r of data.recipes[it.name.toLowerCase()] ?? []) usage.set(r.materialId, (usage.get(r.materialId) ?? 0) + r.qty * it.quantity);
      }
      if (usage.size === 0) return [];
      const runningLow: RawMaterial[] = [];
      for (const m of data.materials) {
        const q = usage.get(m.id);
        if (q && m.stock > m.minStock && m.stock - q <= m.minStock) runningLow.push(m);
      }
      updateList((xs) => xs.map((x) => (usage.has(x.id) ? { ...x, stock: Math.max(0, Math.round((x.stock - usage.get(x.id)!) * 1000) / 1000) } : x)));
      return runningLow;
    },
    matchMaterial: (text) => {
      const t = text.toLowerCase();
      return (
        data.materials.find((m) => t.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(t)) ??
        data.materials.find((m) => m.name.toLowerCase().split(" ").some((w) => w.length > 3 && t.includes(w)))
      );
    },
  };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useRawMaterials() {
  const c = useContext(ctx);
  if (!c) throw new Error("useRawMaterials must be used within RawMaterialProvider");
  return c;
}
