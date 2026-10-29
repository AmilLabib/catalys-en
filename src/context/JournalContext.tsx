import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Account } from "./ChartOfAccountsContext";
import { useChartOfAccounts } from "./ChartOfAccountsContext";
import { useAccount } from "./AccountContext";
import { buatJurnalContoh } from "../data/jurnalContoh";
import { CABANG_UTAMA, KANTOR_PUSAT } from "../config/access";

export type JournalLine = {
  id: string;
  side: "debit" | "credit";
  accountId: string;
  amount: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  description?: string;
  lines: JournalLine[];
  // jurnal contoh: rincian angka model laporan, tidak diposting ulang
  contoh?: boolean;
  // entitas pencatat: nama cabang atau Kantor Pusat. Kosong = Cabang Utama (data sebelum ada cabang)
  entitas?: string;
};

export const entitasJurnal = (e: JournalEntry) => e.entitas ?? CABANG_UTAMA;

const STORAGE_KEY = "journals_v1";

type JournalCtx = {
  /** jurnal yang diinput pengguna (tersimpan) */
  entries: JournalEntry[];
  /** jurnal pengguna milik akun aktif + jurnal contoh, terurut dari terbaru */
  semuaJurnal: JournalEntry[];
  addEntry: (e: JournalEntry) => void;
  // expose the React state setter so consumers can update entries with a functional update
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  addSaleFromCart: (
    cart: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      unitCost?: number;
    }[],
    opts?: { description?: string; tax?: number },
  ) => void;
};

const ctx = createContext<JournalCtx | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { accounts } = useChartOfAccounts();
  const [entries, setEntriesState] = useState<JournalEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as JournalEntry[];
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }, [entries]);

  // Jurnal contoh 3 tahun untuk entitas akun yang sedang masuk
  const { role, cabang, punyaCabang, entitasSendiri, cabangList } = useAccount();
  const jurnalContoh = useMemo(
    () => buatJurnalContoh(entitasSendiri, accounts),
    // daftar cabang memengaruhi angka konsolidasi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entitasSendiri, accounts, cabangList.length],
  );
  // akun cabang hanya melihat jurnalnya sendiri; akun induk melihat semua
  const semuaJurnal = useMemo(
    () =>
      [...entries.filter((e) => role === "induk" || entitasJurnal(e) === cabang), ...jurnalContoh].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      ),
    [entries, jurnalContoh, role, cabang],
  );

  // jurnal baru diberi label entitas akun yang mencatatnya
  const pencatat = role === "cabang" ? cabang : punyaCabang ? KANTOR_PUSAT : CABANG_UTAMA;
  const setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>> = (ubah) =>
    setEntriesState((lama) => {
      const baru = typeof ubah === "function" ? ubah(lama) : ubah;
      return baru.map((e) => (e.entitas || lama.includes(e) ? e : { ...e, entitas: pencatat }));
    });

  const addEntry = (e: JournalEntry) => setEntries((s) => [e, ...s]);

  const byCode = (code: string) => accounts.find((a) => a.code === code);

  const findCashAccount = (): Account | undefined =>
    byCode("1.1.1.01") ||
    accounts.find((a) => a.type === "asset" && a.name.toLowerCase().includes("kas"));

  // Penjualan umum dicatat ke pendapatan non-anggota (akun "Anggota" khusus koperasi)
  const findRevenueAccount = (): Account | undefined =>
    byCode("4.2.1.01") ||
    accounts.find((a) => a.type === "revenue" && a.name.toLowerCase().includes("penjualan")) ||
    accounts.find((a) => a.type === "revenue");

  const addSaleFromCart = (
    cart: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      unitCost?: number;
    }[],
    opts: { description?: string; tax?: number } = {},
  ) => {
    const total = cart.reduce((s: number, it) => s + it.price * it.quantity, 0);
    const tax = Math.round(opts.tax || 0);
    const totalCogs = cart.reduce(
      (s: number, it) => s + (it.unitCost || 0) * it.quantity,
      0,
    );

    if (total <= 0) return;
    const cashAcc = findCashAccount();
    const revAcc = findRevenueAccount();
    const cogsAcc =
      accounts.find((a) => a.code === "5.1.1.01") ||
      accounts.find((a) => a.name.toLowerCase().includes("harga pokok"));
    const invAcc =
      accounts.find((a) => a.code === "1.1.4.01") ||
      accounts.find((a) => a.name.toLowerCase().includes("persediaan"));

    if (!cashAcc || !revAcc) {
      // cannot record without mapped accounts
      console.warn("No cash or revenue account found to record sale.");
      return;
    }

    const ppnAcc = byCode("2.1.4.01");
    const pakaiPpn = tax > 0 && !!ppnAcc;

    // Kas diterima = harga jual + PPN; PPN dicatat sebagai utang (PPN Keluaran)
    const lines: JournalLine[] = [
      {
        id: `l-${Date.now()}-d`,
        side: "debit",
        accountId: cashAcc.id,
        amount: total + (pakaiPpn ? tax : 0),
      },
      {
        id: `l-${Date.now()}-c`,
        side: "credit",
        accountId: revAcc.id,
        amount: total,
      },
    ];
    if (pakaiPpn) {
      lines.push({
        id: `l-${Date.now()}-ppn`,
        side: "credit",
        accountId: ppnAcc!.id,
        amount: tax,
      });
    }

    if (totalCogs > 0 && cogsAcc && invAcc) {
      lines.push({
        id: `l-${Date.now()}-cogs-d`,
        side: "debit",
        accountId: cogsAcc.id,
        amount: totalCogs,
      });
      lines.push({
        id: `l-${Date.now()}-inv-c`,
        side: "credit",
        accountId: invAcc.id,
        amount: totalCogs,
      });
    }

    const entry: JournalEntry = {
      id: `sale-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      description: opts.description || "Penjualan di Kasir",
      lines,
    };

    addEntry(entry);
  };

  return (
    <ctx.Provider
      value={{
        entries,
        semuaJurnal,
        addEntry,
        setEntries,
        addSaleFromCart,
      }}
    >
      {children}
    </ctx.Provider>
  );
}

export function useJournal() {
  const c = useContext(ctx);
  if (!c) throw new Error("useJournal harus dipakai di dalam JournalProvider");
  return c;
}
