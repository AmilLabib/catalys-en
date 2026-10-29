// Data contoh persediaan bahan baku per sektor, resep produk, dan supplier.
import type { BusinessSector } from "../context/BusinessSectorContext";
import { cariWilayah } from "../utils/pricing";

export type BahanBaku = {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  stokMin: number; // batas "hampir habis"
  harga: number; // harga beli rata-rata per satuan
  pakaiHarian: number; // rata-rata pemakaian per hari
};

export type ItemResep = { bahanId: string; qty: number }; // qty per 1 unit produk
export type Resep = Record<string, ItemResep[]>; // kunci: nama produk (huruf kecil)

type Seed = [id: string, nama: string, kategori: string, satuan: string, stok: number, stokMin: number, harga: number, pakaiHarian: number];

const SEED: Record<BusinessSector, { bahan: Seed[]; resep: Record<string, [string, number][]> }> = {
  kuliner: {
    bahan: [
      ["daging", "Daging sapi", "Protein", "kg", 6, 8, 135_000, 2.4],
      ["ayam", "Ayam potong", "Protein", "kg", 22, 10, 38_000, 3.1],
      ["lele", "Ikan lele", "Protein", "kg", 9, 6, 28_000, 1.6],
      ["nila", "Ikan nila", "Protein", "kg", 4, 6, 34_000, 1.2],
      ["tapioka", "Tepung tapioka", "Tepung & karbohidrat", "kg", 14, 5, 13_000, 0.9],
      ["mie", "Mie basah", "Tepung & karbohidrat", "kg", 11, 6, 16_000, 1.8],
      ["beras", "Beras premium", "Tepung & karbohidrat", "kg", 48, 20, 15_000, 6.5],
      ["kentang", "Kentang", "Sayur & bumbu", "kg", 7, 5, 18_000, 1.1],
      ["bumbu", "Bumbu rempah halus", "Sayur & bumbu", "kg", 3, 2, 60_000, 0.35],
      ["minyak", "Minyak goreng", "Minyak & gula", "liter", 16, 10, 17_500, 2.8],
      ["gula", "Gula pasir", "Minyak & gula", "kg", 9, 5, 17_000, 0.8],
      ["kopi", "Kopi bubuk robusta", "Minuman", "kg", 2.5, 2, 140_000, 0.3],
      ["susu", "Susu segar", "Minuman", "liter", 12, 8, 21_000, 2.2],
      ["matcha", "Bubuk matcha", "Minuman", "kg", 0.8, 0.5, 420_000, 0.06],
      ["teh", "Teh celup (isi 25)", "Minuman", "kotak", 6, 4, 11_000, 0.9],
    ],
    resep: {
      bakso: [["daging", 0.06], ["tapioka", 0.03], ["bumbu", 0.005]],
      "mie ayam": [["mie", 0.15], ["ayam", 0.05], ["minyak", 0.01]],
      "nasi goreng": [["beras", 0.12], ["ayam", 0.03], ["minyak", 0.02], ["bumbu", 0.005]],
      "kentang goreng": [["kentang", 0.15], ["minyak", 0.03]],
      lalapan: [["beras", 0.12], ["ayam", 0.12], ["bumbu", 0.005]],
      "matcha latte": [["matcha", 0.01], ["susu", 0.15], ["gula", 0.015]],
      "kopi tubruk": [["kopi", 0.015], ["gula", 0.015]],
      "aren latte": [["kopi", 0.015], ["susu", 0.15], ["gula", 0.02]],
      "butterscotch latte": [["kopi", 0.015], ["susu", 0.15], ["gula", 0.02]],
      "iced tea": [["teh", 0.04], ["gula", 0.02]],
      "lele goreng 1 porsi": [["lele", 0.25], ["minyak", 0.03], ["beras", 0.12]],
      "lele bakar 1 porsi": [["lele", 0.25], ["bumbu", 0.01], ["beras", 0.12]],
      "lele sambal 1 porsi": [["lele", 0.25], ["bumbu", 0.015], ["beras", 0.12]],
      "nila goreng 1 porsi": [["nila", 0.3], ["minyak", 0.03], ["beras", 0.12]],
      "nila bakar 1 porsi": [["nila", 0.3], ["bumbu", 0.01], ["beras", 0.12]],
      "ayam goreng 1 porsi": [["ayam", 0.25], ["minyak", 0.03], ["beras", 0.12]],
      "ayam bakar 1 porsi": [["ayam", 0.25], ["bumbu", 0.01], ["beras", 0.12]],
    },
  },
  agribisnis: {
    bahan: [
      ["npk", "Pupuk NPK curah", "Pupuk", "kg", 140, 100, 11_000, 16],
      ["kompos", "Kompos organik", "Pupuk", "kg", 320, 150, 2_500, 22],
      ["mimba", "Minyak mimba murni", "Pestisida nabati", "liter", 6, 5, 70_000, 0.7],
      ["pestisida", "Pestisida pekat", "Pestisida nabati", "liter", 3, 4, 210_000, 0.4],
      ["benih-kemangi", "Benih kemangi curah", "Benih", "gram", 900, 500, 120, 60],
      ["benih-bunga", "Benih bunga curah", "Benih", "gram", 300, 300, 180, 25],
      ["karung", "Karung kemasan", "Kemasan", "pcs", 160, 80, 1_500, 14],
      ["botol", "Botol kemasan 500 ml", "Kemasan", "pcs", 120, 60, 2_200, 9],
      ["klip", "Plastik klip benih", "Kemasan", "pcs", 600, 300, 150, 45],
    ],
    resep: {
      "pupuk npk mutiara biru 5kg": [["npk", 5], ["karung", 1]],
      "pupuk npk varian rg 2kg": [["npk", 2], ["karung", 1]],
      "neem oil 500ml": [["mimba", 0.5], ["botol", 1]],
      "pestisida cair siap pakai 750ml": [["pestisida", 0.15], ["botol", 1]],
      "benih sayuran kemangi lalap": [["benih-kemangi", 10], ["klip", 1]],
      "benih bunga nasturtium": [["benih-bunga", 5], ["klip", 1]],
    },
  },
  fashion: {
    bahan: [
      ["katun", "Kain katun combed", "Kain", "meter", 85, 60, 42_000, 7.5],
      ["linen", "Kain linen", "Kain", "meter", 34, 40, 68_000, 4.2],
      ["twill", "Kain twill", "Kain", "meter", 52, 40, 55_000, 5.1],
      ["benang", "Benang jahit", "Aksesoris jahit", "gulung", 40, 25, 9_000, 2.6],
      ["kancing", "Kancing kemeja", "Aksesoris jahit", "pcs", 900, 500, 350, 48],
      ["resleting", "Resleting", "Aksesoris jahit", "pcs", 140, 100, 2_500, 9],
      ["label", "Label & hangtag", "Kemasan", "pcs", 700, 400, 600, 30],
      ["pot", "Botol & pot kosmetik", "Kemasan", "pcs", 220, 150, 3_800, 12],
    ],
    resep: {
      "kaos oversized graphic tee": [["katun", 1.2], ["benang", 0.1], ["label", 1]],
      "kemeja linen long sleeve": [["linen", 1.6], ["kancing", 8], ["benang", 0.15], ["label", 1]],
      "celana cargo pants": [["twill", 1.4], ["resleting", 1], ["kancing", 1], ["benang", 0.15], ["label", 1]],
      "jaket varsity bomber": [["twill", 1.8], ["kancing", 6], ["benang", 0.2], ["label", 1]],
      "rok plisket maxi skirt": [["katun", 2], ["resleting", 1], ["label", 1]],
      "serum vitamin c brightening": [["pot", 1], ["label", 1]],
      "sunscreen gel spf 50": [["pot", 1], ["label", 1]],
      "moisturizer ceramide gel": [["pot", 1], ["label", 1]],
    },
  },
  industri: {
    bahan: [
      ["jagung", "Jagung giling", "Bahan pakan", "kg", 1_400, 1_000, 6_200, 180],
      ["bungkil", "Bungkil kedelai", "Bahan pakan", "kg", 520, 600, 9_800, 75],
      ["dedak", "Dedak padi", "Bahan pakan", "kg", 1_900, 900, 3_600, 210],
      ["premix", "Premix vitamin", "Aditif", "kg", 36, 20, 48_000, 3.2],
      ["desinfektan", "Bahan desinfektan", "Aditif", "liter", 14, 10, 65_000, 1.1],
      ["karung50", "Karung 50 kg", "Kemasan", "pcs", 140, 80, 4_500, 9],
      ["botol1l", "Botol 1 liter", "Kemasan", "pcs", 90, 60, 3_000, 5],
    ],
    resep: {
      "pakan ayam": [["jagung", 25], ["bungkil", 10], ["dedak", 12], ["premix", 0.5], ["karung50", 1]],
      "pakan sapi potong": [["dedak", 30], ["bungkil", 10], ["jagung", 8], ["karung50", 1]],
      "konsentrat bebek petelur": [["jagung", 20], ["bungkil", 12], ["premix", 0.5], ["karung50", 1]],
      "suplemen vitamin ternak cair": [["premix", 0.2], ["botol1l", 1]],
      "desinfektan kandang": [["desinfektan", 0.2], ["botol1l", 1]],
    },
  },
  perdagangan: {
    bahan: [
      ["beras-curah", "Beras curah", "Sembako curah", "kg", 260, 150, 12_800, 32],
      ["gula-curah", "Gula pasir curah", "Sembako curah", "kg", 70, 80, 15_500, 11],
      ["minyak-curah", "Minyak goreng curah", "Sembako curah", "liter", 95, 60, 14_200, 9],
      ["plastik", "Plastik kemasan", "Kemasan", "pcs", 900, 400, 250, 55],
      ["pouch", "Pouch minyak 1 L", "Kemasan", "pcs", 140, 80, 900, 9],
      ["kantong", "Kantong belanja", "Kemasan", "pcs", 350, 300, 180, 40],
    ],
    resep: {
      "beras 5kg": [["beras-curah", 5], ["plastik", 1]],
      "gula pasir 1kg": [["gula-curah", 1], ["plastik", 1]],
      "minyak goreng 1l": [["minyak-curah", 1], ["pouch", 1]],
    },
  },
};

export function bahanAwal(sector: BusinessSector): BahanBaku[] {
  return SEED[sector].bahan.map(([id, nama, kategori, satuan, stok, stokMin, harga, pakaiHarian]) => ({
    id: `${sector}-${id}`,
    nama,
    kategori,
    satuan,
    stok,
    stokMin,
    harga,
    pakaiHarian,
  }));
}

export function resepAwal(sector: BusinessSector): Resep {
  const out: Resep = {};
  for (const [produk, items] of Object.entries(SEED[sector].resep)) {
    out[produk] = items.map(([id, qty]) => ({ bahanId: `${sector}-${id}`, qty }));
  }
  return out;
}

export type StatusStok = "habis" | "hampir habis" | "aman";
export function statusStok(b: BahanBaku): StatusStok {
  if (b.stok <= 0) return "habis";
  if (b.stok <= b.stokMin) return "hampir habis";
  return "aman";
}

export function hariTersisa(b: BahanBaku) {
  return b.pakaiHarian > 0 ? b.stok / b.pakaiHarian : Infinity;
}

// ---------- Tren stok 12 minggu (simulasi mundur dari stok saat ini) ----------

function acak(seed: number) {
  const x = Math.sin(seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type TitikTren = { minggu: string; stok: number; pakai: number; restok: number };

export function trenStok(b: BahanBaku, jumlahMinggu = 12): { titik: TitikTren[]; kaliHampirHabis: number } {
  const seed = Array.from(b.id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const titik: TitikTren[] = [];
  // dibangun dari minggu terlama: stok berkurang sesuai pemakaian; bila sisa
  // stok menyentuh batas minimum, dihitung "hampir habis" lalu diisi ulang
  // sebanyak pemakaian 1–2 minggu
  const mingguan = b.pakaiHarian * 7;
  let stok = b.stokMin + mingguan * (1 + acak(seed) * 1.2);
  let kali = 0;
  const now = new Date();
  for (let i = jumlahMinggu - 1; i >= 0; i--) {
    const pakai = mingguan * (0.75 + acak(seed + i) * 0.5);
    const sisa = Math.max(0, stok - pakai);
    let restok = 0;
    if (sisa <= b.stokMin * (1 + acak(seed + i * 3) * 0.3)) {
      if (sisa <= b.stokMin) kali++;
      restok = mingguan * (1 + acak(seed + i * 5));
    }
    stok = sisa + restok;
    const tgl = new Date(now.getTime() - i * 7 * 86_400_000);
    titik.push({
      minggu: tgl.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      stok: Math.round(stok * 10) / 10,
      pakai: Math.round(pakai * 10) / 10,
      restok: Math.round(restok * 10) / 10,
    });
  }
  // titik terakhir = stok sebenarnya saat ini
  titik[titik.length - 1].stok = Math.round(b.stok * 10) / 10;
  return { titik, kaliHampirHabis: kali };
}

// ---------- Supplier terdekat per bahan ----------

export type SupplierBahan = {
  nama: string;
  jenis: "Grosir" | "Pasar tradisional" | "Distributor";
  kecamatan: string;
  kota: string;
  jarakKm: number;
  harga: number;
  rating: number;
  minOrder: string;
  foto: FotoToko;
};

// Foto ilustrasi jenis toko dari Wikimedia Commons (lisensi Creative Commons, wajib mencantumkan kredit)
export type FotoToko = { src: string; penulis: string; lisensi: string; sumber: string };

const COMMONS = "https://commons.wikimedia.org/wiki/File:";
const FOTO_TOKO: Record<SupplierBahan["jenis"], FotoToko[]> = {
  "Pasar tradisional": [
    { src: "/supplier/pasar-1.jpg", penulis: "Nafisaacdr", lisensi: "CC BY 4.0", sumber: `${COMMONS}Penjual_sayur_pasar.jpg` },
    { src: "/supplier/pasar-2.jpg", penulis: "Astari28", lisensi: "CC BY 4.0", sumber: `${COMMONS}Sayur_di_pasar_tanjung.jpg` },
    { src: "/supplier/pasar-3.jpg", penulis: "Abdul Hanif Arromy", lisensi: "CC BY 4.0", sumber: `${COMMONS}Pasar_Raya_Padang_171751.jpg` },
    { src: "/supplier/pasar-4.jpg", penulis: "Ivuvisual", lisensi: "CC BY-SA 4.0", sumber: `${COMMONS}Pasar_Tradisional_Jawa_Timur.jpg` },
  ],
  Grosir: [
    { src: "/supplier/grosir-1.jpg", penulis: "Indonesiagood", lisensi: "CC BY 4.0", sumber: `${COMMONS}Suasana_Toko_Sembako_di_Pasar_Induk_Pare_Kediri.jpg` },
    { src: "/supplier/grosir-2.jpg", penulis: "Indonesiagood", lisensi: "CC BY 4.0", sumber: `${COMMONS}Pasar_Induk_Pare_Kediri-5.jpg` },
    { src: "/supplier/grosir-3.jpg", penulis: "Nela Fatimatun", lisensi: "CC BY 4.0", sumber: `${COMMONS}Penjual_sembako_di_pasar_tampak_samping.jpg` },
  ],
  Distributor: [
    { src: "/supplier/distributor-1.jpg", penulis: "Ivuvisual", lisensi: "CC BY-SA 4.0", sumber: `${COMMONS}Penyimpanan_Kentang.jpg` },
    { src: "/supplier/distributor-2.jpg", penulis: "CocoyAguilar", lisensi: "CC BY-SA 4.0", sumber: `${COMMONS}Philippines_worker.jpg` },
    { src: "/supplier/distributor-3.jpg", penulis: "Encik Tekateki", lisensi: "CC BY 4.0", sumber: `${COMMONS}Warehouse_Interior_Storing_Batteries_in_Indonesia.jpg` },
  ],
};

const NAMA_SUPPLIER = ["Sumber Makmur", "Jaya Abadi", "Sinar Baru", "Berkah Tani", "Maju Jaya", "Sentosa", "Mulia Sejahtera", "Barokah", "Karya Mandiri", "Cahaya Baru"];
const JENIS: SupplierBahan["jenis"][] = ["Grosir", "Pasar tradisional", "Distributor"];

export function supplierBahan(b: BahanBaku, kota: string): SupplierBahan[] {
  const w = cariWilayah(kota);
  const seed = Array.from(b.id + w.kota).reduce((s, c) => s + c.charCodeAt(0), 0);
  return JENIS.map((jenis, i) => {
    const nama = NAMA_SUPPLIER[(seed + i * 3) % NAMA_SUPPLIER.length];
    const faktor = jenis === "Distributor" ? 0.92 : jenis === "Grosir" ? 0.97 : 1.03;
    return {
      nama: jenis === "Grosir" ? `Grosir ${nama}` : jenis === "Distributor" ? `CV ${nama}` : `Kios ${nama} (Pasar ${w.kecamatan[i % w.kecamatan.length]})`,
      jenis,
      kecamatan: w.kecamatan[(seed + i) % w.kecamatan.length],
      kota: w.kota,
      jarakKm: Math.round((0.6 + acak(seed + i) * (jenis === "Distributor" ? 14 : 6)) * 10) / 10,
      harga: Math.round((b.harga * w.indeksHarga * faktor * (0.96 + acak(seed + i * 7) * 0.08)) / 50) * 50,
      rating: Math.round((4.3 + acak(seed + i * 11) * 0.7) * 10) / 10,
      minOrder: jenis === "Distributor" ? `min. ${Math.max(1, Math.round(b.stokMin))} ${b.satuan}` : jenis === "Grosir" ? `min. ${Math.max(1, Math.round(b.stokMin / 3))} ${b.satuan}` : "tanpa minimum",
      foto: FOTO_TOKO[jenis][(seed + i) % FOTO_TOKO[jenis].length],
    };
  }).sort((a, b2) => a.jarakKm - b2.jarakKm);
}

export const linkMaps = (s: SupplierBahan) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.nama} ${s.kecamatan} ${s.kota}`)}`;
export const linkShopee = (b: BahanBaku) => `https://shopee.co.id/search?keyword=${encodeURIComponent(b.nama)}`;
