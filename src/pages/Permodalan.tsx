import { useEffect, useMemo, useRef, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  ShieldCheck,
  Banknote,
  Percent,
  Calendar,
  Briefcase,
  Info,
  CheckCircle2,
  FileText,
  Wallet,
  Clock,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useJournal } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { formatRp } from "../data/laporan";
import { rayakan } from "../utils/efek";

type JenisProduk = "KUR" | "Pembiayaan Invoice" | "Modal Kerja Mikro";

type LoanProduct = {
  id: string;
  name: string;
  partnerType: "Bank" | "Fintech";
  productType: JenisProduk;
  logo?: string;
  interestPa: number;
  maxTenorMonths: number;
  processingDays: number;
};

const loanProducts: LoanProduct[] = [
  { id: "p1", name: "Bank Maju - KUR", partnerType: "Bank", productType: "KUR", logo: "/permodalan-1.png", interestPa: 6.0, maxTenorMonths: 36, processingDays: 7 },
  { id: "p2", name: "FundIndo - Pembiayaan Invoice", partnerType: "Fintech", productType: "Pembiayaan Invoice", logo: "/permodalan-3.png", interestPa: 12.5, maxTenorMonths: 12, processingDays: 3 },
  { id: "p3", name: "KreditMikro - Modal Kerja", partnerType: "Fintech", productType: "Modal Kerja Mikro", logo: "/permodalan-2.png", interestPa: 18.0, maxTenorMonths: 24, processingDays: 5 },
  { id: "p4", name: "Sinergi Modal - KUR", partnerType: "Bank", productType: "KUR", logo: "/permodalan-4.png", interestPa: 7.5, maxTenorMonths: 36, processingDays: 10 },
  { id: "p5", name: "DanaCepat - Pembiayaan Invoice", partnerType: "Fintech", productType: "Pembiayaan Invoice", logo: "/permodalan-5.png", interestPa: 13.0, maxTenorMonths: 12, processingDays: 2 },
  { id: "p6", name: "MitraKita - Modal Kerja", partnerType: "Fintech", productType: "Modal Kerja Mikro", logo: "/permodalan-6.png", interestPa: 15.0, maxTenorMonths: 18, processingDays: 4 },
];

const DESKRIPSI: Record<JenisProduk, { teks: string; syarat: string[] }> = {
  KUR: {
    teks: "Kredit Usaha Rakyat bersubsidi pemerintah untuk UMKM produktif. Bunga rendah dan tenor panjang, cocok untuk modal kerja maupun investasi alat.",
    syarat: [
      "KTP pemilik dan Kartu Keluarga",
      "NPWP pribadi atau badan usaha",
      "NIB (Nomor Induk Berusaha) dari OSS",
      "Usaha sudah berjalan minimal 6 bulan",
      "Laporan keuangan 6 bulan terakhir (bisa diekspor dari Catalys)",
      "Tidak sedang menerima kredit produktif lain dari perbankan",
    ],
  },
  "Pembiayaan Invoice": {
    teks: "Dana talangan atas tagihan (invoice) yang belum dibayar pelanggan. Pencairan cepat, pelunasan saat invoice dibayar.",
    syarat: [
      "KTP pemilik dan NPWP",
      "NIB atau izin usaha",
      "Invoice aktif beserta kontrak/PO dari pelanggan",
      "Rekening koran 3 bulan terakhir",
      "Pelanggan pembayar berbadan usaha",
    ],
  },
  "Modal Kerja Mikro": {
    teks: "Pinjaman modal kerja tanpa agunan dari platform pendanaan berizin OJK, untuk kebutuhan stok dan operasional jangka pendek.",
    syarat: [
      "KTP pemilik dan swafoto dengan KTP",
      "NPWP (untuk pinjaman di atas Rp 50 juta)",
      "Foto tempat usaha",
      "Mutasi rekening atau riwayat transaksi 3 bulan terakhir",
      "Laporan laba rugi sederhana",
    ],
  },
};

const METODE = ["Transfer Bank", "Virtual Account", "Autodebet", "QRIS"] as const;
type Metode = (typeof METODE)[number];

type Pinjaman = {
  id: string;
  mitra: string;
  produk: JenisProduk;
  pokok: number;
  bungaPa: number;
  tenor: number;
  dibayar: number; // jumlah cicilan yang sudah dibayar
  mulai: string; // YYYY-MM-DD pencairan
  status: "Diproses" | "Berjalan" | "Lunas";
  metode: Metode;
};

// Cicilan anuitas: P × r / (1 − (1 + r)^−n)
function cicilan(pokok: number, bungaPa: number, tenor: number) {
  const r = bungaPa / 100 / 12;
  if (r === 0) return pokok / tenor;
  return (pokok * r) / (1 - Math.pow(1 + r, -tenor));
}

function sisaPokok(p: Pinjaman) {
  const r = p.bungaPa / 100 / 12;
  const c = cicilan(p.pokok, p.bungaPa, p.tenor);
  const k = p.dibayar;
  if (r === 0) return Math.max(0, p.pokok - c * k);
  return Math.max(0, p.pokok * Math.pow(1 + r, k) - (c * (Math.pow(1 + r, k) - 1)) / r);
}

function tambahBulan(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const STORAGE = "catalys_portofolio_v1";
const bulanLalu = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const AWAL: Pinjaman[] = [
  { id: "ln-1", mitra: "Bank Maju - KUR", produk: "KUR", pokok: 30_000_000, bungaPa: 6, tenor: 24, dibayar: 9, mulai: bulanLalu(9), status: "Berjalan", metode: "Autodebet" },
  { id: "ln-2", mitra: "MitraKita - Modal Kerja", produk: "Modal Kerja Mikro", pokok: 10_000_000, bungaPa: 15, tenor: 12, dibayar: 4, mulai: bulanLalu(4), status: "Berjalan", metode: "Virtual Account" },
  { id: "ln-3", mitra: "DanaCepat - Pembiayaan Invoice", produk: "Pembiayaan Invoice", pokok: 8_000_000, bungaPa: 13, tenor: 6, dibayar: 6, mulai: bulanLalu(14), status: "Lunas", metode: "Transfer Bank" },
];

function Permodalan() {
  usePageTitle("Permodalan");
  const { toast } = useToast();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const preScreenLimit = 50_000_000;
  const [amount, setAmount] = useState<number>(20_000_000);
  const [tenor, setTenor] = useState<number>(12);
  type Purpose = "Modal Kerja" | "Investasi Alat" | "Operasional" | "Pembiayaan Invoice";
  const [purpose, setPurpose] = useState<Purpose>("Modal Kerja");
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const [pengajuan, setPengajuan] = useState<LoanProduct | null>(null);
  const [setuju, setSetuju] = useState(false);
  const [portofolio, setPortofolio] = useState<Pinjaman[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) return JSON.parse(raw);
    } catch {
      // abaikan
    }
    return AWAL;
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(portofolio));
    } catch {
      // abaikan
    }
  }, [portofolio]);

  const filtered = useMemo(
    () =>
      loanProducts
        .map((p) => {
          let score = 100;
          if (p.maxTenorMonths < tenor) score -= 25;
          if (purpose === "Pembiayaan Invoice" && p.productType !== "Pembiayaan Invoice") score -= 15;
          if (purpose === "Modal Kerja" && p.productType === "Pembiayaan Invoice") score -= 10;
          if (purpose === "Investasi Alat" && p.productType !== "KUR") score -= 10;
          // bunga lebih rendah lebih cocok
          score -= Math.round(p.interestPa / 3);
          score = Math.max(40, Math.min(100, score));
          const tenorEfektif = Math.min(tenor, p.maxTenorMonths);
          const c = cicilan(amount, p.interestPa, tenorEfektif);
          return { ...p, matchScore: score, tenorEfektif, cicilan: c, totalBunga: c * tenorEfektif - amount };
        })
        .sort((a, b) => b.matchScore - a.matchScore),
    [amount, tenor, purpose],
  );

  // ---------- jurnal otomatis ----------
  const akun = (code: string) => accounts.find((a) => a.code === code)?.id;
  const catatJurnal = (description: string, lines: [string | undefined, "debit" | "credit", number][]) => {
    if (lines.some(([a]) => !a)) return;
    const now = Date.now();
    setEntries([
      {
        id: `pinjaman-${now}`,
        date: new Date().toISOString().slice(0, 10),
        description,
        lines: lines.map(([accountId, side, amount], i) => ({ id: `${now}-${i}`, side, accountId: accountId!, amount: Math.round(amount) })),
      },
      ...entries,
    ]);
  };

  const kirimPengajuan = () => {
    if (!pengajuan) return;
    const p = filtered.find((x) => x.id === pengajuan.id)!;
    setPortofolio((prev) => [
      {
        id: `ln-${Date.now()}`,
        mitra: p.name,
        produk: p.productType,
        pokok: amount,
        bungaPa: p.interestPa,
        tenor: p.tenorEfektif,
        dibayar: 0,
        mulai: new Date().toISOString().slice(0, 10),
        status: "Diproses",
        metode: "Transfer Bank",
      },
      ...prev,
    ]);
    toast(`Pengajuan ke ${p.name} terkirim. Estimasi proses ${p.processingDays} hari kerja.`);
    rayakan();
    setPengajuan(null);
    setSetuju(false);
  };

  const setujui = (l: Pinjaman) => {
    setPortofolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "Berjalan", mulai: new Date().toISOString().slice(0, 10) } : x)));
    catatJurnal(`Pencairan pinjaman ${l.mitra}`, [
      [akun("1.1.1.02") ?? akun("1.1.1.01"), "debit", l.pokok],
      [akun("2.2.2.01"), "credit", l.pokok],
    ]);
    toast("Pinjaman disetujui dan dana dicairkan (simulasi)");
    rayakan("besar");
  };

  const bayarCicilan = (l: Pinjaman) => {
    const c = cicilan(l.pokok, l.bungaPa, l.tenor);
    const bunga = sisaPokok(l) * (l.bungaPa / 100 / 12);
    const pokok = c - bunga;
    const selesai = l.dibayar + 1 >= l.tenor;
    setPortofolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, dibayar: x.dibayar + 1, status: selesai ? "Lunas" : x.status } : x)));
    catatJurnal(`Cicilan ke-${l.dibayar + 1} ${l.mitra} via ${l.metode}`, [
      [akun("2.2.2.01"), "debit", pokok],
      [akun("9.2.2.01"), "debit", bunga],
      [akun("1.1.1.02") ?? akun("1.1.1.01"), "credit", Math.round(pokok) + Math.round(bunga)],
    ]);
    toast(`Cicilan ${formatRp(Math.round(c))} dibayar via ${l.metode}${selesai ? ". Pinjaman lunas!" : ""}`);
  };

  const lunasi = (l: Pinjaman) => {
    const sisa = Math.round(sisaPokok(l));
    if (!confirm(`Lunasi sekarang sebesar ${formatRp(sisa)} via ${l.metode}?`)) return;
    setPortofolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, dibayar: x.tenor, status: "Lunas" } : x)));
    catatJurnal(`Pelunasan dipercepat ${l.mitra} via ${l.metode}`, [
      [akun("2.2.2.01"), "debit", sisa],
      [akun("1.1.1.02") ?? akun("1.1.1.01"), "credit", sisa],
    ]);
    toast("Pinjaman berhasil dilunasi");
    rayakan("besar");
  };

  const aktif = portofolio.filter((l) => l.status === "Berjalan");
  const totalSisa = aktif.reduce((s, l) => s + sisaPokok(l), 0);
  const totalCicilan = aktif.reduce((s, l) => s + cicilan(l.pokok, l.bungaPa, l.tenor), 0);

  const STATUS_CLS = {
    Diproses: "bg-amber-50 text-amber-700 ring-amber-200",
    Berjalan: "bg-blue-50 text-blue-700 ring-blue-200",
    Lunas: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  const pilihan = pengajuan ? filtered.find((x) => x.id === pengajuan.id) : undefined;

  return (
    <div className="max-w-[80rem] mx-auto">
      <p className="text-sm text-gray-600 mb-6">
        Catalys bukan pemberi pinjaman. Kami penghubung tepercaya ke mitra legal (bank dan P2P berizin OJK) dengan rekomendasi berbasis data untuk
        melindungi UMKM dari pinjaman ilegal.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="card-elegant lg:col-span-5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Kesehatan Keuangan & Limit</h2>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Berdasarkan performa keuangan kuartal terakhir, Anda layak mendapatkan pendanaan hingga:</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-800">{formatRp(preScreenLimit)}</p>
            <span className="mt-3 inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border border-blue-300 bg-white text-blue-700">
              <ShieldCheck className="w-4 h-4" /> Data terverifikasi Sistem Audit Catalys
            </span>
          </div>
          {aktif.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Sisa pinjaman berjalan {formatRp(Math.round(totalSisa))}. Total cicilan per bulan {formatRp(Math.round(totalCicilan))}.
            </p>
          )}
        </section>

        <section className="card-elegant lg:col-span-7 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Simulasi Pinjaman</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700 mb-1">Nominal dana yang dibutuhkan</p>
              <input type="range" min={1_000_000} max={preScreenLimit} step={500_000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full" />
              <p className="mt-1 text-sm font-semibold text-primary">{formatRp(amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-1">Tenor (jangka waktu)</p>
              <select className="border rounded-lg px-3 py-2 w-full" value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>
                {[6, 12, 24, 36].map((t) => (
                  <option key={t} value={t}>
                    {t} bulan
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-700 mb-1">Tujuan pembiayaan</p>
              <select className="border rounded-lg px-3 py-2 w-full" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                <option>Modal Kerja</option>
                <option>Investasi Alat</option>
                <option>Operasional</option>
                <option>Pembiayaan Invoice</option>
              </select>
            </div>
            {filtered[0] && (
              <div className="md:col-span-2 rounded-xl bg-primary/5 p-3 text-sm">
                Rekomendasi terbaik <b>{filtered[0].name}</b>: cicilan sekitar <b>{formatRp(Math.round(filtered[0].cicilan))}</b>/bulan selama{" "}
                {filtered[0].tenorEfektif} bulan, total bunga {formatRp(Math.round(filtered[0].totalBunga))}.
              </div>
            )}
          </div>
        </section>

        <section className="card-elegant lg:col-span-12 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Mitra yang Direkomendasikan</h2>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Sebelumnya"
              onClick={() => carouselRef.current?.scrollBy({ left: -Math.floor((carouselRef.current?.clientWidth ?? 0) * 0.8), behavior: "smooth" })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md border hidden md:inline-flex"
            >
              ‹
            </button>
            <div ref={carouselRef} className="flex gap-6 overflow-x-auto scroll-smooth py-2 px-1 snap-x snap-mandatory" role="list">
              {filtered.map((p) => (
                <div key={p.id} role="listitem" className="card-elegant snap-start flex-shrink-0 w-[90%] sm:w-[70%] md:w-80 lg:w-96 overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b">
                    <img src={p.logo} alt={p.name} className="w-10 h-10 rounded" />
                    <div className="min-w-0">
                      <p className="font-semibold text-primary truncate">{p.name}</p>
                      <p className="text-xs text-gray-600">Terdaftar & diawasi OJK · {p.partnerType}</p>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="inline-flex items-center gap-1">
                      <Percent className="w-4 h-4 text-blue-700" /> Bunga {p.interestPa}% p.a.
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-700" /> Tenor maks. {p.maxTenorMonths} bln
                    </div>
                    <div className="inline-flex items-center gap-1 col-span-2">
                      <Info className="w-4 h-4 text-blue-700" /> Proses {p.processingDays} hari · cicilan ±{formatRp(Math.round(p.cicilan))}/bln
                    </div>
                    {p.maxTenorMonths < tenor && (
                      <p className="col-span-2 text-xs text-amber-700">Tenor dibatasi {p.maxTenorMonths} bulan oleh mitra.</p>
                    )}
                    <div className="col-span-2 mt-1">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">Kecocokan {p.matchScore}%</span>
                    </div>
                    <button
                      onClick={() => {
                        setSetuju(false);
                        setPengajuan(p);
                      }}
                      className="col-span-2 mt-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-95"
                    >
                      Ajukan
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Berikutnya"
              onClick={() => carouselRef.current?.scrollBy({ left: Math.floor((carouselRef.current?.clientWidth ?? 0) * 0.8), behavior: "smooth" })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md border hidden md:inline-flex"
            >
              ›
            </button>
          </div>
        </section>

        {/* Portofolio pinjaman */}
        <section className="card-elegant lg:col-span-12 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-semibold">Portofolio Pinjaman</h2>
            </div>
            <p className="text-sm text-gray-500">
              {aktif.length} berjalan · {portofolio.filter((l) => l.status === "Lunas").length} lunas · {portofolio.filter((l) => l.status === "Diproses").length} diproses
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {portofolio.map((l) => {
              const c = cicilan(l.pokok, l.bungaPa, l.tenor);
              const sisa = sisaPokok(l);
              const pct = (l.dibayar / l.tenor) * 100;
              return (
                <div key={l.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{l.mitra}</p>
                      <p className="text-xs text-gray-500">
                        {l.produk} · bunga {l.bungaPa}% p.a.
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_CLS[l.status]}`}>{l.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-gray-500">Pokok</p>
                      <p className="font-semibold">{formatRp(l.pokok)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Tenor</p>
                      <p className="font-semibold">{l.tenor} bulan</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Cicilan/bulan</p>
                      <p className="font-semibold">{formatRp(Math.round(c))}</p>
                    </div>
                  </div>
                  {l.status !== "Diproses" && (
                    <>
                      <div className="mt-3 flex justify-between text-xs text-gray-600">
                        <span>
                          Terbayar {l.dibayar}/{l.tenor} cicilan
                        </span>
                        <span>Sisa pokok {formatRp(Math.round(sisa))}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${l.status === "Lunas" ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                  {l.status === "Berjalan" && (
                    <>
                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5" /> Jatuh tempo berikutnya {tambahBulan(l.mulai, l.dibayar + 1)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={l.metode}
                          onChange={(e) => setPortofolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, metode: e.target.value as Metode } : x)))}
                          className="border rounded-lg px-2 py-1.5 text-sm"
                          aria-label="Metode pembayaran"
                        >
                          {METODE.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                        <button onClick={() => bayarCicilan(l)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
                          Bayar Cicilan
                        </button>
                        <button onClick={() => lunasi(l)} className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary">
                          Lunasi Sekarang
                        </button>
                      </div>
                    </>
                  )}
                  {l.status === "Diproses" && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">Diajukan {new Date(l.mulai).toLocaleDateString("id-ID")}, menunggu verifikasi mitra.</p>
                      <button onClick={() => setujui(l)} className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                        Setujui (demo)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">Pencairan, cicilan, dan pelunasan otomatis dicatat sebagai jurnal (utang bank, beban bunga, kas).</p>
        </section>

        <section className="lg:col-span-12 rounded-2xl p-4 border border-blue-200 bg-blue-50">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <p className="text-sm text-blue-800">Catalys hanya bermitra dengan lembaga legal. Hindari pinjaman online ilegal yang tidak terdaftar di OJK.</p>
          </div>
        </section>
      </div>

      <Modal isOpen={!!pengajuan} onClose={() => setPengajuan(null)} title="Ajukan Pembiayaan" wide>
        {pengajuan && pilihan && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img src={pengajuan.logo} alt="" className="w-12 h-12 rounded" />
              <div>
                <p className="font-semibold text-primary">{pengajuan.name}</p>
                <p className="text-xs text-gray-500">
                  {pengajuan.productType} · {pengajuan.partnerType} berizin OJK
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Deskripsi</p>
              <p className="text-sm text-gray-700">{DESKRIPSI[pengajuan.productType].teks}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Persyaratan
              </p>
              <ul className="space-y-1.5">
                {DESKRIPSI[pengajuan.productType].syarat.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-primary/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-gray-500">Nominal</p>
                <p className="font-semibold">{formatRp(amount)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Tenor</p>
                <p className="font-semibold">{pilihan.tenorEfektif} bulan</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Cicilan/bulan</p>
                <p className="font-semibold">{formatRp(Math.round(pilihan.cicilan))}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Total bunga</p>
                <p className="font-semibold">{formatRp(Math.round(pilihan.totalBunga))}</p>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} className="mt-1" />
              Saya menyetujui data usaha dan laporan keuangan di Catalys dibagikan ke {pengajuan.name} untuk keperluan analisis kredit.
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPengajuan(null)} className="rounded-full border px-4 py-2 text-sm">
                Batal
              </button>
              <button disabled={!setuju} onClick={kirimPengajuan} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Kirim Pengajuan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Permodalan;
