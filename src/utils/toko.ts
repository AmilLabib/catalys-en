import { CABANG_UTAMA } from "../config/access";

// Data operasional (produk, bahan baku) disimpan per toko. Cabang Utama memakai
// kunci lama sehingga data sebelum ada cabang otomatis menjadi miliknya.
export function kunciToko(prefix: string, sector: string, toko: string) {
  if (toko === CABANG_UTAMA) return `${prefix}${sector}`;
  return `${prefix}${sector}__${toko.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Variasi stok data contoh cabang baru (katalog sama, jumlah stok berbeda)
export function faktorStok(toko: string, i: number) {
  if (toko === CABANG_UTAMA) return 1;
  const h = Array.from(toko).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  const x = Math.sin(h * 0.0001 + i * 12.9898) * 43758.5453;
  return 0.45 + (x - Math.floor(x)) * 0.8;
}
