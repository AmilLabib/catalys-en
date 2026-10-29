import { useMemo, useState } from "react";
import {
  fetchMarketPricing,
  bulatkanHarga,
  ringkasPasar,
  cariWilayah,
  WILAYAH,
  type MarketPricing,
  type Kompetitor,
} from "../utils/pricing";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import QuotaBadge from "./QuotaBadge";
import { pesanKuotaHabis } from "../config/access";
import BrandIcon, { type Brand } from "./BrandIcon";
import { usePageTitle } from "../hooks/usePageTitle";
import { useInventory } from "../context/InventoryContext";
import { Search, Sparkles, Store, Star, Lightbulb, TrendingUp, Target, Scale, Package, MapPin } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import ProductImage from "./ProductImage";
import { formatRp } from "../data/laporan";

type Skenario = "konservatif" | "normal" | "premium";

// targetMarkup: margin di atas titik impas; batasPasar: posisi maksimal terhadap rata-rata pasar
const SKENARIO: Record<Skenario, { label: string; desc: string; targetMarkup: number; batasPasar: number }> = {
  konservatif: { label: "Konservatif", desc: "Sedikit di bawah pasar, kejar volume", targetMarkup: 0.15, batasPasar: 0.97 },
  normal: { label: "Normal", desc: "Sejajar rata-rata pasar", targetMarkup: 0.2, batasPasar: 1.0 },
  premium: { label: "Premium", desc: "Di atas pasar, kejar margin", targetMarkup: 0.3, batasPasar: 1.06 },
};

type Hasil = {
  harga: number;
  impas: number;
  marginKotor: number; // per unit, terhadap harga
  labaBersihBulan: number;
  marginBersih: number;
  bepUnit: number | null;
  posisi: number; // selisih terhadap rata-rata pasar
  catatan: string;
};

// Harga rekomendasi:
//   titik impas/unit = HPP + biaya tetap ÷ estimasi penjualan
//   target          = titik impas × (1 + markup skenario)
//   batas atas      = rata-rata pasar × batas skenario
// Jika target margin sudah tercapai di posisi pasar skenario, harga dipasang
// di posisi itu (mis. Normal = sejajar rata-rata pasar). Jika belum, harga
// tetap ditahan di posisi pasar selama masih di atas titik impas.
function hitung(hpp: number, tetap: number, volume: number, pasar: MarketPricing, s: Skenario): Hasil {
  const sk = SKENARIO[s];
  const impas = hpp + tetap / volume;
  const target = impas * (1 + sk.targetMarkup);
  const batas = pasar.average * sk.batasPasar;
  let harga: number;
  let catatan: string;
  if (target <= batas) {
    harga = batas;
    catatan = "Target margin tercapai dan harga tetap kompetitif.";
  } else if (impas < batas) {
    harga = batas;
    catatan = "Harga ditahan di batas pasar; margin di bawah target skenario.";
  } else {
    harga = impas * 1.05;
    catatan = "Titik impas di atas harga pasar; harga dipasang tipis di atas impas. Tekan biaya terlebih dahulu.";
  }
  harga = bulatkanHarga(harga);
  const kontribusi = harga - hpp;
  const labaBersihBulan = kontribusi * volume - tetap;
  return {
    harga,
    impas,
    marginKotor: harga > 0 ? kontribusi / harga : 0,
    labaBersihBulan,
    marginBersih: harga * volume > 0 ? labaBersihBulan / (harga * volume) : 0,
    bepUnit: kontribusi > 0 ? Math.ceil(tetap / kontribusi) : null,
    posisi: pasar.average ? (harga - pasar.average) / pasar.average : 0,
    catatan,
  };
}

const KANAL_BRAND: Record<Kompetitor["kanal"], Brand | null> = {
  Shopee: "shopee",
  Tokopedia: "tokopedia",
  "TikTok Shop": "tiktok",
  GrabFood: "grab",
  "Toko fisik": null,
};

const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

export default function SmartPricing() {
  usePageTitle("Smart Pricing");
  const { products } = useInventory();

  const [produkId, setProdukId] = useState("");
  const [nama, setNama] = useState("");
  const [hpp, setHpp] = useState<number | "">("");
  const [tetap, setTetap] = useState<number | "">("");
  const [volume, setVolume] = useState<number | "">("");
  const [gambar, setGambar] = useState<string | undefined>();
  const [skenario, setSkenario] = useState<Skenario>("normal");
  const [memuat, setMemuat] = useState(false);
  const { kotaAkun, pakaiKuota, quotaRemaining, plan } = useAccount();
  const { toast } = useToast();
  // wilayah default mengikuti lokasi cabang
  const [kota, setKota] = useState(kotaAkun);
  const [radius, setRadius] = useState(10);
  const [tampilSemua, setTampilSemua] = useState(false);
  const [hasilCari, setHasilCari] = useState<{ semua: Kompetitor[]; kota: string } | null>(null);
  const pasar: MarketPricing | null = useMemo(
    () => (hasilCari ? ringkasPasar(hasilCari.semua, cariWilayah(hasilCari.kota), radius) : null),
    [hasilCari, radius],
  );
  const sisaToken = quotaRemaining("hargaCerdas");

  const valid = nama.trim() && Number(hpp) > 0 && Number(tetap) >= 0 && tetap !== "" && Number(volume) > 0;

  const pilihProduk = (id: string) => {
    setProdukId(id);
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setNama(p.name);
    setHpp(p.unitCost);
    setGambar(p.image);
    setHasilCari(null);
  };

  const cari = async (namaProduk = nama, hppProduk = Number(hpp), tetapProduk = Number(tetap), vol = Number(volume)) => {
    if (!namaProduk.trim()) return;
    if (!pakaiKuota("hargaCerdas")) {
      toast(pesanKuotaHabis("hargaCerdas", plan), "peringatan");
      return;
    }
    setMemuat(true);
    // acuan harga pasar: harga jual produk serupa di inventaris, jika tidak ada pakai markup umum 60% dari titik impas
    const serupa = products.find((p) => p.name.toLowerCase() === namaProduk.toLowerCase());
    const acuan = serupa?.sellingPrice || (hppProduk + (vol > 0 ? tetapProduk / vol : 0)) * 1.6;
    const m = await fetchMarketPricing(namaProduk, acuan, kota, radius);
    setHasilCari({ semua: m.semua, kota });
    setMemuat(false);
  };

  const hasil = useMemo(
    () => (pasar && valid ? hitung(Number(hpp), Number(tetap), Number(volume), pasar, skenario) : null),
    [pasar, valid, hpp, tetap, volume, skenario],
  );
  const semuaSkenario = useMemo(
    () =>
      pasar && valid
        ? (Object.keys(SKENARIO) as Skenario[]).map((s) => ({ s, ...hitung(Number(hpp), Number(tetap), Number(volume), pasar, s) }))
        : [],
    [pasar, valid, hpp, tetap, volume],
  );

  const grafik = pasar
    ? [...pasar.kompetitor.map((k) => ({ nama: k.toko, harga: k.harga, kita: false })), ...(hasil ? [{ nama: "Harga Anda", harga: hasil.harga, kita: true }] : [])].sort(
        (a, b) => a.harga - b.harga,
      )
    : [];

  // Key takeaways berbasis aturan
  const saran = useMemo(() => {
    if (!hasil || !pasar) return [];
    const out: string[] = [];
    const termurah = [...pasar.kompetitor].sort((a, b) => a.harga - b.harga)[0];
    const terdekat = [...pasar.kompetitor].sort((a, b) => a.jarakKm - b.jarakKm)[0];
    const indeks = pasar.wilayah.indeksHarga;
    const terlaris = [...pasar.kompetitor].sort((a, b) => b.terjual - a.terjual)[0];
    out.push(
      hasil.posisi <= 0
        ? `Harga Anda ${pct(Math.abs(hasil.posisi))} di bawah rata-rata pasar (${formatRp(pasar.average)}). Tonjolkan nilai hemat di materi promosi.`
        : `Harga Anda ${pct(hasil.posisi)} di atas rata-rata pasar. Pastikan kualitas, kemasan, atau layanan benar-benar terasa lebih unggul.`,
    );
    out.push(
      `Kompetitor termurah ${termurah.toko} (${termurah.kanal}) di ${formatRp(termurah.harga)}. ${
        termurah.harga < hasil.impas
          ? "Harganya di bawah titik impas Anda, jangan ikut perang harga."
          : "Masih di atas titik impas Anda, ada ruang untuk promo terbatas bila perlu."
      }`,
    );
    out.push(
      `Harga di ${pasar.wilayah.kota} ${indeks >= 1 ? pct(indeks - 1) + " di atas" : pct(1 - indeks) + " di bawah"} rata-rata nasional. Pesaing terdekat ${terdekat.toko} (${terdekat.jarakKm} km, ${terdekat.kecamatan}) menjual ${formatRp(terdekat.harga)}.`,
    );
    out.push(
      `Produk terlaris di pasar dijual ${formatRp(terlaris.harga)} di ${terlaris.kanal} (${terlaris.terjual} terjual). Kanal ini layak dicoba.`,
    );
    if (hasil.bepUnit !== null) {
      const v = Number(volume);
      out.push(
        hasil.bepUnit <= v
          ? `Titik impas tercapai pada ${hasil.bepUnit} unit/bulan, aman di bawah estimasi penjualan ${v} unit.`
          : `Butuh ${hasil.bepUnit} unit/bulan untuk impas, lebih tinggi dari estimasi ${v} unit. Tingkatkan volume atau tekan biaya tetap.`,
      );
    }
    if (hasil.marginKotor < 0.3) out.push("Margin kotor di bawah 30%. Cari bahan baku lebih murah atau buat paket bundling untuk menaikkan nilai transaksi.");
    out.push(hasil.catatan);
    return out;
  }, [hasil, pasar, volume]);

  const input = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="card-elegant p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-extrabold text-primary">Smart Pricing</h2>
        </div>
        <p className="text-gray-600 mt-1 text-sm">
          Tentukan harga jual dari HPP, biaya tetap, dan perbandingan harga kompetitor. Data kompetitor pada mode demo adalah contoh.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Ambil dari inventaris (opsional)</span>
              <select className={input} value={produkId} onChange={(e) => pilihProduk(e.target.value)}>
                <option value="">Isi manual</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Nama produk</span>
              <input className={input} value={nama} placeholder="cth. Es Teh Manis" onChange={(e) => setNama(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">HPP per unit</span>
              <input type="number" min={0} className={input} value={hpp} onChange={(e) => setHpp(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Biaya tetap per bulan</span>
              <input type="number" min={0} className={input} value={tetap} placeholder="sewa, gaji, listrik" onChange={(e) => setTetap(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Estimasi penjualan per bulan (unit)</span>
              <input type="number" min={1} className={input} value={volume} onChange={(e) => setVolume(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Wilayah pemasaran</span>
              <select className={input} value={kota} onChange={(e) => setKota(e.target.value)}>
                {Array.from(new Set(WILAYAH.map((w) => w.provinsi))).map((prov) => (
                  <optgroup key={prov} label={prov}>
                    {WILAYAH.filter((w) => w.provinsi === prov).map((w) => (
                      <option key={w.kota} value={w.kota}>
                        {w.kota}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => cari()}
                disabled={!valid || memuat || sisaToken === 0}
                className="sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Search className="w-4 h-4" /> {memuat ? "Mencari harga kompetitor..." : `Cari Harga Kompetitor di ${kota}`}
              </button>
              <QuotaBadge kuota="hargaCerdas" />
            </div>
          </div>
          <div className="lg:col-span-4 rounded-2xl bg-gray-50 border p-4 flex flex-col items-center justify-center text-center">
            <ProductImage src={gambar} name={nama || "Produk"} className="w-32 h-32 rounded-2xl" />
            <p className="mt-3 font-semibold text-gray-900">{nama || "Belum ada produk"}</p>
            {valid && (
              <p className="text-xs text-gray-500 mt-1">
                Titik impas {formatRp(Math.round(Number(hpp) + Number(tetap) / Number(volume)))}/unit
              </p>
            )}
          </div>
        </div>
      </section>

      {memuat && (
        // skeleton selama mencari harga kompetitor
        <div className="space-y-6" aria-busy="true" aria-label="Memuat hasil">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 shimmer h-64" />
            <div className="lg:col-span-7 shimmer h-64" />
          </div>
          <div className="card-elegant p-6 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="shimmer h-10" />
            ))}
          </div>
        </div>
      )}

      {!memuat && hasil && pasar && (
        <>
          {/* Skenario */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SKENARIO) as Skenario[]).map((s) => (
              <button
                key={s}
                onClick={() => setSkenario(s)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${skenario === s ? "bg-primary text-white border-primary" : "bg-white text-gray-700"}`}
              >
                {SKENARIO[s].label}
                <span className={`ml-1 text-xs ${skenario === s ? "text-white/70" : "text-gray-400"}`}>· {SKENARIO[s].desc}</span>
              </button>
            ))}
          </div>

          {/* Hasil rekomendasi */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl p-6 text-white bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
              <p className="text-sm text-white/70">Harga jual rekomendasi</p>
              <p className="text-4xl font-extrabold mt-1">{formatRp(hasil.harga)}</p>
              <p className="mt-1 text-sm text-white/80">
                {hasil.posisi <= 0 ? `${pct(-hasil.posisi)} di bawah` : `${pct(hasil.posisi)} di atas`} rata-rata pasar
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Margin kotor/unit", pct(hasil.marginKotor)],
                  ["Laba bersih/bulan", formatRp(Math.round(hasil.labaBersihBulan))],
                  ["Margin bersih", pct(hasil.marginBersih)],
                  ["Impas pada", hasil.bepUnit === null ? "—" : `${hasil.bepUnit} unit/bln`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/10 p-3">
                    <p className="text-[11px] text-white/60">{k}</p>
                    <p className="font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/70">
                Laba bersih = (harga − HPP) × penjualan − biaya tetap.
              </p>
            </div>

            <div className="card-elegant lg:col-span-7 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Posisi Harga</h3>
              {(() => {
                const min = Math.min(pasar.lowest, hasil.impas, hasil.harga) * 0.95;
                const max = Math.max(pasar.highest, hasil.harga) * 1.05;
                const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
                return (
                  <div className="relative h-16">
                    <div className="absolute top-7 h-2 rounded-full bg-gray-100" style={{ left: 0, right: 0 }} />
                    <div className="absolute top-7 h-2 rounded-full bg-blue-200" style={{ left: pos(pasar.lowest), width: `calc(${pos(pasar.highest)} - ${pos(pasar.lowest)})` }} />
                    {[
                      { v: hasil.impas, l: "Impas", c: "bg-red-500" },
                      { v: pasar.average, l: "Rata-rata", c: "bg-blue-600" },
                      { v: hasil.harga, l: "Anda", c: "bg-emerald-500" },
                    ].map((m) => (
                      <div key={m.l} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(m.v) }}>
                        <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">{m.l}</span>
                        <span className={`mt-1 w-3 h-3 rounded-full ring-2 ring-white ${m.c}`} />
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Termurah {formatRp(pasar.lowest)}</span>
                <span>Termahal {formatRp(pasar.highest)}</span>
              </div>

              <h3 className="font-semibold text-gray-900 mt-6 mb-2">Perbandingan Skenario</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">Skenario</th>
                      <th className="py-2 pr-3 font-medium text-right">Harga</th>
                      <th className="py-2 pr-3 font-medium text-right">Margin kotor</th>
                      <th className="py-2 font-medium text-right">Laba/bulan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semuaSkenario.map((x) => (
                      <tr key={x.s} className={`border-b last:border-0 ${x.s === skenario ? "bg-primary/5 font-semibold" : ""}`}>
                        <td className="py-2 pr-3">{SKENARIO[x.s].label}</td>
                        <td className="py-2 pr-3 text-right">{formatRp(x.harga)}</td>
                        <td className="py-2 pr-3 text-right">{pct(x.marginKotor)}</td>
                        <td className={`py-2 text-right ${x.labaBersihBulan < 0 ? "text-red-600" : ""}`}>{formatRp(Math.round(x.labaBersihBulan))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Pembanding kompetitor */}
          <section className="card-elegant p-6">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Hasil Pembanding Kompetitor</h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 inline -mt-0.5" /> {pasar.wilayah.kota}, {pasar.wilayah.provinsi} · {pasar.kompetitor.length} kompetitor
                relevan dari {pasar.semua.length} hasil · rata-rata {formatRp(pasar.average)}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Radius</span>
                {[3, 5, 10, 25].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`rounded-full px-2.5 py-1 font-medium ${radius === r ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Relevansi = kemiripan produk 50% + kedekatan lokasi 30% + kedekatan harga 20%. Kompetitor relevan: produk mirip ≥ 70% dan dalam radius.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">Penjual</th>
                      <th className="py-2 pr-3 font-medium">Lokasi</th>
                      <th className="py-2 pr-3 font-medium text-right">Harga</th>
                      <th className="py-2 pr-3 font-medium text-right">vs Anda</th>
                      <th className="py-2 font-medium">Relevansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tampilSemua ? pasar.semua : pasar.kompetitor).map((k) => {
                      const beda = (k.harga - hasil.harga) / hasil.harga;
                      const relevan = pasar.kompetitor.includes(k);
                      const brand = KANAL_BRAND[k.kanal];
                      return (
                        <tr key={k.toko + k.produk + k.jarakKm} className={`border-b last:border-0 ${relevan ? "" : "opacity-50"}`}>
                          <td className="py-2 pr-3">
                            <p className="font-medium text-gray-800">{k.toko}</p>
                            <p className="text-[11px] text-gray-500">{k.produk}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                              {brand ? <BrandIcon brand={brand} size={12} /> : <Store className="w-3 h-3" />} {k.kanal}
                              <span className="text-gray-300">·</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {k.rating} · {k.terjual} terjual
                            </p>
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                            {k.kecamatan}
                            <br />
                            <span className="text-gray-400">{k.jarakKm} km</span>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatRp(k.harga)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${beda < 0 ? "text-red-600" : "text-emerald-700"}`}>
                            {beda >= 0 ? "+" : ""}
                            {pct(beda)}
                          </td>
                          <td className="py-2 w-28">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${k.relevansi}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-600">{k.relevansi}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button onClick={() => setTampilSemua((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline">
                  {tampilSemua ? "Tampilkan kompetitor relevan saja" : `Tampilkan semua ${pasar.semua.length} hasil pencarian`}
                </button>
              </div>
              <div className="lg:col-span-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafik} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f6" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`} />
                    <YAxis type="category" dataKey="nama" width={130} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                    <ReferenceLine x={pasar.average} stroke="#2f6b8f" strokeDasharray="4 4" />
                    <Bar dataKey="harga" name="Harga" radius={[0, 4, 4, 0]}>
                      {grafik.map((g) => (
                        <Cell key={g.nama} fill={g.kita ? "#2f6b8f" : "#9cb2c1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Key takeaways */}
          <section className="card-elegant p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Poin Penting & Saran</h3>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {saran.map((s, i) => {
                const Icon = [Target, Scale, TrendingUp, Package, Lightbulb, Sparkles][i % 6];
                return (
                  <li key={i} className="flex gap-3 rounded-xl border p-4 text-sm text-gray-700">
                    <Icon className="w-5 h-5 text-primary shrink-0" /> {s}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
