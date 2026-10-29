import { useMemo, useState } from "react";
import { Search, Trash2, CalendarDays, X } from "lucide-react";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useJournal, type JournalEntry } from "../../context/JournalContext";
import { evaluateAlerts } from "../../utils/jurnalAlerts";
import { formatRp, NAMA_BULAN } from "../../data/laporan";

const HARI_PER_HALAMAN = 7;
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function tanggalPanjang(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const totalDebit = (e: JournalEntry) => e.lines.reduce((s, l) => s + (l.side === "debit" ? l.amount : 0), 0);

export default function DaftarJurnal() {
  const { accounts } = useChartOfAccounts();
  const { entries, semuaJurnal, setEntries } = useJournal();
  const akun = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const [tahun, setTahun] = useState("semua");
  const [bulan, setBulan] = useState("semua");
  const [tanggal, setTanggal] = useState("");
  const [sumber, setSumber] = useState<"semua" | "input" | "contoh">("semua");
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);

  const tahunList = useMemo(() => Array.from(new Set(semuaJurnal.map((e) => e.date.slice(0, 4)))).sort().reverse(), [semuaJurnal]);
  const bulanList = useMemo(
    () =>
      tahun === "semua"
        ? []
        : Array.from(new Set(semuaJurnal.filter((e) => e.date.startsWith(tahun)).map((e) => e.date.slice(5, 7)))).sort(),
    [semuaJurnal, tahun],
  );

  const tersaring = useMemo(() => {
    const q = cari.toLowerCase();
    return semuaJurnal.filter((e) => {
      if (tanggal) {
        if (e.date !== tanggal) return false;
      } else {
        if (tahun !== "semua" && !e.date.startsWith(tahun)) return false;
        if (bulan !== "semua" && e.date.slice(5, 7) !== bulan) return false;
      }
      if (sumber === "input" && e.contoh) return false;
      if (sumber === "contoh" && !e.contoh) return false;
      if (!q) return true;
      return (
        (e.description || "").toLowerCase().includes(q) ||
        e.lines.some((l) => {
          const a = akun.get(l.accountId);
          return a ? (a.code + " " + a.name).toLowerCase().includes(q) : false;
        })
      );
    });
  }, [semuaJurnal, tahun, bulan, tanggal, sumber, cari, akun]);

  // dikelompokkan per tanggal
  const grup = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of tersaring) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [tersaring]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / HARI_PER_HALAMAN));
  const hal = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((hal - 1) * HARI_PER_HALAMAN, hal * HARI_PER_HALAMAN);
  const ubah = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setHalaman(1);
  };

  const pilih = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white";
  const adaFilter = tahun !== "semua" || tanggal || sumber !== "semua" || cari;

  return (
    <section className="card-elegant p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Daftar Jurnal</h3>
          <p className="text-sm text-gray-500">
            {tersaring.length.toLocaleString("id-ID")} jurnal dalam {grup.length.toLocaleString("id-ID")} hari ·{" "}
            {entries.length} input Anda, sisanya jurnal contoh 3 tahun terakhir
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <CalendarDays className="w-4 h-4 text-primary" />
        <select
          value={tahun}
          disabled={!!tanggal}
          onChange={(e) => {
            ubah(setTahun)(e.target.value);
            setBulan("semua");
          }}
          className={pilih}
          aria-label="Tahun"
        >
          <option value="semua">Semua tahun</option>
          {tahunList.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={bulan} disabled={tahun === "semua" || !!tanggal} onChange={(e) => ubah(setBulan)(e.target.value)} className={pilih} aria-label="Bulan">
          <option value="semua">Semua bulan</option>
          {bulanList.map((b) => (
            <option key={b} value={b}>
              {BULAN_PANJANG[Number(b) - 1]}
            </option>
          ))}
        </select>
        <input type="date" value={tanggal} onChange={(e) => ubah(setTanggal)(e.target.value)} className={pilih} aria-label="Tanggal tertentu" />
        <select value={sumber} onChange={(e) => ubah(setSumber)(e.target.value as typeof sumber)} className={pilih} aria-label="Sumber jurnal">
          <option value="semua">Semua jurnal</option>
          <option value="input">Input saya</option>
          <option value="contoh">Jurnal contoh</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={cari}
            onChange={(e) => ubah(setCari)(e.target.value)}
            placeholder="Cari keterangan atau akun..."
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-60 max-w-full"
          />
        </div>
        {adaFilter && (
          <button
            onClick={() => {
              setTahun("semua");
              setBulan("semua");
              setTanggal("");
              setSumber("semua");
              setCari("");
              setHalaman(1);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600"
          >
            <X className="w-3.5 h-3.5" /> Hapus filter
          </button>
        )}
      </div>

      {grup.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Tidak ada jurnal pada filter ini.</p>
      ) : (
        <div className="space-y-5">
          {grupHalaman.map(([tgl, daftar]) => (
            <div key={tgl} className="rounded-xl border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#e1ecf3]/60 px-4 py-2.5">
                <p className="font-semibold text-primary">{tanggalPanjang(tgl)}</p>
                <p className="text-xs text-gray-600">
                  {daftar.length} jurnal · total {formatRp(daftar.reduce((s, e) => s + totalDebit(e), 0))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 px-4 font-medium">Keterangan</th>
                      <th className="py-2 pr-4 font-medium">Akun</th>
                      <th className="py-2 pr-4 font-medium text-right">Debit</th>
                      <th className="py-2 pr-4 font-medium text-right">Kredit</th>
                      <th className="py-2 pr-4 font-medium">Pemeriksaan</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((e) => {
                      // jurnal contoh sudah dipastikan seimbang, pemeriksaan hanya untuk input pengguna
                      const alerts = e.contoh
                        ? []
                        : evaluateAlerts(e, { getAccount: (id) => (id ? akun.get(id) : undefined), existingEntries: entries.filter((x) => x.id !== e.id) });
                      const err = alerts.filter((a) => a.severity === "error").length;
                      const warn = alerts.filter((a) => a.severity === "warning").length;
                      return e.lines.map((l, i) => {
                        const a = akun.get(l.accountId);
                        return (
                          <tr key={`${e.id}-${l.id}`} className={`align-top ${i === 0 ? "border-t" : ""}`}>
                            <td className="py-2 px-4">
                              {i === 0 && (
                                <span className="flex flex-wrap items-center gap-1.5">
                                  {e.description || "-"}
                                  {e.contoh ? (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Contoh</span>
                                  ) : (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Input</span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 pr-4 ${l.side === "credit" ? "pl-6" : ""}`}>
                              {a ? `${a.code} — ${a.name}` : <span className="text-red-600">Akun tidak ditemukan</span>}
                            </td>
                            <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{l.side === "debit" ? formatRp(l.amount) : ""}</td>
                            <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{l.side === "credit" ? formatRp(l.amount) : ""}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {i === 0 && (
                                <span className="flex gap-1">
                                  {err > 0 && <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">{err} kesalahan</span>}
                                  {warn > 0 && <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">{warn} peringatan</span>}
                                  {err === 0 && warn === 0 && <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700">Seimbang</span>}
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {i === 0 && !e.contoh && (
                                <button
                                  onClick={() => {
                                    if (confirm("Hapus jurnal ini?")) setEntries(entries.filter((x) => x.id !== e.id));
                                  }}
                                  aria-label="Hapus jurnal"
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {grup.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-sm">
          <p className="text-gray-600">
            Hari {(hal - 1) * HARI_PER_HALAMAN + 1}–{Math.min(hal * HARI_PER_HALAMAN, grup.length)} dari {grup.length}
            {grupHalaman.length > 0 && (
              <span className="text-gray-400">
                {" "}
                ({grupHalaman[grupHalaman.length - 1][0].slice(8)} {NAMA_BULAN[Number(grupHalaman[grupHalaman.length - 1][0].slice(5, 7)) - 1]} –{" "}
                {grupHalaman[0][0].slice(8)} {NAMA_BULAN[Number(grupHalaman[0][0].slice(5, 7)) - 1]} {grupHalaman[0][0].slice(0, 4)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setHalaman(1)} disabled={hal === 1} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Terbaru
            </button>
            <button onClick={() => setHalaman(hal - 1)} disabled={hal === 1} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Sebelumnya
            </button>
            <span className="px-2 text-gray-700">
              Hal. {hal} / {totalHalaman}
            </span>
            <button onClick={() => setHalaman(hal + 1)} disabled={hal === totalHalaman} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Berikutnya
            </button>
            <button onClick={() => setHalaman(totalHalaman)} disabled={hal === totalHalaman} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Terlama
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
