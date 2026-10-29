import { useEffect, useMemo, useState } from "react";
import { Trophy, Medal, Wallet, Brain, CheckCircle2, Users, Phone, Search, Plus, Trash2, Target, Banknote, Building2 } from "lucide-react";
import { useBusinessSector } from "../../context/BusinessSectorContext";
import { useJournal } from "../../context/JournalContext";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useToast } from "../../context/ToastContext";
import { useAccount } from "../../context/AccountContext";
import BrandIcon from "../../components/BrandIcon";
import AngkaBerjalan from "../../components/AngkaBerjalan";
import Modal from "../../components/Modal";
import {
  hitungGaji,
  karyawanSektor,
  progresKpi,
  skorKaryawan,
  POTONGAN_BPJS,
  unitKerja,
  type Karyawan,
  type KpiKaryawan,
} from "../../data/internal";
import { formatRp, formatRpSingkat, NAMA_BULAN } from "../../data/laporan";
import { rayakan } from "../../utils/efek";

function Gauge({ value }: { value: number }) {
  const size = 110;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e1ecf3" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#2f6b8f"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-primary" style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </text>
    </svg>
  );
}

// Status kehadiran hari ini dari jam masuk/pulang (jam kerja mulai 08:00, toleransi 5 menit)
function statusHadir(k: Karyawan): { label: string; cls: string } {
  if (!k.masuk) return { label: "Belum hadir", cls: "bg-gray-100 text-gray-500" };
  if (k.masuk > "08:05") return { label: "Terlambat", cls: "bg-[#e1ecf3] text-[#5487ab] ring-1 ring-[#9cb2c1]" };
  if (!k.pulang) return { label: "Sedang bekerja", cls: "bg-[#e1ecf3] text-[#2f6b8f]" };
  return { label: "Tepat waktu", cls: "bg-primary text-white" };
}

const inisial = (n: string) =>
  n
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);

// Foto profil; bila gagal dimuat, tampilkan inisial
function Foto({ k, ukuran = "w-10 h-10", className = "" }: { k: Karyawan; ukuran?: string; className?: string }) {
  const [gagal, setGagal] = useState(false);
  return gagal ? (
    <span className={`${ukuran} shrink-0 rounded-full chip-gradient text-xs font-bold flex items-center justify-center ${className}`}>{inisial(k.nama)}</span>
  ) : (
    <img src={k.foto} alt={k.nama} onError={() => setGagal(true)} className={`${ukuran} shrink-0 rounded-full object-cover ${className}`} />
  );
}

function BatangProgres({ nilai, tebal = "h-2" }: { nilai: number; tebal?: string }) {
  return (
    <div className={`${tebal} w-full rounded-full bg-[#e1ecf3] overflow-hidden`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2f6b8f] to-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, nilai))}%` }}
      />
    </div>
  );
}

const KUNCI_SIMPAN = (sector: string) => `catalys_karyawan_v2_${sector}`;

export default function TabPenggajian() {
  const { sector } = useBusinessSector();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { toast } = useToast();

  const { cabangList } = useAccount();
  const UNIT_KERJA = unitKerja(cabangList.map((c) => c.nama));

  // data karyawan bisa diubah (KPI, gaji), jadi disimpan per sektor di browser
  const [tersimpan, setKaryawan] = useState<Karyawan[]>(() => {
    try {
      const raw = localStorage.getItem(KUNCI_SIMPAN(sector));
      if (raw) return JSON.parse(raw);
    } catch {
      // abaikan
    }
    return [];
  });
  // gabungkan dengan karyawan contoh unit yang baru dibuka; unit yang tidak ada lagi diabaikan
  const karyawan = useMemo(() => {
    const contoh = karyawanSektor(sector, UNIT_KERJA);
    const ada = new Set(tersimpan.map((k) => k.id));
    return [...tersimpan.filter((k) => UNIT_KERJA.includes(k.unit)), ...contoh.filter((k) => !ada.has(k.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tersimpan, sector, UNIT_KERJA.join("|")]);
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_SIMPAN(sector), JSON.stringify(karyawan));
    } catch {
      // abaikan
    }
  }, [karyawan, sector]);

  const [unit, setUnit] = useState("semua");
  const [cari, setCari] = useState("");
  const [dipilihId, setDipilihId] = useState<string | null>(null);
  const dipilih = karyawan.find((k) => k.id === dipilihId) ?? null;

  const bulan = new Date().getMonth();
  const tahun = new Date().getFullYear();
  const kodePeriode = `${tahun}-${String(bulan + 1).padStart(2, "0")}`;
  const idGaji = (k: Karyawan) => `gaji-${kodePeriode}-${k.id}`;
  const sudahCair = (k: Karyawan) => entries.some((e) => e.id === idGaji(k));

  const terfilter = karyawan.filter(
    (k) => (unit === "semua" || k.unit === unit) && `${k.nama} ${k.jabatan}`.toLowerCase().includes(cari.toLowerCase()),
  );
  const rincian = terfilter.map((k) => ({ ...k, ...hitungGaji(k), skor: skorKaryawan(k), progres: progresKpi(k.kpi) }));
  const total = rincian.reduce(
    (s, k) => ({ bruto: s.bruto + k.bruto, potongan: s.potongan + k.potongan, neto: s.neto + k.neto }),
    { bruto: 0, potongan: 0, neto: 0 },
  );
  const peringkat = [...rincian].sort((a, b) => b.skor - a.skor);
  const juara = peringkat[0];
  const hadir = terfilter.filter((k) => k.masuk).length;
  const jumlahCair = terfilter.filter(sudahCair).length;
  const jumlah = terfilter.length;
  // format "x / total" untuk kartu ringkasan
  const fmtPerOrang = (v: number) => `${v} / ${jumlah}`;

  const jumlahPerUnit = useMemo(() => {
    const m: Record<string, number> = {};
    karyawan.forEach((k) => (m[k.unit] = (m[k.unit] || 0) + 1));
    return m;
  }, [karyawan]);

  // ---------- ubah data satu karyawan ----------
  const ubah = (id: string, perubahan: Partial<Karyawan>) =>
    setKaryawan(() =>
      karyawan.map((k) => {
        if (k.id !== id) return k;
        const baru = { ...k, ...perubahan };
        return { ...baru, target: progresKpi(baru.kpi) };
      }),
    );
  const ubahKpi = (k: Karyawan, kpiId: string, p: Partial<KpiKaryawan>) =>
    ubah(k.id, { kpi: k.kpi.map((x) => (x.id === kpiId ? { ...x, ...p } : x)) });
  const tambahKpi = (k: Karyawan) =>
    ubah(k.id, { kpi: [...k.kpi, { id: `kpi-${Date.now()}`, nama: "KPI baru", target: 100, capaian: 0, satuan: "%", bobot: 10 }] });
  const hapusKpi = (k: Karyawan, kpiId: string) => ubah(k.id, { kpi: k.kpi.filter((x) => x.id !== kpiId) });

  // ---------- cairkan gaji per orang ----------
  const cairkan = (k: Karyawan) => {
    const id = (code: string) => accounts.find((a) => a.code === code)?.id;
    const beban = id("6.1.1.01");
    const kas = id("1.1.1.02") ?? id("1.1.1.01");
    const utang = id("2.1.5.01");
    if (!beban || !kas || !utang) return toast("Akun beban gaji / kas / utang gaji tidak ditemukan di Bagan Akun", "peringatan");
    const g = hitungGaji(k);
    const now = idGaji(k);
    setEntries([
      {
        id: idGaji(k),
        date: `${kodePeriode}-${String(Math.min(25, new Date().getDate())).padStart(2, "0")}`,
        description: `Gaji ${k.nama} (${k.unit}) ${NAMA_BULAN[bulan]} ${tahun}`,
        lines: [
          { id: `${now}-1`, side: "debit", accountId: beban, amount: g.bruto },
          { id: `${now}-2`, side: "credit", accountId: kas, amount: g.neto },
          // potongan BPJS ditahan dulu sebagai utang sampai disetor
          { id: `${now}-3`, side: "credit", accountId: utang, amount: g.potongan },
        ],
      },
      ...entries,
    ]);
    toast(`Gaji ${k.nama} sebesar ${formatRp(g.neto)} dicairkan, jurnal dibuat`);
    rayakan();
  };

  const medali = ["text-white", "text-white/80", "text-white/60"];
  const input = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Filter unit kerja */}
      <section className="lg:col-span-12 card-elegant p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary shrink-0">
          <Building2 className="w-4 h-4" /> Unit kerja
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {["semua", ...UNIT_KERJA].map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                unit === u ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-[#9cb2c1]"
              }`}
            >
              {u === "semua" ? "Semua unit" : u.replace("Cabang ", "")}
              <span className={`ml-1.5 ${unit === u ? "text-white/70" : "text-gray-400"}`}>
                {u === "semua" ? karyawan.length : jumlahPerUnit[u] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <label className="relative md:w-56">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama / jabatan" className="w-full rounded-full border border-gray-200 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15" />
        </label>
      </section>

      {/* Ringkasan */}
      <section className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            ["Karyawan hadir hari ini", hadir, Users, "grad-navy", fmtPerOrang],
            ["Total gaji bruto", total.bruto, Wallet, "grad-ocean", formatRpSingkat],
            ["Gaji bersih (setelah BPJS)", total.neto, Wallet, "grad-indigo", formatRpSingkat],
            ["Gaji sudah dicairkan", jumlahCair, Banknote, "grad-steel", fmtPerOrang],
          ] as const
        ).map(([k, v, Icon, grad, fmt]) => (
          <div key={k} className={`card-gradient ${grad} p-4`}>
            <div className="relative flex items-center justify-between">
              <p className="text-xs text-white/75">{k}</p>
              <Icon className="w-4 h-4 text-white/80" />
            </div>
            <p className="relative mt-1 text-xl font-bold">
              <AngkaBerjalan nilai={v} format={fmt} />
            </p>
          </div>
        ))}
      </section>

      {/* Kiri: leaderboard */}
      <section className="lg:col-span-4 card-gradient grad-navy p-6">
        <div className="relative flex items-center gap-2">
          <Trophy className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold">Leaderboard</h2>
        </div>
        <p className="relative text-xs text-white/70 mt-1">
          Skor = kinerja 50% + kehadiran 30% + capaian KPI 20%. {NAMA_BULAN[bulan]} {tahun}.
        </p>
        <ol className="relative mt-4 space-y-2">
          {peringkat.slice(0, 8).map((k, i) => (
            <li key={k.id}>
              <button
                onClick={() => setDipilihId(k.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/25 ${i < 3 ? "bg-white/15" : "bg-white/5"}`}
              >
                <span className="w-5 text-center font-bold">{i < 3 ? <Medal className={`w-5 h-5 inline ${medali[i]}`} /> : i + 1}</span>
                <Foto k={k} ukuran="w-8 h-8" className="ring-2 ring-white/30" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{k.nama}</span>
                  <span className="block text-[11px] text-white/60 truncate">{k.unit.replace("Cabang ", "")}</span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-extrabold">{k.skor}</span>
                  <span className="block text-[10px] text-white/60">poin</span>
                </span>
              </button>
            </li>
          ))}
          {peringkat.length === 0 && <li className="text-sm text-white/70">Tidak ada karyawan di filter ini.</li>}
        </ol>
      </section>

      {/* Kanan: kartu karyawan */}
      <section data-tour="sdm" className="lg:col-span-8 card-elegant p-6 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Karyawan & Progres KPI</h2>
            <p className="text-xs text-gray-500">Klik kartu untuk mengatur KPI, gaji, dan mencairkan gaji.</p>
          </div>
          <span className="text-xs text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rincian.map((k) => {
            const st = statusHadir(k);
            return (
              <button
                key={k.id}
                onClick={() => setDipilihId(k.id)}
                className="rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-[#9cb2c1] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <Foto k={k} ukuran="w-12 h-12" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{k.nama}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {k.jabatan} · {k.unit}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500">Progres KPI ({k.kpi.length} indikator)</span>
                    <span className="font-bold text-primary">{k.progres}%</span>
                  </div>
                  <BatangProgres nilai={k.progres} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    Masuk {k.masuk || "—"} · Pulang {k.pulang || "—"}
                  </span>
                  {sudahCair(k) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Gaji cair
                    </span>
                  ) : (
                    <span>Gaji {formatRpSingkat(k.neto)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabel gaji */}
      <section className="lg:col-span-8 card-elegant p-6 min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Daftar Gaji {NAMA_BULAN[bulan]} {tahun}
          </h2>
          <p className="text-xs text-gray-500">
            Potongan iuran BPJS pekerja {POTONGAN_BPJS * 100}% dari gaji pokok + tunjangan. Gaji dicairkan per orang.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3 font-medium">Nama</th>
                <th className="py-2 pr-3 font-medium text-right">Bruto</th>
                <th className="py-2 pr-3 font-medium text-right">Potongan</th>
                <th className="py-2 pr-3 font-medium text-right">Diterima</th>
                <th className="py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rincian.map((k) => (
                <tr key={k.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3">
                    <button onClick={() => setDipilihId(k.id)} className="flex items-center gap-2 text-left">
                      <Foto k={k} ukuran="w-7 h-7" />
                      <span>
                        <span className="block font-medium text-gray-800 hover:text-primary">{k.nama}</span>
                        <span className="block text-[11px] text-gray-500">{k.unit}</span>
                      </span>
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatRp(k.bruto)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-500">{formatRp(-k.potongan)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-primary">{formatRp(k.neto)}</td>
                  <td className="py-2 text-right">
                    {sudahCair(k) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e1ecf3] px-2.5 py-1 text-xs font-semibold text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cair
                      </span>
                    ) : (
                      <button
                        onClick={() => confirm(`Cairkan gaji ${k.nama} sebesar ${formatRp(k.neto)}?`) && cairkan(k)}
                        className="rounded-full btn-gradient px-3 py-1 text-xs font-semibold"
                      >
                        Cairkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#e1ecf3] font-bold">
                <td className="py-2 pr-3 pl-1">Total</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(total.bruto)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(-total.potongan)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(total.neto)}</td>
                <td className="py-2 pr-1 text-right text-xs font-semibold">
                  {jumlahCair}/{rincian.length} cair
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Kecocokan peran */}
      <section className="lg:col-span-4 card-elegant p-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Kecocokan Peran</h2>
        </div>
        {juara && (
          <div className="flex flex-col items-center text-center gap-2">
            <Foto k={juara} ukuran="w-16 h-16" className="ring-4 ring-[#e1ecf3]" />
            <Gauge value={juara.kinerja} />
            <p className="font-bold text-gray-900 text-lg">{juara.nama}</p>
            <p className="text-sm font-medium text-primary">
              {juara.jabatan} · {juara.unit}
            </p>
            <p className="text-sm text-gray-600">
              Kinerja {juara.kinerja}, kehadiran {juara.kehadiran}%, progres KPI {juara.progres}%. Direkomendasikan memimpin shift utama dan mendampingi karyawan dengan skor terendah.
            </p>
          </div>
        )}
      </section>

      {/* ---------- detail karyawan: KPI, gaji, pencairan ---------- */}
      <Modal isOpen={!!dipilih} onClose={() => setDipilihId(null)} title="Detail Karyawan" wide>
        {dipilih && (
          <div className="space-y-6">
            {(() => {
              const g = hitungGaji(dipilih);
              const progres = progresKpi(dipilih.kpi);
              const totalBobot = dipilih.kpi.reduce((s, x) => s + x.bobot, 0);
              const wa = "62" + dipilih.telepon.replace(/\D/g, "").slice(1);
              const cair = sudahCair(dipilih);
              return (
                <>
                  {/* profil */}
                  <div className="flex flex-wrap items-center gap-4">
                    <Foto k={dipilih} ukuran="w-20 h-20" className="ring-4 ring-[#e1ecf3]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold text-gray-900">{dipilih.nama}</p>
                      <p className="text-sm text-gray-600">
                        {dipilih.jabatan} · {dipilih.unit}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {dipilih.telepon}
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${dipilih.nama}`}>
                          <BrandIcon brand="whatsapp" size={14} />
                        </a>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-primary">{progres}%</p>
                      <p className="text-[11px] text-gray-500">progres KPI</p>
                    </div>
                  </div>

                  {/* KPI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Target className="w-4 h-4 text-primary" /> Indikator Kinerja (KPI)
                      </h4>
                      <button onClick={() => tambahKpi(dipilih)} className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5">
                        <Plus className="w-3.5 h-3.5" /> Tambah KPI
                      </button>
                    </div>
                    {totalBobot !== 100 && (
                      <p className="mb-2 rounded-lg bg-[#e1ecf3] px-3 py-1.5 text-xs text-primary">
                        Total bobot {totalBobot}%. Sebaiknya 100% agar progres mudah dibaca.
                      </p>
                    )}
                    <div className="space-y-3">
                      {dipilih.kpi.map((x) => {
                        const p = Math.round((x.capaian / (x.target || 1)) * 100);
                        return (
                          <div key={x.id} className="rounded-xl border border-gray-100 p-3">
                            <div className="flex items-center gap-2">
                              <input value={x.nama} onChange={(e) => ubahKpi(dipilih, x.id, { nama: e.target.value })} className={`${input} font-medium`} aria-label="Nama KPI" />
                              <button onClick={() => hapusKpi(dipilih, x.id)} aria-label="Hapus KPI" className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {(
                                [
                                  ["Capaian", "capaian"],
                                  ["Target", "target"],
                                  ["Satuan", "satuan"],
                                  ["Bobot %", "bobot"],
                                ] as const
                              ).map(([lbl, f]) => (
                                <label key={f} className="text-[11px] text-gray-500">
                                  {lbl}
                                  <input
                                    type={f === "satuan" ? "text" : "number"}
                                    min={0}
                                    step="any"
                                    value={x[f]}
                                    onChange={(e) => ubahKpi(dipilih, x.id, { [f]: f === "satuan" ? e.target.value : Number(e.target.value) })}
                                    className={`${input} mt-0.5`}
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <BatangProgres nilai={p} tebal="h-1.5" />
                              <span className="w-12 text-right text-xs font-bold text-primary">{p}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {dipilih.kpi.length === 0 && <p className="text-sm text-gray-400">Belum ada KPI. Tambahkan indikator pertama.</p>}
                    </div>
                  </div>

                  {/* gaji */}
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                      <Wallet className="w-4 h-4 text-primary" /> Pengaturan Gaji
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          ["Gaji pokok", "gajiPokok"],
                          ["Tunjangan", "tunjangan"],
                          ["Lembur bulan ini", "lembur"],
                        ] as const
                      ).map(([lbl, f]) => (
                        <label key={f} className="text-xs text-gray-500">
                          {lbl}
                          <input
                            type="number"
                            min={0}
                            step={50000}
                            value={dipilih[f]}
                            disabled={cair}
                            onChange={(e) => ubah(dipilih.id, { [f]: Math.max(0, Number(e.target.value)) })}
                            className={`${input} mt-0.5 disabled:bg-gray-50 disabled:text-gray-400`}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl bg-[#e1ecf3]/60 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bruto</span>
                        <span className="tabular-nums">{formatRp(g.bruto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Potongan BPJS ({POTONGAN_BPJS * 100}%)</span>
                        <span className="tabular-nums">{formatRp(-g.potongan)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#9cb2c1]/50 pt-1 font-bold text-primary">
                        <span>Diterima</span>
                        <span className="tabular-nums">{formatRp(g.neto)}</span>
                      </div>
                    </div>
                  </div>

                  {/* pencairan */}
                  {cair ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                      <CheckCircle2 className="w-5 h-5" /> Gaji {NAMA_BULAN[bulan]} {tahun} sudah dicairkan
                    </div>
                  ) : (
                    <button
                      onClick={() => confirm(`Cairkan gaji ${dipilih.nama} sebesar ${formatRp(g.neto)}?`) && cairkan(dipilih)}
                      className="btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                    >
                      <Banknote className="w-5 h-5" /> Cairkan Gaji {formatRp(g.neto)}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
