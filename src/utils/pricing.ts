// Data harga kompetitor contoh (tanpa AI / API), per wilayah. Deterministik
// dari nama produk + wilayah supaya hasilnya konsisten setiap kali dicari.

export type Wilayah = {
  kota: string;
  provinsi: string;
  indeksHarga: number; // 1 = rata-rata nasional
  kecamatan: string[];
};

export const WILAYAH: Wilayah[] = [
  { kota: "Jakarta Selatan", provinsi: "DKI Jakarta", indeksHarga: 1.14, kecamatan: ["Kebayoran Baru", "Tebet", "Pancoran", "Cilandak", "Mampang"] },
  { kota: "Bogor", provinsi: "Jawa Barat", indeksHarga: 1.03, kecamatan: ["Bogor Tengah", "Bogor Utara", "Tanah Sareal", "Bogor Barat", "Bogor Timur"] },
  { kota: "Bandung", provinsi: "Jawa Barat", indeksHarga: 1.0, kecamatan: ["Coblong", "Sukajadi", "Lengkong", "Buahbatu", "Cicendo"] },
  { kota: "Semarang", provinsi: "Jawa Tengah", indeksHarga: 0.95, kecamatan: ["Semarang Tengah", "Banyumanik", "Tembalang", "Candisari", "Gajahmungkur"] },
  { kota: "Surakarta", provinsi: "Jawa Tengah", indeksHarga: 0.92, kecamatan: ["Laweyan", "Banjarsari", "Jebres", "Pasar Kliwon", "Serengan"] },
  { kota: "Yogyakarta", provinsi: "DI Yogyakarta", indeksHarga: 0.9, kecamatan: ["Gondokusuman", "Umbulharjo", "Danurejan", "Jetis", "Mergangsan"] },
  { kota: "Surabaya", provinsi: "Jawa Timur", indeksHarga: 1.02, kecamatan: ["Gubeng", "Tegalsari", "Wonokromo", "Sukolilo", "Rungkut"] },
  { kota: "Malang", provinsi: "Jawa Timur", indeksHarga: 0.94, kecamatan: ["Klojen", "Lowokwaru", "Blimbing", "Sukun", "Kedungkandang"] },
  { kota: "Denpasar", provinsi: "Bali", indeksHarga: 1.1, kecamatan: ["Denpasar Selatan", "Denpasar Barat", "Denpasar Timur", "Denpasar Utara"] },
  { kota: "Medan", provinsi: "Sumatera Utara", indeksHarga: 1.0, kecamatan: ["Medan Baru", "Medan Petisah", "Medan Kota", "Medan Johor"] },
  { kota: "Makassar", provinsi: "Sulawesi Selatan", indeksHarga: 1.04, kecamatan: ["Panakkukang", "Rappocini", "Tamalate", "Makassar"] },
  { kota: "Balikpapan", provinsi: "Kalimantan Timur", indeksHarga: 1.15, kecamatan: ["Balikpapan Kota", "Balikpapan Selatan", "Balikpapan Utara"] },
];

// Koordinat pusat kota (lintang, bujur) untuk peta
export const KOORDINAT_KOTA: Record<string, [number, number]> = {
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

export type Kompetitor = {
  toko: string;
  produk: string;
  kanal: "Shopee" | "Tokopedia" | "TikTok Shop" | "GrabFood" | "Toko fisik";
  kecamatan: string;
  jarakKm: number;
  harga: number;
  rating: number;
  terjual: number;
  kemiripan: number; // 0–1, seberapa mirip produknya
  relevansi: number; // 0–100, skor gabungan
};

export type MarketPricing = {
  wilayah: Wilayah;
  average: number;
  lowest: number;
  highest: number;
  kompetitor: Kompetitor[]; // relevan, terurut dari paling relevan
  semua: Kompetitor[]; // semua hasil pencarian
};

const TOKO = ["Sumber Rejeki", "Kedai Nusantara", "Berkah Jaya", "Mitra Usaha", "Toko Sinar", "Rumah Produk", "Pojok Hemat", "Warung Barokah", "Sentosa", "Kios Makmur", "Dapur Ibu", "Sahabat"];
const KANAL: Kompetitor["kanal"][] = ["Shopee", "Tokopedia", "TikTok Shop", "GrabFood", "Toko fisik"];

// Varian produk yang muncul di hasil pencarian dan kemiripannya dengan produk Anda
const VARIAN: [(n: string) => string, number][] = [
  [(n) => n, 1],
  [(n) => n, 1],
  [(n) => `${n} Original`, 0.9],
  [(n) => `${n} Jumbo`, 0.75],
  [(n) => `${n} Premium`, 0.7],
  [(n) => `Paket Hemat ${n}`, 0.6],
  [(n) => `${n} Isi 2`, 0.5],
  [(n) => `${n.split(" ")[0]} varian lain`, 0.4],
];

function acak(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function bulatkanHarga(v: number) {
  const step = v >= 100_000 ? 1000 : v >= 10_000 ? 500 : 100;
  return Math.round(v / step) * step;
}

export function cariWilayah(kota: string) {
  return WILAYAH.find((w) => w.kota === kota) ?? WILAYAH[1];
}

/**
 * @param productName nama produk yang dicari
 * @param acuan perkiraan harga nasional (mis. harga jual produk serupa di inventaris)
 * @param kota wilayah pencarian
 * @param radiusKm batas jarak kompetitor yang dianggap relevan
 */
export function fetchMarketPricing(productName: string, acuan: number, kota: string, radiusKm = 10): Promise<MarketPricing> {
  const wilayah = cariWilayah(kota);
  const seed = Array.from(`${productName.toLowerCase()}|${wilayah.kota}`).reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 100_000;
  const acuanLokal = acuan * wilayah.indeksHarga;

  const semua: Kompetitor[] = Array.from({ length: 12 }, (_, i) => {
    const [buatNama, kemiripan] = VARIAN[i % VARIAN.length];
    // varian "jumbo/premium" cenderung lebih mahal, "paket/varian lain" lebih jauh dari harga acuan
    const premi = 1 + (1 - kemiripan) * (i % 2 === 0 ? 0.6 : -0.3);
    const variasi = 0.85 + acak(seed + i * 13) * 0.3;
    const jarakKm = Math.round((0.4 + acak(seed + i * 5) * 24) * 10) / 10;
    const harga = bulatkanHarga(acuanLokal * variasi * premi);
    const kedekatan = Math.max(0, 1 - jarakKm / 25);
    const selisihHarga = Math.min(1, Math.abs(harga - acuanLokal) / acuanLokal);
    const relevansi = Math.round((kemiripan * 0.5 + kedekatan * 0.3 + (1 - selisihHarga) * 0.2) * 100);
    return {
      toko: `${TOKO[(seed + i) % TOKO.length]}`,
      produk: buatNama(productName),
      kanal: KANAL[(seed + i * 2) % KANAL.length],
      kecamatan: wilayah.kecamatan[(seed + i) % wilayah.kecamatan.length],
      jarakKm,
      harga,
      rating: Math.round((4.2 + acak(seed + i * 7) * 0.8) * 10) / 10,
      terjual: Math.round(50 + acak(seed + i * 3) * 950),
      kemiripan,
      relevansi,
    };
  }).sort((a, b) => b.relevansi - a.relevansi);

  const hasil = ringkasPasar(semua, wilayah, radiusKm);
  return new Promise((resolve) => setTimeout(() => resolve(hasil), 600));
}

// Kompetitor relevan: produknya cukup mirip (≥ 70%) dan berada dalam radius.
// Dipisah dari pencarian supaya mengganti radius tidak memakai token lagi.
export function ringkasPasar(semua: Kompetitor[], wilayah: Wilayah, radiusKm: number): MarketPricing {
  let kompetitor = semua.filter((k) => k.kemiripan >= 0.7 && k.jarakKm <= radiusKm);
  if (kompetitor.length < 3) kompetitor = semua.filter((k) => k.kemiripan >= 0.7).slice(0, 5);
  const hargas = kompetitor.map((k) => k.harga);
  const average = bulatkanHarga(hargas.reduce((s, h) => s + h, 0) / hargas.length);
  return { wilayah, average, lowest: Math.min(...hargas), highest: Math.max(...hargas), kompetitor, semua };
}
