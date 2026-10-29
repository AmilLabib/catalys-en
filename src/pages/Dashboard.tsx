import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Factory,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Wallet,
  PiggyBank,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Tag,
  BarChart2,
  MessagesSquare,
  Lock,
  Store,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { usePageTitle } from "../hooks/usePageTitle";
import AngkaBerjalan from "../components/AngkaBerjalan";
import { useLaporan, useEntitasSendiri } from "../hooks/useLaporan";
import { useAccount } from "../context/AccountContext";
import { useInventory } from "../context/InventoryContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { formatRp, formatRpSingkat, hitungLaporan, TAHUN_BERJALAN } from "../data/laporan";
import { FEATURES, type FeatureKey } from "../config/access";
import { KOORDINAT_KOTA } from "../utils/pricing";
import { useAkses } from "../context/AksesContext";
import { bisa3D, BatasGalat3D } from "../components/three/dukungan";
import type { TitikCabang } from "../components/three/PetaIndonesia3D";

// three.js dimuat terpisah, hanya saat akun Induk membuka beranda
const PetaIndonesia3D = lazy(() => import("../components/three/PetaIndonesia3D"));

// Warna pilar cabang di peta, berurutan dari tone navy
const WARNA_CABANG = ["#012a3d", "#2f6b8f", "#5487ab", "#13577d", "#7193ad", "#9cb2c1", "#0a3f5e"];
const warnaCabang = (i: number) => WARNA_CABANG[i % WARNA_CABANG.length];

const revenueMix = [
  { name: "Daring", value: 48 },
  { name: "Luring", value: 32 },
  { name: "Reseller", value: 20 },
];

const mixColors = ["#012a3d", "#2f6b8f", "#9cb2c1"];

function pertumbuhan(now: number, before: number) {
  if (!before) return 0;
  return ((now - before) / Math.abs(before)) * 100;
}

function Tren({ nilai }: { nilai: number }) {
  const naik = nilai >= 0;
  const Icon = naik ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        naik ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/25 text-rose-100"
      }`}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(nilai).toFixed(1).replace(".", ",")}%
    </span>
  );
}

export default function Dashboard() {
  usePageTitle("Beranda");
  const lap = useLaporan(TAHUN_BERJALAN);
  const entitas = useEntitasSendiri();
  const { alasanTerkunci, quotaRemaining, sesi, role, cabangList, punyaCabang } = useAccount();
  const { tampilkanAkses, bukaDialogCabang } = useAkses();
  const { products } = useInventory();
  const { accounts } = useChartOfAccounts();
  const [pakai3D] = useState(bisa3D);
  const [cabangDipilih, setCabangDipilih] = useState<string | null>(cabangList[0]?.nama ?? null);

  // Kinerja tiap cabang untuk peta sebaran (khusus akun Induk)
  const kinerjaCabang = useMemo(() => {
    if (role !== "induk") return [];
    const data = cabangList.map(({ nama, kota }, i) => {
      const r = hitungLaporan(nama, TAHUN_BERJALAN, [], accounts).ringkasan;
      return { nama, kota, warna: warnaCabang(i), pendapatan: r.totalPendapatan, laba: r.labaBersih };
    });
    const total = data.reduce((s, d) => s + d.pendapatan, 0) || 1;
    return data.map((d) => ({ ...d, porsi: d.pendapatan / total, margin: d.laba / (d.pendapatan || 1) }));
  }, [role, accounts, cabangList]);

  // cabang di kota yang sama digeser sedikit agar pilarnya tidak bertumpuk
  const titikPeta: TitikCabang[] = kinerjaCabang.map((d, i) => {
    const [lat, lon] = KOORDINAT_KOTA[d.kota] ?? KOORDINAT_KOTA.Bogor;
    const ke = kinerjaCabang.slice(0, i).filter((x) => x.kota === d.kota).length;
    return { nama: d.nama, lat: lat - ke * 0.35, lon: lon + ke * 0.35, warna: d.warna, porsi: d.porsi, label: formatRpSingkat(d.pendapatan) };
  });

  const R = lap.ringkasan;
  const L = lap.ringkasanLalu;
  // Tahun berjalan dibandingkan secara proporsional (disetahunkan) dengan tahun lalu
  const faktor = 12 / lap.bulanBerjalan;

  const kpi = [
    {
      label: `Pendapatan ${lap.tahun}`,
      nilai: R.totalPendapatan,
      tren: pertumbuhan(R.totalPendapatan * faktor, L.totalPendapatan),
      catatan: "vs tahun lalu (disetahunkan)",
      icon: TrendingUp,
      grad: "grad-navy",
    },
    {
      label: "Laba Bersih",
      nilai: R.labaBersih,
      tren: pertumbuhan(R.labaBersih * faktor, L.labaBersih),
      catatan: `Margin ${((R.labaBersih / (R.totalPendapatan || 1)) * 100).toFixed(1).replace(".", ",")}%`,
      icon: PiggyBank,
      grad: "grad-ocean",
    },
    {
      label: "Total Aset",
      nilai: R.totalAset,
      tren: pertumbuhan(R.totalAset, L.totalAset),
      catatan: "posisi per hari ini",
      icon: Wallet,
      grad: "grad-indigo",
    },
    {
      label: "Kas Akhir",
      nilai: lap.arusKas.kasAkhir,
      tren: pertumbuhan(lap.arusKas.kasAkhir, lap.arusKas.kasAwal),
      catatan: "vs kas awal tahun",
      icon: Activity,
      grad: "grad-steel",
    },
  ];

  const stokMenipis = products.filter((p) => p.qty < 20).length;
  const sesiTerjadwal = sesi.filter((s) => s.status === "Terjadwal").length;

  const modul: {
    key: FeatureKey;
    icon: typeof Factory;
    stats: [string, string][];
    cta: string;
  }[] = [
    {
      key: "kasir",
      icon: ShoppingCart,
      stats: [
        ["Produk aktif", String(products.length)],
        ["Stok menipis", String(stokMenipis)],
      ],
      cta: "Buka kasir",
    },
    {
      key: "hargaCerdas",
      icon: Tag,
      stats: [
        ["Pembanding pasar", "5 kompetitor"],
        ["Margin rata-rata", "28%"],
      ],
      cta: "Hitung harga",
    },
    {
      key: "laporanKeuangan",
      icon: BarChart2,
      stats: [
        ["Laba usaha", formatRpSingkat(R.labaUsaha)],
        ["Rasio lancar", `${(R.totalAsetLancar / (R.totalLiabilitasPendek || 1)).toFixed(2).replace(".", ",")}x`],
      ],
      cta: "Lihat laporan",
    },
    {
      key: "manajemenInternal",
      icon: Factory,
      stats: [
        ["Karyawan aktif", "12"],
        ["Stok menipis", String(stokMenipis)],
      ],
      cta: "Kelola operasional",
    },
    {
      key: "audit",
      icon: AlertTriangle,
      stats: [
        ["Temuan risiko", "5"],
        ["Rekomendasi", "8"],
      ],
      cta: "Lihat audit",
    },
    {
      key: "konsultasi",
      icon: MessagesSquare,
      stats: [
        ["Sisa sesi", String(quotaRemaining("konsultasi") ?? 0)],
        ["Sesi terjadwal", String(sesiTerjadwal)],
      ],
      cta: "Jadwalkan sesi",
    },
    {
      key: "umkmBerkembang",
      icon: Trophy,
      stats: [
        ["Skor pertumbuhan", "78 / 100"],
        ["Program aktif", "4"],
      ],
      cta: "Lihat program",
    },
    {
      key: "permodalan",
      icon: ShieldCheck,
      stats: [
        ["Akses pendanaan", "6 mitra"],
        ["Pinjaman berjalan", "2"],
      ],
      cta: "Lihat opsi",
    },
  ];

  // semua modul tampil; yang di luar peran/paket tampil abu-abu
  const modulTerlihat = modul;

  return (
    <div className="min-h-screen">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {entitas}
          </p>
          <h2 className="text-2xl font-bold text-primary">Ringkasan Kinerja {lap.tahun}</h2>
        </div>
        <span className="text-xs text-gray-500">
          Data s.d. bulan ke-{lap.bulanBerjalan} tahun berjalan
        </span>
      </div>

      {/* Baris KPI */}
      <section data-tour="beranda-kpi" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpi.map(({ label, nilai, tren, catatan, icon: Icon, grad }) => (
          <div key={label} className={`card-gradient ${grad} p-5`}>
            <div className="relative flex items-center justify-between">
              <p className="text-sm text-white/75">{label}</p>
              <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="relative mt-3 text-xl font-extrabold tracking-tight">
              <AngkaBerjalan nilai={nilai} format={formatRp} />
            </p>
            <div className="relative mt-2 flex items-center gap-2 text-xs text-white/70">
              <Tren nilai={tren} /> {catatan}
            </div>
          </div>
        ))}
      </section>

      {/* Usaha belum punya cabang: ajakan membuka cabang pertama */}
      {role === "induk" && !punyaCabang && (
        <section data-tour="buka-cabang" className="card-gradient grad-navy p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div className="relative flex-1">
            <h2 className="text-lg font-bold">Siap berkembang? Buka cabang pertama Anda</h2>
            <p className="mt-1 text-sm text-white/75">
              Saat ini semua fitur terbuka karena usaha Anda belum punya cabang. Setelah membuka cabang, toko ini menjadi Cabang Utama,
              akun Induk memantau seluruh cabang, dan Anda bisa berpindah akun lewat menu di pojok kanan atas.
            </p>
          </div>
          <button
            onClick={bukaDialogCabang}
            className="relative shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-white/90"
          >
            <Plus className="w-4 h-4" /> Buka Cabang
          </button>
        </section>
      )}

      {/* Peta sebaran cabang (khusus Induk) */}
      {role === "induk" && kinerjaCabang.length > 0 && (
        <section data-tour="peta-cabang" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 card-elegant p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Peta Sebaran Cabang</h2>
                <p className="text-sm text-gray-500">
                  {pakai3D ? "Tinggi pilar = porsi pendapatan. Klik pilar untuk melihat rincian, atau lihat seluruh Indonesia." : "Porsi pendapatan tiap cabang."}
                </p>
              </div>
              <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">Indonesia</span>
            </div>
            {pakai3D ? (
              <BatasGalat3D cadangan={<p className="py-16 text-center text-sm text-gray-500">Peta 3D tidak dapat ditampilkan di perangkat ini.</p>}>
                <Suspense fallback={<div className="shimmer h-72 sm:h-80 rounded-xl bg-gray-100" />}>
                  <div className="h-72 sm:h-80 rounded-xl bg-gradient-to-b from-[#f3f8fc] to-white">
                    <PetaIndonesia3D titik={titikPeta} dipilih={cabangDipilih} onPilih={setCabangDipilih} />
                  </div>
                </Suspense>
              </BatasGalat3D>
            ) : (
              <div className="space-y-3 py-4">
                {kinerjaCabang.map((d) => (
                  <div key={d.nama}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{d.nama}</span>
                      <span className="font-semibold text-primary">{(d.porsi * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full" style={{ width: `${d.porsi * 100}%`, background: d.warna }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 card-elegant p-5 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Kinerja Cabang {TAHUN_BERJALAN}</h2>
              <p className="text-sm text-gray-500">Pilih cabang untuk menyorotnya di peta.</p>
            </div>
            {[...kinerjaCabang]
              .sort((a, b) => b.pendapatan - a.pendapatan)
              .map((d, i) => {
                const aktif = cabangDipilih === d.nama;
                return (
                  <button
                    key={d.nama}
                    type="button"
                    onClick={() => setCabangDipilih(d.nama)}
                    aria-pressed={aktif}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      aktif ? "border-primary bg-white shadow-md" : "border-gray-100 bg-white/70 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.warna }} />
                        {d.nama}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400">#{i + 1}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Pendapatan</p>
                        <p className="font-bold text-gray-900">{formatRpSingkat(d.pendapatan)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Laba bersih</p>
                        <p className="font-bold text-gray-900">{formatRpSingkat(d.laba)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Porsi</p>
                        <p className="font-bold text-gray-900">{(d.porsi * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    {aktif && (
                      <p className="mt-2 text-xs text-gray-500">
                        Margin laba {(d.margin * 100).toFixed(1).replace(".", ",")}%
                      </p>
                    )}
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* Baris grafik */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8 card-elegant p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tren Pendapatan vs Beban</h2>
              <p className="text-sm text-gray-500">
                Pantau tren bulanan untuk mendeteksi anomali lebih cepat.
              </p>
            </div>
            <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {lap.tahun}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lap.bulanan} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPendapatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5edf3" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} />
                <YAxis
                  width={72}
                  tickFormatter={(v) => formatRpSingkat(Number(v)).replace("Rp ", "")}
                  tickLine={false}
                  axisLine={false}
                />
                <ReTooltip formatter={(value, name) => [formatRp(Number(value)), name === "pendapatan" ? "Pendapatan" : "Beban"]} />
                <Area type="monotone" dataKey="pendapatan" stroke="#2f6b8f" strokeWidth={2} fill="url(#gradPendapatan)" />
                <Line type="monotone" dataKey="beban" stroke="#9cb2c1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 card-elegant p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Komposisi Pendapatan</h2>
            <p className="text-sm text-gray-500">Kanal penjualan (estimasi).</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {revenueMix.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={mixColors[i % mixColors.length]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {revenueMix.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: mixColors[i % mixColors.length] }} />
                  <span className="text-gray-700">{m.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ringkasan modul sesuai peran & paket */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {modulTerlihat.map(({ key, icon: Icon, stats, cta }) => {
          const def = FEATURES[key];
          const kunci = alasanTerkunci(key);
          const terkunci = !!kunci;
          return (
            <div key={key} className="card-elegant hover-lift p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center chip-gradient">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{def.label}</h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {stats.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-primary">{terkunci ? "—" : v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-5">
                {kunci ? (
                  <button
                    onClick={() => tampilkanAkses(key)}
                    title={kunci.pesan}
                    className="btn-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {cta} <Lock className="w-3.5 h-3.5 text-white/70" />
                  </button>
                ) : (
                  <Link
                    to={def.path}
                    className="btn-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
