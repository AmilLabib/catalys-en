import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  ReferenceLine,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileSpreadsheet,
  FileText,
  FileEdit,
  Lock,
  TrendingUp,
  PiggyBank,
  Wallet,
  Activity,
  Gauge,
  ArrowRight,
  Building2,
  Lightbulb,
} from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useEntitasSendiri, useLaporanRentang } from "../hooks/useLaporan";
import PilihPeriode from "../components/PilihPeriode";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { useJournal } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import QuotaBadge from "../components/QuotaBadge";
import AngkaBerjalan from "../components/AngkaBerjalan";
import ScanStruk from "../components/ScanStruk";
import {
  daftarEntitas,
  KONSOLIDASI,
  LABA_RUGI,
  NERACA,
  formatRp,
  formatRpSingkat,
  hitungLaporanRentang,
  HARI_INI,
  labelPeriode,
  formatTanggal,
} from "../data/laporan";
import { susunCalk, susunTabel, type Baris } from "../data/laporanTabel";
import { eksporExcel, eksporPdf, namaFile } from "../utils/eksporLaporan";
import { useAkses } from "../context/AksesContext";

// palet grafik: hanya tone navy, terang-gelap berselang agar tetap terbedakan
const WARNA = ["#012a3d", "#5487ab", "#13577d", "#9cb2c1", "#2f6b8f", "#c6d8e4", "#0a3f5e", "#7193ad", "#3d7ea3", "#adc4d3"];

const angka = (v: number | undefined) => {
  if (v === undefined) return "";
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(${s})` : s;
};

const persen = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

function tumbuh(now: number, before: number) {
  if (!before) return null;
  return (now - before) / Math.abs(before);
}

export default function Financial() {
  usePageTitle("Laporan Keuangan");
  const navigate = useNavigate();
  const { role, alasanTerkunci, pakaiKuota, quotaRemaining, profile } = useAccount();
  const kunciAudit = alasanTerkunci("audit");
  const { punyaCabang, cabangList } = useAccount();
  const { tampilkanAkses } = useAkses();
  const { toast, notifUnduhan } = useToast();
  const sendiri = useEntitasSendiri();

  // periode laporan: default tahun berjalan (1 Januari s.d. hari ini)
  const [rentang, setRentang] = useState({ dari: `${HARI_INI.slice(0, 4)}-01-01`, sampai: HARI_INI });
  const [entitas, setEntitas] = useState(sendiri);
  const [tab, setTab] = useState(0);
  const lap = useLaporanRentang(rentang.dari, rentang.sampai, entitas);
  const periode = lap.periode!;
  const [labelIni, labelLalu] = periode.kolomPeriode;
  const tabel = useMemo(() => susunTabel(lap), [lap]);
  const calk = useMemo(() => susunCalk(lap, profile.namaUsaha), [lap, profile.namaUsaha]);

  const R = lap.ringkasan;
  const RL = lap.ringkasanLalu;

  // ---------- Ekspor ----------
  const [mengekspor, setMengekspor] = useState<"excel" | "pdf" | null>(null);
  const ekspor = async (jenis: "excel" | "pdf") => {
    if (!pakaiKuota("eksporLaporan")) {
      toast("Kuota ekspor laporan habis. Upgrade ke paket Pro untuk ekspor tanpa batas.", "peringatan");
      return;
    }
    setMengekspor(jenis);
    try {
      if (jenis === "excel") await eksporExcel(lap, profile.namaUsaha);
      else await eksporPdf(lap, profile.namaUsaha);
      notifUnduhan({
        judul: "Unduhan Selesai",
        pesan: `Laporan Keuangan ${periode.label} berhasil diunduh`,
        berkas: [namaFile(lap, jenis === "excel" ? "xlsx" : "pdf")],
      });
    } catch (e) {
      console.error(e);
      toast("Ekspor gagal. Coba lagi.", "peringatan");
    } finally {
      setMengekspor(null);
    }
  };
  const sisaEkspor = quotaRemaining("eksporLaporan");

  // ---------- Grafik ----------
  const komposisiBeban = LABA_RUGI.bebanUsaha
    .map((p) => { const n = p.label.replace("Beban ", ""); return { name: n[0].toUpperCase() + n.slice(1), value: lap.lr[p.key] || 0 }; })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const perbandingan = [
    { pos: "Pendapatan", ini: R.totalPendapatan, lalu: RL.totalPendapatan },
    { pos: "Laba kotor", ini: R.labaKotor, lalu: RL.labaKotor },
    { pos: "Laba usaha", ini: R.labaUsaha, lalu: RL.labaUsaha },
    { pos: "Laba bersih", ini: R.labaBersih, lalu: RL.labaBersih },
  ];

  const marginBulanan = lap.bulanan.map((b) => ({
    bulan: b.bulan,
    margin: b.pendapatan ? (b.laba / b.pendapatan) * 100 : 0,
  }));

  const komposisiAset = [...NERACA.asetLancar, ...NERACA.asetTidakLancar]
    .map((p) => ({ name: p.label.replace(" (harga perolehan)", "").replace(" (neto)", ""), value: lap.neraca[p.key] || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const strukturPendanaan = [
    { name: "Liabilitas jangka pendek", value: R.totalLiabilitasPendek },
    { name: "Liabilitas jangka panjang", value: R.totalLiabilitasPanjang },
    { name: "Ekuitas", value: R.totalEkuitas },
  ].filter((d) => d.value > 0);

  const arusKasAktivitas = [
    { aktivitas: "Operasi", ini: lap.arusKas.totalOperasi, lalu: lap.arusKasLalu.totalOperasi },
    { aktivitas: "Investasi", ini: lap.arusKas.totalInvestasi, lalu: lap.arusKasLalu.totalInvestasi },
    { aktivitas: "Pendanaan", ini: lap.arusKas.totalPendanaan, lalu: lap.arusKasLalu.totalPendanaan },
  ];

  // saldo kas akhir tiap kelompok waktu, dari kas awal periode ditambah arus kas bersihnya
  const saldoKasBulanan = lap.bulanan.reduce<{ bulan: string; saldo: number }[]>((acc, b) => {
    const sebelum = acc.length ? acc[acc.length - 1].saldo : lap.arusKas.kasAwal;
    acc.push({ bulan: b.bulan, saldo: sebelum + b.kasMasuk - b.kasKeluar });
    return acc;
  }, []);

  const { entries, semuaJurnal } = useJournal();
  const { accounts } = useChartOfAccounts();
  const jurnalTerbaru = semuaJurnal.slice(0, 4);
  const kontribusiCabang = useMemo(() => {
    if (entitas !== KONSOLIDASI || !punyaCabang) return [];
    return cabangList.map(({ nama: b }) => ({
      name: b,
      value: hitungLaporanRentang(b, periode.dari, periode.sampai, [], accounts).ringkasan.totalPendapatan,
    }));
  }, [entitas, periode.dari, periode.sampai, accounts, punyaCabang, cabangList]);

  // ---------- Insight ----------
  const rasio = {
    marginKotor: R.labaKotor / (R.totalPendapatan || 1),
    marginBersih: R.labaBersih / (R.totalPendapatan || 1),
    lancar: R.totalAsetLancar / (R.totalLiabilitasPendek || 1),
    der: R.totalLiabilitas / (R.totalEkuitas || 1),
    roa: R.labaBersih / (R.totalAset || 1),
    // disetahunkan agar sebanding untuk periode berapa pun panjangnya
    perputaranPersediaan: ((lap.lr.hpp || 0) * (365 / periode.hari)) / (lap.neraca.persediaan || 1),
  };
  const tumbuhPendapatan = tumbuh(R.totalPendapatan, RL.totalPendapatan);
  const bebanTerbesar = komposisiBeban[0];

  const insight: { judul: string; nilai: string; status: "baik" | "perhatian" | "waspada"; teks: string }[] = [
    {
      judul: "Margin laba bersih",
      nilai: persen(rasio.marginBersih),
      status: rasio.marginBersih >= 0.15 ? "baik" : rasio.marginBersih >= 0.08 ? "perhatian" : "waspada",
      teks:
        rasio.marginBersih >= 0.15
          ? "Profitabilitas sehat. Pertahankan disiplin biaya."
          : "Margin tipis. Tinjau harga jual dan beban terbesar.",
    },
    {
      judul: "Rasio lancar",
      nilai: `${rasio.lancar.toFixed(2).replace(".", ",")}x`,
      status: rasio.lancar >= 1.5 ? "baik" : rasio.lancar >= 1 ? "perhatian" : "waspada",
      teks:
        rasio.lancar >= 1.5
          ? "Aset lancar cukup untuk menutup utang jangka pendek."
          : "Likuiditas ketat. Percepat penagihan piutang.",
    },
    {
      judul: "Utang terhadap ekuitas",
      nilai: `${rasio.der.toFixed(2).replace(".", ",")}x`,
      status: rasio.der <= 1 ? "baik" : rasio.der <= 2 ? "perhatian" : "waspada",
      teks: rasio.der <= 1 ? "Struktur modal konservatif, ruang pendanaan masih ada." : "Ketergantungan pada utang cukup tinggi.",
    },
    {
      judul: "Pertumbuhan pendapatan",
      nilai: tumbuhPendapatan === null ? "—" : persen(tumbuhPendapatan),
      status: tumbuhPendapatan === null || tumbuhPendapatan >= 0.05 ? "baik" : tumbuhPendapatan >= 0 ? "perhatian" : "waspada",
      teks: `Dibandingkan dengan periode yang sama tahun lalu (${labelLalu}).`,
    },
    {
      judul: "Perputaran persediaan",
      nilai: `${rasio.perputaranPersediaan.toFixed(1).replace(".", ",")}x / thn`,
      status: rasio.perputaranPersediaan >= 6 ? "baik" : rasio.perputaranPersediaan >= 3 ? "perhatian" : "waspada",
      teks: `Stok rata-rata habis dalam ${Math.round(365 / (rasio.perputaranPersediaan || 1))} hari.`,
    },
    {
      judul: "Beban usaha terbesar",
      nilai: bebanTerbesar ? bebanTerbesar.name : "—",
      status: "perhatian",
      teks: bebanTerbesar
        ? `${persen(bebanTerbesar.value / (R.totalPendapatan || 1))} dari pendapatan. Prioritaskan efisiensi di pos ini.`
        : "",
    },
  ];

  const warnaStatus = {
    baik: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    perhatian: "bg-amber-50 text-amber-700 ring-amber-200",
    waspada: "bg-red-50 text-red-700 ring-red-200",
  };
  const labelStatus = { baik: "Baik", perhatian: "Perlu perhatian", waspada: "Waspada" };

  const kpi = [
    { label: "Total Pendapatan", nilai: R.totalPendapatan, lalu: RL.totalPendapatan, icon: TrendingUp },
    { label: "Laba Bersih", nilai: R.labaBersih, lalu: RL.labaBersih, icon: PiggyBank },
    { label: "Kenaikan Kas Bersih", nilai: lap.arusKas.kenaikanKas, lalu: lap.arusKasLalu.kenaikanKas, icon: Activity },
    { label: "Total Aset", nilai: R.totalAset, lalu: RL.totalAset, icon: Wallet },
  ];

  const sumbuRp = (v: number) => formatRpSingkat(Number(v)).replace("Rp ", "");
  const rpTooltip = (v: number, n: string) => [formatRp(v), n] as [string, string];

  return (
    <div className="space-y-6">
      {/* Kepala halaman */}
      <div>
        <h2 className="text-2xl font-bold text-primary">Laporan Keuangan</h2>
        <p className="text-sm text-gray-500">Catat transaksi, susun laporan format SAK EMKM, lalu analisis hasilnya.</p>
      </div>

      {/* ===== Bagian 1: pencatatan transaksi ===== */}
      <PemisahBagian
        nomor={1}
        judul="Pencatatan Transaksi"
        teks="Catat penjualan dan pembelian lewat scan struk, atau input jurnal secara manual."
      />
      <section data-tour="pencatatan" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <ScanStruk className="lg:col-span-3" />
        <div className="lg:col-span-2 card-elegant p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">Entri Jurnal</h3>
              <p className="text-xs text-gray-500">Input transaksi manual dengan templat dan saran akun.</p>
            </div>
            <span className="w-9 h-9 shrink-0 rounded-xl chip-gradient flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Jurnal terbaru</p>
          <ul className="space-y-2 flex-1">
            {jurnalTerbaru.map((j) => {
              const total = j.lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
              return (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{j.description || "Jurnal umum"}</p>
                    <p className="text-[11px] text-gray-400">{j.date}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">{formatRpSingkat(total)}</span>
                </li>
              );
            })}
            {jurnalTerbaru.length === 0 && <li className="text-sm text-gray-400">Belum ada jurnal.</li>}
          </ul>
          <Link
            to="/jurnal"
            className="mt-4 btn-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <FileEdit className="w-4 h-4" /> Buka Entri Jurnal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ===== Bagian 2: laporan keuangan & insight ===== */}
      <PemisahBagian
        nomor={2}
        judul="Laporan Keuangan & Insight"
        teks={`Hasil otomatis dari jurnal · ${lap.entitas} · ${labelPeriode(lap)}`}
      />

      {/* Pengaturan laporan: entitas, periode, ekspor */}
      <section data-tour="pengaturan-laporan" className="card-elegant p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 lg:items-end">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Entitas laporan</p>
          {role === "induk" && !punyaCabang ? (
            <span className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm" title="Pilihan per cabang muncul setelah membuka cabang">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-primary">Seluruh usaha</span>
              <span className="text-xs text-gray-400">(belum ada cabang)</span>
            </span>
          ) : role === "induk" ? (
            <label className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm">
              <Building2 className="w-4 h-4 text-gray-500" />
              <select value={entitas} onChange={(e) => setEntitas(e.target.value)} className="bg-transparent font-semibold text-primary outline-none">
                {daftarEntitas().map((x) => (
                  <option key={x} value={x}>
                    {x === KONSOLIDASI ? "Konsolidasi (semua cabang)" : x}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span
              className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              title="Laporan cabang lain dan konsolidasi hanya bisa dilihat dari akun Induk"
            >
              <Building2 className="w-4 h-4" /> {sendiri}
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Periode</p>
          <PilihPeriode dari={rentang.dari} sampai={rentang.sampai} onUbah={(dari, sampai) => setRentang({ dari, sampai })} />
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Ekspor laporan <QuotaBadge kuota="eksporLaporan" />
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => ekspor("excel")}
              disabled={mengekspor !== null || sisaEkspor === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-600 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {mengekspor === "excel" ? "Menyiapkan..." : "Excel"}
            </button>
            <button
              onClick={() => ekspor("pdf")}
              disabled={mengekspor !== null || sisaEkspor === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-600 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {mengekspor === "pdf" ? "Menyiapkan..." : "PDF"}
            </button>
          </div>
          {sisaEkspor === 0 && (
            role === "induk" ? (
              <Link to="/profil?tab=paket" className="mt-1 block text-xs font-medium text-primary underline">
                Kuota habis. Upgrade untuk ekspor tanpa batas.
              </Link>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Kuota akun ini habis. Minta akun Induk untuk upgrade.</p>
            )
          )}
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map(({ label, nilai, lalu, icon: Icon }, i) => {
          const g = tumbuh(nilai, lalu);
          return (
            <div key={label} className={`card-gradient ${["grad-navy", "grad-ocean", "grad-indigo", "grad-steel"][i]} p-5`}>
              <div className="relative flex items-center justify-between">
                <p className="text-sm text-white/75">{label}</p>
                <div className="w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="relative mt-2 text-2xl font-extrabold" title={formatRp(nilai)}>
                <AngkaBerjalan nilai={nilai} format={formatRpSingkat} />
              </p>
              <p className="relative text-xs text-white/70 mt-1">
                Periode lalu {formatRpSingkat(lalu)}
                {g !== null && (
                  <span className={g >= 0 ? "text-emerald-200" : "text-rose-200"}> · {g >= 0 ? "+" : ""}{persen(g)}</span>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {/* Tabel laporan keuangan */}
      <section id="tab-laporan" className="card-elegant overflow-hidden">
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b px-3 pt-3">
          {[...tabel.map((t) => t.judul), "Catatan atas Laporan Keuangan"].map((j, i) => (
            <button
              key={j}
              onClick={() => setTab(i)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === i ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {j.replace("Laporan ", "")}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-5">
            <p className="font-bold text-gray-900">{profile.namaUsaha}</p>
            <p className="font-semibold text-primary">{tab < tabel.length ? tabel[tab].judul : "Catatan atas Laporan Keuangan"}</p>
            <p className="text-xs text-gray-500">
              {lap.entitas} · {tab === 0 ? `Per ${formatTanggal(periode.sampai, true)}` : `Untuk periode ${labelPeriode(lap)}`} · (dalam Rupiah)
            </p>
          </div>

          {tab < tabel.length ? (
            <TabelLaporan baris={tabel[tab].baris} kolom={tabel[tab].kolom} satuKolom={tabel[tab].key === "ekuitas"} />
          ) : (
            <div className="space-y-5 text-sm text-gray-700 max-w-3xl mx-auto">
              {calk.map((c) => (
                <div key={c.judul}>
                  <p className="font-semibold text-gray-900 mb-1">{c.judul}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {c.isi.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Insight */}
      <section className="card-elegant p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Insight Keuangan</h3>
              <p className="text-sm text-gray-500">Rasio keuangan utama dan apa artinya bagi usaha Anda.</p>
            </div>
          </div>
          <button
            onClick={() => (kunciAudit ? tampilkanAkses("audit") : navigate("/data-driven"))}
            title={kunciAudit?.pesan}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Gauge className="w-4 h-4" /> Cek Performa
            {kunciAudit ? <Lock className="w-3.5 h-3.5 text-white/70" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {insight.map((x) => (
            <div key={x.judul} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">{x.judul}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${warnaStatus[x.status]}`}>
                  {labelStatus[x.status]}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-primary">{x.nilai}</p>
              <p className="mt-1 text-xs text-gray-600">{x.teks}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bagian 3: analisis grafik ===== */}
      <PemisahBagian nomor={3} judul="Analisis Grafik" teks="Delapan sudut pandang atas kinerja, posisi keuangan, dan arus kas." />
      <section data-tour="grafik" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KartuGrafik judul="Pendapatan, Beban, dan Laba Bulanan" sub="Batang = pendapatan & beban, garis = laba.">
          <ComposedChart data={lap.bulanan}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="pendapatan" name="Pendapatan" fill="#2f6b8f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="beban" name="Beban" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
            <Line dataKey="laba" name="Laba" stroke="#13577d" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </KartuGrafik>

        <KartuGrafik judul="Tren Margin Laba Bulanan" sub={`Margin laba bersih setahun ${persen(rasio.marginBersih)}`}>
          <AreaChart data={marginBulanan}>
            <defs>
              <linearGradient id="gradMargin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#13577d" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#13577d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={44} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1).replace(".", ",")}%`, "Margin laba"]} />
            <Area type="monotone" dataKey="margin" stroke="#13577d" strokeWidth={2.5} fill="url(#gradMargin)" />
          </AreaChart>
        </KartuGrafik>

        <KartuGrafik judul="Komposisi Beban Usaha" sub={`Total ${formatRp(R.totalBebanUsaha)}`}>
          <BarChart data={komposisiBeban} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f6" />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
            <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Bar dataKey="value" name="Beban" radius={[0, 4, 4, 0]}>
              {komposisiBeban.map((_, i) => (
                <Cell key={i} fill={WARNA[i % WARNA.length]} />
              ))}
            </Bar>
          </BarChart>
        </KartuGrafik>

        <KartuGrafik
          judul="Perbandingan dengan Tahun Lalu"
          sub={`${labelIni} vs ${labelLalu}`}
        >
          <BarChart data={perbandingan}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="pos" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ini" name={labelIni} fill="#012a3d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lalu" name={labelLalu} fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </KartuGrafik>

        <KartuGrafik judul="Komposisi Aset" sub={`Total aset ${formatRp(R.totalAset)}`}>
          <PieChart>
            <Pie data={komposisiAset} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {komposisiAset.map((_, i) => (
                <Cell key={i} fill={WARNA[i % WARNA.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </KartuGrafik>

        <KartuGrafik
          judul="Struktur Pendanaan"
          sub={`Utang terhadap ekuitas ${rasio.der.toFixed(2).replace(".", ",")}x`}
        >
          <PieChart>
            <Pie data={strukturPendanaan} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {strukturPendanaan.map((_, i) => (
                <Cell key={i} fill={["#9cb2c1", "#5487ab", "#012a3d"][i % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </KartuGrafik>

        <KartuGrafik judul="Arus Kas Masuk vs Keluar" sub={`Kas operasi bersih ${formatRp(lap.arusKas.totalOperasi)}`}>
          <BarChart data={lap.bulanan}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="kasMasuk" name="Kas masuk" fill="#13577d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="kasKeluar" name="Kas keluar" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </KartuGrafik>

        <KartuGrafik judul="Arus Kas per Aktivitas" sub={`Kenaikan kas bersih ${formatRp(lap.arusKas.kenaikanKas)}`}>
          <BarChart data={arusKasAktivitas}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="aktivitas" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="ini" name={labelIni} fill="#2f6b8f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lalu" name={labelLalu} fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </KartuGrafik>

        {entitas === KONSOLIDASI && punyaCabang ? (
          <KartuGrafik judul="Kontribusi Pendapatan per Cabang" sub="Porsi tiap cabang terhadap pendapatan konsolidasi.">
            <PieChart>
              <Pie data={kontribusiCabang} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {kontribusiCabang.map((_, i) => (
                  <Cell key={i} fill={WARNA[i % WARNA.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatRp(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </KartuGrafik>
        ) : (
          <KartuGrafik judul="Saldo Kas Bulanan" sub={`Kas awal ${formatRp(lap.arusKas.kasAwal)} → akhir ${formatRp(lap.arusKas.kasAkhir)}`}>
            <AreaChart data={saldoKasBulanan}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={sumbuRp} />
              <Tooltip formatter={(v: number) => [formatRp(v), "Saldo kas"]} />
              <Area type="monotone" dataKey="saldo" stroke="#2f6b8f" strokeWidth={2.5} fill="url(#gradSaldo)" />
            </AreaChart>
          </KartuGrafik>
        )}
      </section>

      {/* entri jurnal pengguna hanya memengaruhi laporan entitas sendiri */}
      {entitas !== sendiri && entries.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Jurnal yang Anda input hanya tercatat di laporan {sendiri}.
        </p>
      )}
    </div>
  );
}

// Pemisah antarbagian halaman: nomor, judul, dan garis pembatas
function PemisahBagian({ nomor, judul, teks }: { nomor: number; judul: string; teks: string }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 pt-4">
      <span className="grad-navy w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-base font-extrabold text-white shadow-md">
        {nomor}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-primary leading-tight">{judul}</h2>
        <p className="text-xs text-gray-500">{teks}</p>
      </div>
      <div className="hidden sm:block h-px flex-1 min-w-[2rem] bg-gradient-to-r from-primary/30 to-transparent" />
    </div>
  );
}

function KartuGrafik({ judul, sub, children }: { judul: string; sub: string; children: React.ReactElement }) {
  return (
    <div className="card-elegant p-5">
      <h3 className="font-semibold text-gray-900">{judul}</h3>
      <p className="text-xs text-gray-500 mb-3">{sub}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TabelLaporan({ baris, kolom, satuKolom }: { baris: Baris[]; kolom: [string, string]; satuKolom: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="text-left font-semibold px-3 py-2 rounded-l-lg">Keterangan</th>
            <th className={`text-right font-semibold px-3 py-2 w-44 ${satuKolom ? "rounded-r-lg" : ""}`}>{kolom[0]}</th>
            {!satuKolom && <th className="text-right font-semibold px-3 py-2 w-44 rounded-r-lg">{kolom[1]}</th>}
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => {
            const cls =
              b.tipe === "judul"
                ? "font-bold text-primary pt-5"
                : b.tipe === "subjudul"
                  ? "font-semibold text-gray-800 pt-3"
                  : b.tipe === "total"
                    ? "font-bold text-gray-900 bg-[#e1ecf3]"
                    : b.tipe === "subtotal"
                      ? "font-semibold text-gray-900 border-t"
                      : "text-gray-700";
            const pad = b.tipe === "baris" ? "pl-8" : "pl-3";
            return (
              <tr key={i} className={b.tipe === "baris" ? "hover:bg-gray-50" : ""}>
                <td className={`${pad} pr-3 py-1.5 ${cls}`}>{b.label}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${cls}`}>{angka(b.nilai)}</td>
                {!satuKolom && <td className={`px-3 py-1.5 text-right tabular-nums ${cls} ${b.tipe === "baris" ? "text-gray-500" : ""}`}>{angka(b.lalu)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
