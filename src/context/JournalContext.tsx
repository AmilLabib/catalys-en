import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Account } from "./ChartOfAccountsContext";
import { useChartOfAccounts } from "./ChartOfAccountsContext";
import { useAccount } from "./AccountContext";
import { buildSampleJournals } from "../data/sampleJournals";
import { MAIN_BRANCH, HEAD_OFFICE } from "../config/access";

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
  // sample journal: breakdown of the report model figures, not posted again
  sample?: boolean;
  // recording entity: branch name or Head Office. Empty = Main Branch (data from before any branch existed)
  entity?: string;
};

export const journalEntity = (e: JournalEntry) => e.entity ?? MAIN_BRANCH;

const STORAGE_KEY = "journals_v2";

type JournalCtx = {
  /** journals entered by the user (persisted) */
  entries: JournalEntry[];
  /** the active account's user journals + sample journals, newest first */
  allJournals: JournalEntry[];
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

  // 3 years of sample journals for the signed-in account's entity
  const { role, branch, hasBranches, ownEntity, branchList } = useAccount();
  const sampleJournals = useMemo(
    () => buildSampleJournals(ownEntity, accounts),
    // the branch list affects the consolidated figures
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownEntity, accounts, branchList.length],
  );
  // branch accounts only see their own journals; the parent account sees all
  const allJournals = useMemo(
    () =>
      [...entries.filter((e) => role === "parent" || journalEntity(e) === branch), ...sampleJournals].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      ),
    [entries, sampleJournals, role, branch],
  );

  // new journals are labeled with the entity of the account recording them
  const recorder = role === "branch" ? branch : hasBranches ? HEAD_OFFICE : MAIN_BRANCH;
  const setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>> = (change) =>
    setEntriesState((old) => {
      const next = typeof change === "function" ? change(old) : change;
      return next.map((e) => (e.entity || old.includes(e) ? e : { ...e, entity: recorder }));
    });

  const addEntry = (e: JournalEntry) => setEntries((s) => [e, ...s]);

  const byCode = (code: string) => accounts.find((a) => a.code === code);

  const findCashAccount = (): Account | undefined =>
    byCode("1.1.1.01") ||
    accounts.find((a) => a.type === "asset" && a.name.toLowerCase().includes("cash"));

  // General sales are recorded to non-member revenue ("Member" accounts are for cooperatives only)
  const findRevenueAccount = (): Account | undefined =>
    byCode("4.2.1.01") ||
    accounts.find((a) => a.type === "revenue" && a.name.toLowerCase().includes("sales")) ||
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
      accounts.find((a) => a.name.toLowerCase().includes("cost of goods"));
    const invAcc =
      accounts.find((a) => a.code === "1.1.4.01") ||
      accounts.find((a) => a.name.toLowerCase().includes("inventory"));

    if (!cashAcc || !revAcc) {
      // cannot record without mapped accounts
      console.warn("No cash or revenue account found to record sale.");
      return;
    }

    const vatAcc = byCode("2.1.4.01");
    const useVat = tax > 0 && !!vatAcc;

    // Cash received = selling price + VAT; VAT is recorded as a liability (Output VAT)
    const lines: JournalLine[] = [
      {
        id: `l-${Date.now()}-d`,
        side: "debit",
        accountId: cashAcc.id,
        amount: total + (useVat ? tax : 0),
      },
      {
        id: `l-${Date.now()}-c`,
        side: "credit",
        accountId: revAcc.id,
        amount: total,
      },
    ];
    if (useVat) {
      lines.push({
        id: `l-${Date.now()}-vat`,
        side: "credit",
        accountId: vatAcc!.id,
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
      description: opts.description || "Cashier sale",
      lines,
    };

    addEntry(entry);
  };

  return (
    <ctx.Provider
      value={{
        entries,
        allJournals,
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
  if (!c) throw new Error("useJournal must be used within JournalProvider");
  return c;
}
