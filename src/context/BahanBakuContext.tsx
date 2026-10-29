import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useBusinessSector, type BusinessSector } from "./BusinessSectorContext";
import { bahanAwal, resepAwal, type BahanBaku, type ItemResep, type Resep } from "../data/bahanBaku";
import { useAccount } from "./AccountContext";
import { faktorStok, kunciToko } from "../utils/toko";

const STORAGE_PREFIX = "catalys_bahan_v1_";

type DataSektor = { bahan: BahanBaku[]; resep: Resep };

// Bahan baku & resep per toko (cabang). Cabang baru: bahan contoh yang sama, stok berbeda.
function muat(sector: BusinessSector, toko: string): DataSektor {
  try {
    const raw = localStorage.getItem(kunciToko(STORAGE_PREFIX, sector, toko));
    if (raw) return JSON.parse(raw) as DataSektor;
  } catch {
    // abaikan, pakai data contoh
  }
  const bahan = bahanAwal(sector).map((b, i) => ({ ...b, stok: Math.round(b.stok * faktorStok(toko, i) * 10) / 10 }));
  return { bahan, resep: resepAwal(sector) };
}

type Ctx = {
  bahan: BahanBaku[];
  resep: Resep;
  getBahan: (id: string) => BahanBaku | undefined;
  resepProduk: (namaProduk: string) => ItemResep[];
  setResep: (namaProduk: string, items: ItemResep[]) => void;
  tambahBahan: (b: Omit<BahanBaku, "id">) => void;
  ubahBahan: (id: string, b: Partial<BahanBaku>) => void;
  hapusBahan: (id: string) => void;
  /** pembelian: stok bertambah dan harga rata-rata diperbarui (rata-rata tertimbang) */
  tambahStok: (id: string, qty: number, totalHarga: number) => void;
  /** pemakaian bahan untuk produk yang terjual; mengembalikan bahan yang jadi menipis */
  pakaiUntukPenjualan: (items: { name: string; quantity: number }[]) => BahanBaku[];
  cocokkanBahan: (teks: string) => BahanBaku | undefined;
};

const ctx = createContext<Ctx | undefined>(undefined);

export function BahanBakuProvider({ children }: { children: React.ReactNode }) {
  const { sector } = useBusinessSector();
  const { tokoAktif } = useAccount();
  const kunci = `${sector}|${tokoAktif}`;
  const [store, setStore] = useState<Record<string, DataSektor>>(() => ({ [kunci]: muat(sector, tokoAktif) }));
  const data = useMemo(() => store[kunci] ?? muat(sector, tokoAktif), [store, kunci, sector, tokoAktif]);

  useEffect(() => {
    try {
      for (const [k, d] of Object.entries(store)) {
        const [s, toko] = k.split("|");
        localStorage.setItem(kunciToko(STORAGE_PREFIX, s, toko), JSON.stringify(d));
      }
    } catch {
      // abaikan
    }
  }, [store]);

  const ubah = (fn: (d: DataSektor) => DataSektor) =>
    setStore((prev) => ({ ...prev, [kunci]: fn(prev[kunci] ?? muat(sector, tokoAktif)) }));
  const ubahDaftar = (fn: (b: BahanBaku[]) => BahanBaku[]) => ubah((d) => ({ ...d, bahan: fn(d.bahan) }));

  const value: Ctx = {
    bahan: data.bahan,
    resep: data.resep,
    getBahan: (id) => data.bahan.find((b) => b.id === id),
    resepProduk: (nama) => data.resep[nama.toLowerCase()] ?? [],
    setResep: (nama, items) => ubah((d) => ({ ...d, resep: { ...d.resep, [nama.toLowerCase()]: items } })),
    tambahBahan: (b) => ubahDaftar((xs) => [{ ...b, id: `${sector}-bahan-${Date.now()}` }, ...xs]),
    ubahBahan: (id, p) => ubahDaftar((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x))),
    hapusBahan: (id) => ubahDaftar((xs) => xs.filter((x) => x.id !== id)),
    tambahStok: (id, qty, totalHarga) =>
      ubahDaftar((xs) =>
        xs.map((x) => {
          if (x.id !== id || qty <= 0) return x;
          const stokBaru = x.stok + qty;
          const hargaBaru = Math.round((x.stok * x.harga + totalHarga) / stokBaru);
          return { ...x, stok: Math.round(stokBaru * 1000) / 1000, harga: hargaBaru };
        }),
      ),
    pakaiUntukPenjualan: (items) => {
      const pakai = new Map<string, number>();
      for (const it of items) {
        for (const r of data.resep[it.name.toLowerCase()] ?? []) pakai.set(r.bahanId, (pakai.get(r.bahanId) ?? 0) + r.qty * it.quantity);
      }
      if (pakai.size === 0) return [];
      const menipis: BahanBaku[] = [];
      for (const b of data.bahan) {
        const q = pakai.get(b.id);
        if (q && b.stok > b.stokMin && b.stok - q <= b.stokMin) menipis.push(b);
      }
      ubahDaftar((xs) => xs.map((x) => (pakai.has(x.id) ? { ...x, stok: Math.max(0, Math.round((x.stok - pakai.get(x.id)!) * 1000) / 1000) } : x)));
      return menipis;
    },
    cocokkanBahan: (teks) => {
      const t = teks.toLowerCase();
      return (
        data.bahan.find((b) => t.includes(b.nama.toLowerCase()) || b.nama.toLowerCase().includes(t)) ??
        data.bahan.find((b) => b.nama.toLowerCase().split(" ").some((w) => w.length > 3 && t.includes(w)))
      );
    },
  };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useBahanBaku() {
  const c = useContext(ctx);
  if (!c) throw new Error("useBahanBaku harus dipakai di dalam BahanBakuProvider");
  return c;
}
