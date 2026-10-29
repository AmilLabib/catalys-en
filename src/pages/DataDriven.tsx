import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BarChart2,
  Boxes,
  Wallet,
  Megaphone,
  ShieldAlert,
  Info,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
  ReferenceDot,
  Legend,
} from "recharts";
import PillTabs from "../components/PillTabs";
import AngkaBerjalan from "../components/AngkaBerjalan";
import { useLaporan } from "../hooks/useLaporan";
import { useInventory } from "../context/InventoryContext";
import { useBusinessSector } from "../context/BusinessSectorContext";
import { formatRp, formatRpSingkat, TAHUN_BERJALAN, KONSOLIDASI, LABA_RUGI } from "../data/laporan";
import { hitungGaji, karyawanSektor, ulasanAwal, unitKerja, type Topik } from "../data/internal";
import { useAccount } from "../context/AccountContext";

type Tingkat = "tinggi" | "sedang" | "rendah";
type Temuan = { judul: string; detail: string; saran: string; tingkat: Tingkat };

const TINGKAT: Record<Tingkat, { label: string; cls: string; icon: typeof AlertTriangle }> = {
  tinggi: { label: "Risiko tinggi", cls: "border-red-200 bg-red-50/70 text-red-700", icon: ShieldAlert },
  sedang: { label: "Perlu perhatian", cls: "border-amber-200 bg-amber-50/70 text-amber-700", icon: AlertTriangle },
  rendah: { label: "Catatan", cls: "border-blue-200 bg-blue-50/70 text-blue-700", icon: Info },
};

const skorDari = (t: Temuan[]) =>
  Math.max(0, 100 - t.reduce((s, x) => s + (x.tingkat === "tinggi" ? 25 : x.tingkat === "sedang" ? 12 : 4), 0));

// Penjualan per jam (data kasir contoh)
const PENJUALAN_PER_JAM = [
  { jam: "10:00", n: 32 },
  { jam: "11:00", n: 48 },
  { jam: "12:00", n: 75 },
  { jam: "13:00", n: 68 },
  { jam: "14:00", n: 50 },
  { jam: "15:00", n: 54 },
  { jam: "16:00", n: 70 },
  { jam: "17:00", n: 90 },
  { jam: "18:00", n: 110 },
  { jam: "19:00", n: 135 },
  { jam: "20:00", n: 120 },
  { jam: "21:00", n: 98 },
  { jam: "22:00", n: 60 },
];

const TABS = [
  { key: "keuangan", label: "Laporan Keuangan", icon: BarChart2 },
  { key: "inventaris", label: "Persediaan", icon: Boxes },
  { key: "penggajian", label: "Sumber Daya", icon: Wallet },
  { key: "pemasaran", label: "Pemasaran", icon: Megaphone },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function DaftarTemuan({ temuan }: { temuan: Temuan[] }) {
  if (temuan.length === 0)
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Tidak ada temuan. Area ini dalam kondisi baik.
      </div>
    );
  return (
    <ul className="space-y-3">
      {temuan.map((t) => {
        const T = TINGKAT[t.tingkat];
        return (
          <li key={t.judul} className={`rounded-xl border p-4 ${T.cls}`}>
            <div className="flex items-center gap-2">
              <T.icon className="w-4 h-4" />
              <p className="font-semibold text-gray-900 text-sm">{t.judul}</p>
              <span className="ml-auto text-[11px] font-semibold">{T.label}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{t.detail}</p>
            <p className="text-sm text-gray-900 mt-2">
              <b>Rekomendasi:</b> {t.saran}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function DataDriven() {
  usePageTitle("Audit Berbasis Data");
  const [params, setParams] = useSearchParams();
  const aktif: TabKey = TABS.some((t) => t.key === params.get("tab")) ? (params.get("tab") as TabKey) : "keuangan";

  const lap = useLaporan(TAHUN_BERJALAN, KONSOLIDASI);
  const { products } = useInventory();
  const { sector } = useBusinessSector();
  const { cabangList } = useAccount();
  const unitAudit = unitKerja(cabangList.map((c) => c.nama)).join("|");

  // ---------- Keuangan ----------
  const keuangan = useMemo(() => {
    const b = lap.bulanan;
    const rataBeban = b.reduce((s, x) => s + x.beban, 0) / (b.length || 1);
    const lonjakan = b
      .map((x, i) => ({ ...x, i }))
      .filter((x) => x.beban > rataBeban * 1.12)
      .sort((a, z) => z.beban - a.beban)[0];
    const rugi = b.filter((x) => x.laba < 0);
    const R = lap.ringkasan;
    const temuan: Temuan[] = [];
    if (lonjakan) {
      temuan.push({
        judul: `Lonjakan beban di bulan ${lonjakan.bulan}`,
        detail: `Beban ${formatRp(lonjakan.beban)}, ${Math.round((lonjakan.beban / rataBeban - 1) * 100)}% di atas rata-rata bulanan.`,
        saran: "Telusuri jurnal beban bulan tersebut dan pastikan setiap pengeluaran punya bukti dan persetujuan.",
        tingkat: lonjakan.beban > rataBeban * 1.25 ? "tinggi" : "sedang",
      });
    }
    if (rugi.length > 0) {
      temuan.push({
        judul: `${rugi.length} bulan mencatat rugi`,
        detail: `Bulan: ${rugi.map((x) => x.bulan).join(", ")}.`,
        saran: "Tinjau harga jual dan beban tetap pada bulan sepi; siapkan promo musiman.",
        tingkat: rugi.length > 2 ? "tinggi" : "sedang",
      });
    }
    const lancar = R.totalAsetLancar / (R.totalLiabilitasPendek || 1);
    if (lancar < 1.2) {
      temuan.push({
        judul: "Likuiditas ketat",
        detail: `Rasio lancar ${lancar.toFixed(2)}x.`,
        saran: "Percepat penagihan piutang dan tunda belanja modal yang tidak mendesak.",
        tingkat: "tinggi",
      });
    }
    const piutangHari = ((lap.neraca.piutang || 0) / (R.totalPendapatan / lap.bulanBerjalan / 30 || 1)) | 0;
    if (piutangHari > 25) {
      temuan.push({
        judul: "Umur piutang cukup panjang",
        detail: `Rata-rata piutang tertagih dalam ±${piutangHari} hari.`,
        saran: "Beri diskon pembayaran cepat dan kirim pengingat tagihan otomatis.",
        tingkat: piutangHari > 45 ? "sedang" : "rendah",
      });
    }
    const bebanTerbesar = LABA_RUGI.bebanUsaha
      .map((p) => ({ label: p.label, v: lap.lr[p.key] || 0 }))
      .sort((a, z) => z.v - a.v)[0];
    if (bebanTerbesar && bebanTerbesar.v / (R.totalPendapatan || 1) > 0.08) {
      temuan.push({
        judul: `${bebanTerbesar.label} mendominasi`,
        detail: `${((bebanTerbesar.v / R.totalPendapatan) * 100).toFixed(1)}% dari pendapatan.`,
        saran: "Bandingkan dengan standar industri dan cari peluang efisiensi.",
        tingkat: "rendah",
      });
    }
    return { temuan, lonjakan };
  }, [lap]);

  // ---------- Inventaris ----------
  const inventaris = useMemo(() => {
    const temuan: Temuan[] = [];
    const rugi = products.filter((p) => p.sellingPrice < p.unitCost);
    const menipis = products.filter((p) => p.qty < 20);
    const tipis = products.filter((p) => p.sellingPrice >= p.unitCost && (p.sellingPrice - p.unitCost) / (p.sellingPrice || 1) < 0.15);
    if (rugi.length)
      temuan.push({
        judul: `${rugi.length} produk dijual di bawah HPP`,
        detail: rugi.map((p) => p.name).slice(0, 5).join(", "),
        saran: "Naikkan harga jual atau hitung ulang HPP lewat Pembuat HPP.",
        tingkat: "tinggi",
      });
    if (menipis.length)
      temuan.push({
        judul: `${menipis.length} produk stoknya menipis`,
        detail: menipis.map((p) => `${p.name} (${p.qty})`).slice(0, 5).join(", "),
        saran: "Pesan ulang ke supplier sebelum jam puncak penjualan.",
        tingkat: menipis.length > 5 ? "sedang" : "rendah",
      });
    if (tipis.length)
      temuan.push({
        judul: `${tipis.length} produk bermargin tipis (<15%)`,
        detail: tipis.map((p) => p.name).slice(0, 5).join(", "),
        saran: "Gunakan Smart Pricing untuk membandingkan dengan harga pasar.",
        tingkat: "rendah",
      });
    const puncak = [...PENJUALAN_PER_JAM].sort((a, b) => b.n - a.n)[0];
    temuan.push({
      judul: `Jam puncak penjualan ${puncak.jam}`,
      detail: `${puncak.n} transaksi per jam pada akhir pekan.`,
      saran: "Pastikan stok produk terlaris aman 2 jam sebelum jam puncak untuk mencegah kehilangan penjualan.",
      tingkat: "rendah",
    });
    return { temuan, puncak: puncak.jam };
  }, [products]);

  // ---------- Penggajian ----------
  const penggajian = useMemo(() => {
    const k = karyawanSektor(sector, unitAudit.split("|"));
    const temuan: Temuan[] = [];
    const absen = 100 - k.reduce((s, x) => s + x.kehadiran, 0) / k.length;
    const rendah = k.filter((x) => x.kehadiran < 90);
    if (absen > 8)
      temuan.push({
        judul: "Tingkat ketidakhadiran tinggi",
        detail: `Rata-rata ${absen.toFixed(1)}% hari kerja tidak hadir tepat waktu.`,
        saran: "Cek jadwal shift malam dan terapkan kebijakan kehadiran yang jelas.",
        tingkat: absen > 12 ? "tinggi" : "sedang",
      });
    if (rendah.length)
      temuan.push({
        judul: `${rendah.length} karyawan kehadirannya di bawah 90%`,
        detail: rendah.map((x) => `${x.nama} (${x.kehadiran}%)`).join(", "),
        saran: "Lakukan pembinaan satu per satu dan evaluasi beban kerja.",
        tingkat: "sedang",
      });
    const g = k.map(hitungGaji);
    const bruto = g.reduce((s, x) => s + x.bruto, 0);
    const lembur = k.reduce((s, x) => s + x.lembur, 0);
    if (lembur / bruto > 0.06)
      temuan.push({
        judul: "Biaya lembur tinggi",
        detail: `Lembur ${formatRp(lembur)} atau ${((lembur / bruto) * 100).toFixed(1)}% dari gaji bruto.`,
        saran: "Atur ulang jadwal shift atau tambah tenaga paruh waktu di jam puncak.",
        tingkat: "sedang",
      });
    const rasio = (bruto * 12) / ((lap.ringkasan.totalPendapatan / lap.bulanBerjalan) * 12 || 1);
    temuan.push({
      judul: "Rasio biaya gaji terhadap pendapatan",
      detail: `${(rasio * 100).toFixed(1)}% dari pendapatan.`,
      saran: rasio > 0.2 ? "Rasio di atas 20%, tinjau produktivitas per karyawan." : "Masih dalam batas wajar UMKM (di bawah 20%).",
      tingkat: rasio > 0.2 ? "sedang" : "rendah",
    });
    const grafik = k.map((x) => ({ nama: x.nama.split(" ")[0], kehadiran: x.kehadiran, kinerja: x.kinerja }));
    return { temuan, grafik };
  }, [sector, lap, unitAudit]);

  // ---------- Pemasaran ----------
  const pemasaran = useMemo(() => {
    const u = ulasanAwal();
    const temuan: Temuan[] = [];
    const neg = u.filter((x) => x.sentimen === "negatif");
    const share = neg.length / u.length;
    if (share > 0.15)
      temuan.push({
        judul: "Porsi ulasan negatif tinggi",
        detail: `${Math.round(share * 100)}% ulasan bernada negatif.`,
        saran: "Balas setiap ulasan negatif dalam 24 jam dan tawarkan solusi.",
        tingkat: share > 0.25 ? "tinggi" : "sedang",
      });
    const topik: Topik[] = ["Rasa / Kualitas", "Harga", "Pengiriman", "Pelayanan", "Kemasan"];
    const keluhan = topik.map((t) => ({ t, n: neg.filter((x) => x.topik.includes(t)).length })).sort((a, b) => b.n - a.n)[0];
    if (keluhan.n)
      temuan.push({
        judul: `Keluhan utama: ${keluhan.t}`,
        detail: `${keluhan.n} ulasan negatif menyinggung topik ini.`,
        saran: "Lihat tab Pemasaran di Manajemen Internal untuk rincian per platform.",
        tingkat: "sedang",
      });
    const platform = ["Instagram", "TikTok", "Shopee", "Tokopedia"].map((p) => {
      const xs = u.filter((x) => x.platform === p);
      return { platform: p, rating: xs.reduce((s, x) => s + x.rating, 0) / (xs.length || 1) };
    });
    platform
      .filter((p) => p.rating < 3.8)
      .forEach((p) =>
        temuan.push({
          judul: `Rating ${p.platform} di bawah 3,8`,
          detail: `Rata-rata ${p.rating.toFixed(1)} bintang.`,
          saran: `Prioritaskan perbaikan layanan dan respon chat di ${p.platform}.`,
          tingkat: "sedang",
        }),
      );
    return { temuan, platform };
  }, []);

  const aspek = [
    { key: "keuangan" as const, label: "Keuangan", skor: skorDari(keuangan.temuan) },
    { key: "inventaris" as const, label: "Persediaan", skor: skorDari(inventaris.temuan) },
    { key: "penggajian" as const, label: "Sumber Daya", skor: skorDari(penggajian.temuan) },
    { key: "pemasaran" as const, label: "Pemasaran", skor: skorDari(pemasaran.temuan) },
  ];
  const skorTotal = Math.round(aspek.reduce((s, a) => s + a.skor, 0) / aspek.length);
  const semua = [...keuangan.temuan, ...inventaris.temuan, ...penggajian.temuan, ...pemasaran.temuan];
  const prioritas = semua.filter((t) => t.tingkat !== "rendah").slice(0, 4);
  const catatanKonsultasi = prioritas.map((p) => p.judul).join("; ");

  return (
    <div className="max-w-[80rem] mx-auto space-y-6">
      <p className="text-sm text-gray-600">
        Deteksi anomali dan rekomendasi berbasis data dari laporan keuangan, inventaris, penggajian, dan pemasaran.
      </p>

      {/* Ringkasan atas */}
      <section id="audit-ringkasan" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="card-gradient grad-navy lg:col-span-5 p-6">
          <div className="relative flex items-center gap-2 mb-3">
            <Gauge className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold">Skor Kesehatan UMKM</h2>
          </div>
          <div className="relative flex items-end gap-2 mb-4">
            <span className="text-5xl font-extrabold">
              <AngkaBerjalan nilai={skorTotal} format={String} />
            </span>
            <span className="text-sm text-white/70 mb-2">/ 100</span>
          </div>
          <div className="relative space-y-3">
            {aspek.map((a) => (
              <button key={a.key} onClick={() => setParams({ tab: a.key })} className="w-full text-left">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white/90">{a.label}</span>
                  <span className="text-white/80">{a.skor}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${a.skor >= 80 ? "bg-emerald-400" : a.skor >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${a.skor}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="card-elegant lg:col-span-7 p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Ringkasan Strategis</h2>
          {prioritas.length === 0 ? (
            <p className="text-sm text-gray-600">Tidak ada temuan prioritas. Pertahankan kinerja saat ini.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              {prioritas.map((t) => (
                <li key={t.judul} className="flex gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${t.tingkat === "tinggi" ? "text-red-600" : "text-amber-600"}`} />
                  <span>
                    <b>{t.judul}.</b> {t.saran}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/konsultasi?topik=${encodeURIComponent("Temuan Audit")}&catatan=${encodeURIComponent(catatanKonsultasi)}`}
            className="mt-auto pt-4"
          >
            <span className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow">
              Konsultasikan dengan Pakar Catalys <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      <PillTabs tabs={TABS} active={aktif} onChange={(k) => setParams({ tab: k })} />

      {aktif === "keuangan" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Deteksi Anomali Pendapatan & Beban</h3>
            <p className="text-xs text-gray-500 mb-3">Konsolidasi {lap.tahun}. Titik merah = bulan dengan lonjakan beban.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lap.bulanan}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bulan" tickLine={false} axisLine={false} />
                  <YAxis width={60} tickFormatter={(v) => formatRpSingkat(Number(v)).replace("Rp ", "")} tickLine={false} axisLine={false} fontSize={11} />
                  <ReTooltip formatter={(v: number, n: string) => [formatRp(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#2f6b8f" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="beban" name="Beban" stroke="#9cb2c1" strokeWidth={2} dot={{ r: 2 }} />
                  {keuangan.lonjakan && (
                    <ReferenceDot x={keuangan.lonjakan.bulan} y={keuangan.lonjakan.beban} r={7} fill="#9cb2c1" stroke="#fff" strokeWidth={2} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Link to="/financial" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Buka Laporan Keuangan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <DaftarTemuan temuan={keuangan.temuan} />
          </div>
        </section>
      )}

      {aktif === "inventaris" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Penjualan per Jam</h3>
            <p className="text-xs text-gray-500 mb-3">Rata-rata transaksi kasir akhir pekan. Batang emas = jam puncak.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PENJUALAN_PER_JAM} barCategoryGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="jam" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis width={36} tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: number) => [`${v} transaksi`, "Jumlah"]} />
                  <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                    {PENJUALAN_PER_JAM.map((x) => (
                      <Cell key={x.jam} fill={x.jam === inventaris.puncak ? "#5487ab" : "#2f6b8f"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-5">
            <DaftarTemuan temuan={inventaris.temuan} />
          </div>
        </section>
      )}

      {aktif === "penggajian" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Kehadiran & Kinerja Karyawan</h3>
            <p className="text-xs text-gray-500 mb-3">Garis batas kehadiran sehat: 90%.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={penggajian.grafik}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nama" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[50, 100]} width={32} tickLine={false} axisLine={false} />
                  <ReTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="kehadiran" name="Kehadiran (%)" radius={[4, 4, 0, 0]}>
                    {penggajian.grafik.map((x) => (
                      <Cell key={x.nama} fill={x.kehadiran < 90 ? "#9cb2c1" : "#2f6b8f"} />
                    ))}
                  </Bar>
                  <Bar dataKey="kinerja" name="Kinerja" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/internal-management?tab=penggajian" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Buka Sumber Daya <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <DaftarTemuan temuan={penggajian.temuan} />
          </div>
        </section>
      )}

      {aktif === "pemasaran" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Rating Rata-rata per Platform</h3>
            <p className="text-xs text-gray-500 mb-3">Ulasan Instagram, TikTok, Shopee, dan Tokopedia.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pemasaran.platform}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="platform" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 5]} width={28} tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: number) => [v.toFixed(1), "Rating"]} />
                  <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
                    {pemasaran.platform.map((p) => (
                      <Cell key={p.platform} fill={p.rating < 3.8 ? "#9cb2c1" : "#2f6b8f"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/internal-management?tab=pemasaran" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Buka Pemasaran <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <DaftarTemuan temuan={pemasaran.temuan} />
          </div>
        </section>
      )}
    </div>
  );
}

export default DataDriven;
