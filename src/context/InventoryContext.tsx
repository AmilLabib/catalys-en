import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { BusinessSector } from "./BusinessSectorContext";
import { useBusinessSector } from "./BusinessSectorContext";
import { useAccount } from "./AccountContext";
import { faktorStok, kunciToko } from "../utils/toko";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  unitCost: number; // HPP
  // Per-unit COGS used for pricing/reference (non-accounting COGS)
  cogsSalesBasis?: number;
  sellingPrice: number; // Harga jual
  image?: string;
  supplier?: string;
};

// v2: data v1 bisa berisi produk sektor lain yang tercampur, jadi diabaikan
const STORAGE_PREFIX = "inventory_v2_";

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

  if (sector === "perdagangan") {
    // Foto retail baru tersedia untuk 2 produk pertama (/retail/1.png, 2.png)
    const names = [
      "Mie Instan",
      "Beras 5kg",
      "Kecap ABC 600ml",
      "Susu UHT 1L",
      "Gula Pasir 1kg",
      "Minyak Goreng 1L",
      "Kopi Sachet",
      "Teh Celup",
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

  if (sector === "kuliner") {
    // kuliner images /kuliner/1.png..10.png
    const names = [
      "Bakso",
      "Mie Ayam",
      "Nasi Goreng",
      "Kentang Goreng",
      "Lalapan",
      "Matcha Latte",
      "Kopi Tubruk",
      "Aren Latte",
      "Butterscotch Latte",
      "Iced Tea",
    ];
    const costs = [
      25000, 20000, 25000, 15000, 35000, 20000, 12000, 22000, 25000, 8000,
    ];
    const base = names.map((n, i) =>
      make(
        n,
        "Kuliner",
        Math.max(30, 150 - i * 10),
        costs[i] || 10000,
        "kuliner",
        i + 1,
      ),
    );

    // Add requested mock items: 5x Lele, 5x Nila, 5x Ayam for kuliner sector
    const extraNames: string[] = [
      // Lele
      "Lele Goreng 1 porsi",
      "Lele Bakar 1 porsi",
      "Lele Sambal 1 porsi",
      "Ikan Lele Creamy 1 porsi",
      "Lele Fillet 1 pack",
      // Nila
      "Nila Goreng 1 porsi",
      "Nila Bakar 1 porsi",
      "Nila Sambal 1 porsi",
      "Nila Fillet 1 pack",
      "Nila Pepes 1 porsi",
      // Ayam
      "Ayam Goreng 1 porsi",
      "Ayam Bakar 1 porsi",
      "Ayam Rica 1 porsi",
      "Ayam Kremes 1 porsi",
      "Ayam Fillet 1 pack",
    ];
    const extraCosts: number[] = [
      18000,
      20000,
      20000,
      22000,
      40000, // lele
      22000,
      24000,
      24000,
      45000,
      23000, // nila
      18000,
      20000,
      20000,
      19000,
      42000, // ayam
    ];

    // Belum ada foto khusus untuk menu ini, jadi tampilkan placeholder
    // (sebelumnya memakai ulang foto bakso/mie sehingga terlihat bertumpuk)
    const extras = extraNames.map((n, i) => ({
      ...make(n, "Kuliner", Math.max(10, 80 - i * 2), extraCosts[i] || 20000, "kuliner", 1),
      image: undefined,
    }));

    return [...base, ...extras];
  }

  if (sector === "agribisnis") {
    // Agribisnis folder images `/Agribisnis/1.png..9.png`
    const names = [
      "Pupuk NPK Mutiara Biru 5kg",
      "Pupuk NPK Varian RG 2kg",
      "Neem Oil 500ml",
      "Pestisida Cair Siap Pakai 750ml",
      "Sprayer Elektrik Pertanian 16L",
      "Benih Sayuran Kemangi Lalap",
      "Sprayer Elektrik Farmjet",
      "REAIM Mist Blower",
      "Benih Bunga Nasturtium",
    ];
    const costs = [
      120000, 60000, 45000, 80000, 450000, 15000, 420000, 1200000, 8000,
    ];

    const base = names.map((n, i) =>
      make(
        n,
        "Agribisnis",
        Math.max(20, 200 - i * 10),
        costs[i] || 20000,
        "Agribisnis",
        i + 1,
      ),
    );

    return base;
  }

  if (sector === "fashion") {
    // Fashion & Kecantikan images folder name contains spaces
    const folder = "Fashion & Kecantikan";
    const names = [
      "Kaos Oversized Graphic Tee",
      "Kemeja Linen Long Sleeve",
      "Celana Cargo Pants",
      "Jaket Varsity Bomber",
      "Rok Plisket Maxi Skirt",
      "Serum Vitamin C Brightening",
      "Sunscreen Gel SPF 50",
      "Moisturizer Ceramide Gel",
      "Lip Tint Transferproof",
      "Micellar Water Cleansing",
    ];
    const costs = [
      120000, 150000, 180000, 320000, 220000, 90000, 75000, 95000, 65000, 50000,
    ];
    return names.map((n, i) =>
      make(
        n,
        "Fashion & Kecantikan",
        Math.max(10, 200 - i * 15),
        costs[i] || 50000,
        folder,
        i + 1,
      ),
    );
  }

  // industri -> use peternakan images as industrial/farm supplies
  if (sector === "industri") {
    const names = [
      "Pakan Ayam",
      "Pakan Sapi Potong",
      "Konsentrat Bebek Petelur",
      "Suplemen Vitamin Ternak Cair",
      "Obat Cacing Ternak",
      "Desinfektan Kandang",
      "Tempat Pakan Otomatis",
      "Nipple Drinker",
      "Lampu Penghangat Infrared 250W",
      "Serbuk Gergaji Alas Kandang",
    ];
    const costs = [
      250000, 450000, 180000, 90000, 60000, 70000, 120000, 45000, 350000, 15000,
    ];
    return names.map((n, i) =>
      make(
        n,
        "Industri",
        Math.max(10, 100 - i * 5),
        costs[i] || 50000,
        "peternakan",
        i + 1,
      ),
    );
  }

  return [];
}

function normalisasi(items: InventoryItem[]) {
  return items.map((item) => ({
    ...item,
    sellingPrice: item.sellingPrice ?? item.unitCost,
  }));
}

// Produk per toko (cabang). Cabang baru memakai katalog contoh yang sama dengan stok berbeda.
function muatToko(sector: BusinessSector, toko: string): InventoryItem[] {
  try {
    const raw = localStorage.getItem(kunciToko(STORAGE_PREFIX, sector, toko));
    if (raw) return normalisasi(JSON.parse(raw) as InventoryItem[]);
  } catch {
    // abaikan, pakai data contoh
  }
  return normalisasi(seedForSector(sector).map((p, i) => ({ ...p, qty: Math.round(p.qty * faktorStok(toko, i)) })));
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { sector } = useBusinessSector();
  const { tokoAktif } = useAccount();
  const kunci = `${sector}|${tokoAktif}`;

  // Inventaris disimpan per sektor dalam satu objek, sehingga daftar produk
  // selalu terikat pada sektornya sendiri. Versi lama menyimpan daftar
  // aktif ke kunci sektor baru sesaat setelah sektor diganti (produk satu
  // sektor bisa tertulis ke sektor lain) dan menimpa semua data dengan data
  // contoh setiap kali halaman dimuat ulang.
  const [store, setStore] = useState<Record<string, InventoryItem[]>>(() => ({ [kunci]: muatToko(sector, tokoAktif) }));

  useEffect(() => {
    try {
      for (const [k, items] of Object.entries(store)) {
        const [s, toko] = k.split("|");
        localStorage.setItem(kunciToko(STORAGE_PREFIX, s, toko), JSON.stringify(items));
      }
    } catch {
      // abaikan kegagalan penyimpanan
    }
  }, [store]);

  // Sektor yang belum pernah dibuka dibaca langsung dari penyimpanan,
  // lalu masuk ke store pada perubahan pertama
  const products = useMemo(() => store[kunci] ?? muatToko(sector, tokoAktif), [store, kunci, sector, tokoAktif]);

  const ubah = (fn: (items: InventoryItem[]) => InventoryItem[]) =>
    setStore((prev) => ({ ...prev, [kunci]: fn(prev[kunci] ?? muatToko(sector, tokoAktif)) }));

  const addProduct = (p: Omit<InventoryItem, "id">) => {
    const item: InventoryItem = {
      id: `${sector}-prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...p,
      sellingPrice: p.sellingPrice ?? p.unitCost,
    };
    ubah((s) => [item, ...s]);
  };

  const updateProduct = (id: string, p: Partial<InventoryItem>) =>
    ubah((s) => s.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const deleteProduct = (id: string) => ubah((s) => s.filter((it) => it.id !== id));

  const decrementStock = (id: string, qty: number) => {
    const current = products.find((p) => p.id === id);
    if (!current || current.qty < qty) return false;
    ubah((s) => s.map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty - qty) } : p)));
    return true;
  };

  const incrementStock = (id: string, qty: number) =>
    ubah((s) => s.map((p) => (p.id === id ? { ...p, qty: p.qty + qty } : p)));

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
        setProducts: (items) => ubah(() => items),
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
