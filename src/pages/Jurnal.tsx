import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Search, CheckCircle2, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLaporan } from "../hooks/useLaporan";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { useJournal, type JournalEntry, type JournalLine } from "../context/JournalContext";
import { useToast } from "../context/ToastContext";
import AccountInfoModal, { InfoButton, type AccountInfo } from "../components/AccountInfoModal";
import { evaluateAlerts } from "../utils/jurnalAlerts";
import DaftarJurnal from "./jurnal/DaftarJurnal";
import { getAccountDetails } from "../utils/akunInfo";
import { saranDebit, saranKredit, TEMPLAT_JURNAL, type TemplatJurnal } from "../utils/saranAkun";
import type { Account } from "../context/ChartOfAccountsContext";
import { formatRp, TAHUN_BERJALAN } from "../data/laporan";

type BarisUI = { id: string; accountId: string; amount: string };
const barisBaru = (p: string): BarisUI => ({ id: `${Date.now()}-${p}${Math.random()}`, accountId: "", amount: "" });


export default function Jurnal() {
  usePageTitle("Entri Jurnal");
  const { accounts } = useChartOfAccounts();
  const { entries, setEntries } = useJournal();
  const { toast } = useToast();
  const lap = useLaporan(TAHUN_BERJALAN);

  const findAccount = (id: string | undefined) => accounts.find((a) => a.id === id);

  const [langkah, setLangkah] = useState<1 | 2 | 3>(1);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [debit, setDebit] = useState<BarisUI[]>([barisBaru("d")]);
  const [kredit, setKredit] = useState<BarisUI[]>([barisBaru("c")]);
  const [cariAkun, setCariAkun] = useState("");
  const [tampilPeringatan, setTampilPeringatan] = useState(false);
  const [info, setInfo] = useState<AccountInfo | undefined>();
  const panelRef = useRef<HTMLDivElement | null>(null);


  const keBaris = (rows: BarisUI[], side: "debit" | "credit"): JournalLine[] =>
    rows
      .filter((l) => l.accountId && Number(l.amount) > 0)
      .map((l) => ({ id: l.id, side, accountId: l.accountId, amount: Number(l.amount) }));

  const draft = useMemo(
    () => ({ date: tanggal, description: keterangan, lines: [...keBaris(debit, "debit"), ...keBaris(kredit, "credit")] }),
    [tanggal, keterangan, debit, kredit],
  );

  const peringatanDraft = useMemo(
    () =>
      evaluateAlerts(draft, {
        currentAssetsTotal: lap.ringkasan.totalAset,
        currentCash: lap.neraca.kas,
        getAccount: findAccount,
        existingEntries: entries,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, lap, entries, accounts],
  );
  const adaError = peringatanDraft.some((a) => a.severity === "error");

  const totalDebit = debit.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalKredit = kredit.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const selisih = Math.abs(totalDebit - totalKredit);
  const seimbang = totalDebit > 0 && totalKredit > 0 && selisih < 0.0001;
  const adaDebit = debit.some((l) => l.accountId && Number(l.amount) > 0);
  const adaKredit = kredit.some((l) => l.accountId && Number(l.amount) > 0);

  const akunTersaring = accounts.filter((a) => (a.code + " " + a.name).toLowerCase().includes(cariAkun.toLowerCase()));

  // akun yang sudah dipakai di satu sisi tidak ditawarkan di sisi seberangnya
  const idDebit = useMemo(() => new Set(debit.map((r) => r.accountId).filter(Boolean)), [debit]);
  const idKredit = useMemo(() => new Set(kredit.map((r) => r.accountId).filter(Boolean)), [kredit]);
  const saranD = useMemo(() => saranDebit(keterangan, accounts, idKredit), [keterangan, accounts, idKredit]);
  const saranK = useMemo(
    () => saranKredit(debit.map((r) => findAccount(r.accountId)).filter((a): a is Account => !!a), accounts, idDebit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debit, accounts, idDebit],
  );

  const pasangAkun = (set: React.Dispatch<React.SetStateAction<BarisUI[]>>, accountId: string, prefix: string) =>
    set((rows) => {
      if (rows.some((r) => r.accountId === accountId)) return rows;
      const kosong = rows.find((r) => !r.accountId);
      return kosong ? rows.map((r) => (r.id === kosong.id ? { ...r, accountId } : r)) : [...rows, { ...barisBaru(prefix), accountId }];
    });

  const pakaiTemplat = (t: TemplatJurnal) => {
    const d = accounts.find((a) => a.code === t.debit);
    const k = accounts.find((a) => a.code === t.kredit);
    if (!d || !k) return toast("Akun untuk templat ini tidak ada di Bagan Akun", "peringatan");
    setKeterangan(t.keterangan);
    setDebit([{ ...barisBaru("d"), accountId: d.id }]);
    setKredit([{ ...barisBaru("c"), accountId: k.id }]);
    setLangkah(2);
    toast(`Templat "${t.nama}": Debit ${d.name}, Kredit ${k.name}. Isi nominalnya.`, "info");
  };

  const lanjut = () => {
    if (langkah === 2) {
      // nominal kredit diisi otomatis sama dengan total debit bila baru satu baris dan masih kosong
      setKredit((rows) => (rows.length === 1 && !rows[0].amount ? [{ ...rows[0], amount: String(totalDebit) }] : rows));
    }
    setLangkah((s) => (s + 1) as 1 | 2 | 3);
  };

  const reset = () => {
    setDebit([barisBaru("d")]);
    setKredit([barisBaru("c")]);
    setKeterangan("");
    setCariAkun("");
    setTampilPeringatan(false);
    setLangkah(1);
  };

  const posting = () => {
    if (adaError) {
      setTampilPeringatan(true);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    const entry: JournalEntry = {
      id: `${Date.now()}`,
      date: tanggal,
      description: keterangan.trim() || undefined,
      lines: draft.lines,
    };
    setEntries([entry, ...entries]);
    toast("Jurnal berhasil diposting dan masuk ke laporan keuangan");
    reset();
  };

  const tampilInfo = (accountId: string) => {
    const a = findAccount(accountId);
    if (!a) return toast("Pilih akun terlebih dahulu", "info");
    const d = getAccountDetails(a.code, a.name, a.type);
    setInfo({ code: a.code, name: a.name, description: d.description, example: d.example });
  };

  const editorBaris = (
    rows: BarisUI[],
    set: React.Dispatch<React.SetStateAction<BarisUI[]>>,
    sisi: "debit" | "kredit",
    saran: Account[],
    seberang: Set<string>,
  ) => {
    const idSaran = new Set(saran.map((a) => a.id));
    const lainnya = akunTersaring.filter((a) => !seberang.has(a.id) && !idSaran.has(a.id));
    return (
    <div className="space-y-2">
      {saran.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 mb-2">
            <Lightbulb className="w-3.5 h-3.5" /> Akun {sisi} yang biasanya dipakai
          </p>
          <div className="flex flex-wrap gap-1.5">
            {saran.map((a) => {
              const dipakai = rows.some((r) => r.accountId === a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={dipakai}
                  onClick={() => pasangAkun(set, a.id, sisi[0])}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                    dipakai ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {a.code} {a.name}
                </button>
              );
            })}
          </div>
          {sisi === "kredit" && saranK.alasan.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-blue-900/80">
              {saranK.alasan.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            value={row.accountId}
            onChange={(e) => set((p) => p.map((r) => (r.id === row.id ? { ...r, accountId: e.target.value } : r)))}
            className="min-w-0 flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pilih akun {sisi}</option>
            {saran.length > 0 && (
              <optgroup label="Disarankan">
                {saran.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={saran.length > 0 ? "Akun lain" : "Semua akun"}>
              {lainnya.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </optgroup>
          </select>
          <InfoButton onClick={() => tampilInfo(row.accountId)} />
          <input
            type="number"
            min={0}
            value={row.amount}
            onChange={(e) => set((p) => p.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
            placeholder="Nominal"
            className="w-full sm:w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {rows.length > 1 && (
            <button
              type="button"
              aria-label="Hapus baris"
              onClick={() => set((p) => p.filter((r) => r.id !== row.id))}
              className="p-2 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => set((p) => [...p, barisBaru(sisi[0])])}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="w-4 h-4" /> Tambah baris {sisi}
      </button>
      {seberang.size > 0 && (
        <p className="text-[11px] text-gray-400">Akun yang sudah dipakai di sisi {sisi === "debit" ? "kredit" : "debit"} tidak ditampilkan di sini.</p>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/financial" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan Keuangan
          </Link>
          <h2 className="text-2xl font-bold text-primary mt-1">Entri Jurnal</h2>
          <p className="text-sm text-gray-500">
            Jurnal yang diposting langsung memengaruhi Neraca, Laba Rugi, dan Arus Kas.
          </p>
        </div>
      </div>

      {/* Formulir jurnal */}
      <section className="card-elegant p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          {(
            [
              [1, "Informasi"],
              [2, "Akun Debit"],
              [3, "Akun Kredit & Tinjau"],
            ] as const
          ).map(([step, label]) => {
            const aktif = langkah === step;
            const nonaktif = (step === 2 && !tanggal) || (step === 3 && !adaDebit);
            return (
              <button
                key={step}
                type="button"
                onClick={() => !nonaktif && setLangkah(step)}
                disabled={nonaktif}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  aktif ? "bg-primary text-white" : "border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${aktif ? "bg-white/20" : "bg-gray-100"}`}>
                  {step}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {tampilPeringatan && peringatanDraft.length > 0 && (
          <div ref={panelRef} className="mb-4 space-y-2">
            {peringatanDraft.map((a, idx) => (
              <div
                key={idx}
                className={
                  a.severity === "error"
                    ? "border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm"
                    : a.severity === "warning"
                      ? "border border-yellow-200 bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm"
                      : "border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-sm"
                }
              >
                {a.message}
              </div>
            ))}
          </div>
        )}

        {langkah === 1 && (
          <div className="mb-5 rounded-xl border bg-gray-50/70 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Zap className="w-4 h-4 text-amber-500" /> Transaksi umum
            </p>
            <p className="text-xs text-gray-500 mb-2">Pilih jenis transaksi: akun debit & kredit terisi otomatis, tinggal isi nominal.</p>
            <select
              value=""
              onChange={(e) => {
                const t = TEMPLAT_JURNAL.find((x) => x.nama === e.target.value);
                if (t) pakaiTemplat(t);
              }}
              className="w-full md:w-96 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/15"
              aria-label="Pilih transaksi umum"
            >
              <option value="" disabled>
                Pilih transaksi umum…
              </option>
              {TEMPLAT_JURNAL.map((t) => {
                const d = accounts.find((x) => x.code === t.debit);
                const k = accounts.find((x) => x.code === t.kredit);
                return (
                  <option key={t.nama} value={t.nama}>
                    {d && k ? `${t.nama} (D: ${d.name} · K: ${k.name})` : t.nama}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {langkah === 1 && (
          <div className="grid md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Tanggal</span>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-600">Keterangan</span>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="cth. Pembayaran sewa ruko bulan Oktober"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
          </div>
        )}

        {langkah >= 2 && (
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={cariAkun}
              onChange={(e) => setCariAkun(e.target.value)}
              placeholder="Saring daftar akun (kode atau nama)..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        )}

        {langkah === 2 && editorBaris(debit, setDebit, "debit", saranD, idKredit)}

        {langkah === 3 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">{editorBaris(kredit, setKredit, "kredit", saranK.akun, idDebit)}</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm h-fit">
              <p className="font-medium text-gray-700 mb-2">Tinjauan</p>
              <div className="flex justify-between">
                <span>Total debit</span>
                <span className="font-semibold">{formatRp(totalDebit)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total kredit</span>
                <span className="font-semibold">{formatRp(totalKredit)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Selisih</span>
                <span className={`font-semibold ${seimbang ? "text-emerald-700" : "text-red-700"}`}>{formatRp(selisih)}</span>
              </div>
              <div className={`mt-3 flex items-center gap-1.5 text-xs ${seimbang ? "text-emerald-700" : "text-gray-500"}`}>
                {seimbang ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {seimbang ? "Seimbang. Jurnal siap diposting." : "Belum seimbang. Pastikan debit sama dengan kredit."}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 flex-wrap items-center">
          <button
            type="button"
            onClick={() => setLangkah((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
            disabled={langkah === 1}
            className="border px-4 py-2 rounded-full text-sm disabled:opacity-50"
          >
            Kembali
          </button>
          {langkah < 3 ? (
            <button
              type="button"
              onClick={lanjut}
              disabled={(langkah === 1 && !tanggal) || (langkah === 2 && !adaDebit)}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              Lanjut
            </button>
          ) : (
            <button
              onClick={posting}
              disabled={!adaDebit || !adaKredit || !seimbang}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              Posting Jurnal
            </button>
          )}
          <button type="button" onClick={reset} className="border px-4 py-2 rounded-full text-sm">
            Atur Ulang
          </button>
        </div>
      </section>

      <DaftarJurnal />

      <AccountInfoModal visible={!!info} account={info} onClose={() => setInfo(undefined)} />
    </div>
  );
}
