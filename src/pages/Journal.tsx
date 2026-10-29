import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Search, CheckCircle2, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useReport } from "../hooks/useReport";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { useJournal, type JournalEntry, type JournalLine } from "../context/JournalContext";
import { useToast } from "../context/ToastContext";
import AccountInfoModal, { InfoButton, type AccountInfo } from "../components/AccountInfoModal";
import { evaluateAlerts } from "../utils/journalAlerts";
import JournalList from "./journal/JournalList";
import { getAccountDetails } from "../utils/accountInfo";
import { suggestDebit, suggestCredit, JOURNAL_TEMPLATES, type JournalTemplate } from "../utils/accountSuggestions";
import type { Account } from "../context/ChartOfAccountsContext";
import { formatRp, CURRENT_YEAR } from "../data/reports";

type RowUI = { id: string; accountId: string; amount: string };
const newRow = (p: string): RowUI => ({ id: `${Date.now()}-${p}${Math.random()}`, accountId: "", amount: "" });


export default function Journal() {
  usePageTitle("Journal Entries");
  const { accounts } = useChartOfAccounts();
  const { entries, setEntries } = useJournal();
  const { toast } = useToast();
  const rep = useReport(CURRENT_YEAR);

  const findAccount = (id: string | undefined) => accounts.find((a) => a.id === id);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [debit, setDebit] = useState<RowUI[]>([newRow("d")]);
  const [credit, setCredit] = useState<RowUI[]>([newRow("c")]);
  const [accountSearch, setAccountSearch] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);
  const [info, setInfo] = useState<AccountInfo | undefined>();
  const panelRef = useRef<HTMLDivElement | null>(null);


  const toLines = (rows: RowUI[], side: "debit" | "credit"): JournalLine[] =>
    rows
      .filter((l) => l.accountId && Number(l.amount) > 0)
      .map((l) => ({ id: l.id, side, accountId: l.accountId, amount: Number(l.amount) }));

  const draft = useMemo(
    () => ({ date, description, lines: [...toLines(debit, "debit"), ...toLines(credit, "credit")] }),
    [date, description, debit, credit],
  );

  const draftAlerts = useMemo(
    () =>
      evaluateAlerts(draft, {
        currentAssetsTotal: rep.summary.totalAssets,
        currentCash: rep.balance.cash,
        getAccount: findAccount,
        existingEntries: entries,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, rep, entries, accounts],
  );
  const hasError = draftAlerts.some((a) => a.severity === "error");

  const totalDebit = debit.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCredit = credit.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const balanced = totalDebit > 0 && totalCredit > 0 && difference < 0.0001;
  const hasDebit = debit.some((l) => l.accountId && Number(l.amount) > 0);
  const hasCredit = credit.some((l) => l.accountId && Number(l.amount) > 0);

  const filteredAccounts = accounts.filter((a) => (a.code + " " + a.name).toLowerCase().includes(accountSearch.toLowerCase()));

  // accounts already used on one side aren't offered on the opposite side
  const debitIds = useMemo(() => new Set(debit.map((r) => r.accountId).filter(Boolean)), [debit]);
  const creditIds = useMemo(() => new Set(credit.map((r) => r.accountId).filter(Boolean)), [credit]);
  const debitSuggestions = useMemo(() => suggestDebit(description, accounts, creditIds), [description, accounts, creditIds]);
  const creditSuggestions = useMemo(
    () => suggestCredit(debit.map((r) => findAccount(r.accountId)).filter((a): a is Account => !!a), accounts, debitIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debit, accounts, debitIds],
  );

  const assignAccount = (set: React.Dispatch<React.SetStateAction<RowUI[]>>, accountId: string, prefix: string) =>
    set((rows) => {
      if (rows.some((r) => r.accountId === accountId)) return rows;
      const empty = rows.find((r) => !r.accountId);
      return empty ? rows.map((r) => (r.id === empty.id ? { ...r, accountId } : r)) : [...rows, { ...newRow(prefix), accountId }];
    });

  const applyTemplate = (t: JournalTemplate) => {
    const d = accounts.find((a) => a.code === t.debit);
    const c = accounts.find((a) => a.code === t.credit);
    if (!d || !c) return toast("The accounts for this template aren't in the Chart of Accounts", "warning");
    setDescription(t.description);
    setDebit([{ ...newRow("d"), accountId: d.id }]);
    setCredit([{ ...newRow("c"), accountId: c.id }]);
    setStep(2);
    toast(`Template "${t.name}": Debit ${d.name}, Credit ${c.name}. Fill in the amount.`, "info");
  };

  const next = () => {
    if (step === 2) {
      // the credit amount is auto-filled with the total debit if there's only one empty row
      setCredit((rows) => (rows.length === 1 && !rows[0].amount ? [{ ...rows[0], amount: String(totalDebit) }] : rows));
    }
    setStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const reset = () => {
    setDebit([newRow("d")]);
    setCredit([newRow("c")]);
    setDescription("");
    setAccountSearch("");
    setShowAlerts(false);
    setStep(1);
  };

  const post = () => {
    if (hasError) {
      setShowAlerts(true);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    const entry: JournalEntry = {
      id: `${Date.now()}`,
      date,
      description: description.trim() || undefined,
      lines: draft.lines,
    };
    setEntries([entry, ...entries]);
    toast("Journal posted and included in the financial reports");
    reset();
  };

  const showInfo = (accountId: string) => {
    const a = findAccount(accountId);
    if (!a) return toast("Select an account first", "info");
    const d = getAccountDetails(a.code, a.name, a.type);
    setInfo({ code: a.code, name: a.name, description: d.description, example: d.example });
  };

  const rowEditor = (
    rows: RowUI[],
    set: React.Dispatch<React.SetStateAction<RowUI[]>>,
    side: "debit" | "credit",
    suggestions: Account[],
    opposite: Set<string>,
  ) => {
    const suggestionIds = new Set(suggestions.map((a) => a.id));
    const others = filteredAccounts.filter((a) => !opposite.has(a.id) && !suggestionIds.has(a.id));
    return (
    <div className="space-y-2">
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 mb-2">
            <Lightbulb className="w-3.5 h-3.5" /> Commonly used {side} accounts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((a) => {
              const used = rows.some((r) => r.accountId === a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={used}
                  onClick={() => assignAccount(set, a.id, side[0])}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                    used ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {a.code} {a.name}
                </button>
              );
            })}
          </div>
          {side === "credit" && creditSuggestions.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-blue-900/80">
              {creditSuggestions.reasons.map((x) => (
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
            <option value="">Select {side} account</option>
            {suggestions.length > 0 && (
              <optgroup label="Suggested">
                {suggestions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={suggestions.length > 0 ? "Other accounts" : "All accounts"}>
              {others.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </optgroup>
          </select>
          <InfoButton onClick={() => showInfo(row.accountId)} />
          <input
            type="number"
            min={0}
            value={row.amount}
            onChange={(e) => set((p) => p.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
            placeholder="Amount"
            className="w-full sm:w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {rows.length > 1 && (
            <button
              type="button"
              aria-label="Remove row"
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
        onClick={() => set((p) => [...p, newRow(side[0])])}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="w-4 h-4" /> Add {side} row
      </button>
      {opposite.size > 0 && (
        <p className="text-[11px] text-gray-400">Accounts already used on the {side === "debit" ? "credit" : "debit"} side aren't shown here.</p>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/financial" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to Financial Reports
          </Link>
          <h2 className="text-2xl font-bold text-primary mt-1">Journal Entries</h2>
          <p className="text-sm text-gray-500">
            Posted journals directly affect the Balance Sheet, Income Statement, and Cash Flow.
          </p>
        </div>
      </div>

      {/* Journal form */}
      <section className="card-elegant p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          {(
            [
              [1, "Details"],
              [2, "Debit Accounts"],
              [3, "Credit Accounts & Review"],
            ] as const
          ).map(([s, label]) => {
            const active = step === s;
            const disabled = (s === 2 && !date) || (s === 3 && !hasDebit);
            return (
              <button
                key={s}
                type="button"
                onClick={() => !disabled && setStep(s)}
                disabled={disabled}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  active ? "bg-primary text-white" : "border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${active ? "bg-white/20" : "bg-gray-100"}`}>
                  {s}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {showAlerts && draftAlerts.length > 0 && (
          <div ref={panelRef} className="mb-4 space-y-2">
            {draftAlerts.map((a, idx) => (
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

        {step === 1 && (
          <div className="mb-5 rounded-xl border bg-gray-50/70 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Zap className="w-4 h-4 text-amber-500" /> Common transactions
            </p>
            <p className="text-xs text-gray-500 mb-2">Pick a transaction type: debit & credit accounts are filled in automatically, you just enter the amount.</p>
            <select
              value=""
              onChange={(e) => {
                const t = JOURNAL_TEMPLATES.find((x) => x.name === e.target.value);
                if (t) applyTemplate(t);
              }}
              className="w-full md:w-96 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/15"
              aria-label="Select a common transaction"
            >
              <option value="" disabled>
                Select a common transaction…
              </option>
              {JOURNAL_TEMPLATES.map((t) => {
                const d = accounts.find((x) => x.code === t.debit);
                const c = accounts.find((x) => x.code === t.credit);
                return (
                  <option key={t.name} value={t.name}>
                    {d && c ? `${t.name} (D: ${d.name} · C: ${c.name})` : t.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {step === 1 && (
          <div className="grid md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-600">Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. October shophouse rent payment"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
          </div>
        )}

        {step >= 2 && (
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder="Filter the account list (code or name)..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        )}

        {step === 2 && rowEditor(debit, setDebit, "debit", debitSuggestions, creditIds)}

        {step === 3 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">{rowEditor(credit, setCredit, "credit", creditSuggestions.accounts, debitIds)}</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm h-fit">
              <p className="font-medium text-gray-700 mb-2">Review</p>
              <div className="flex justify-between">
                <span>Total debit</span>
                <span className="font-semibold">{formatRp(totalDebit)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total credit</span>
                <span className="font-semibold">{formatRp(totalCredit)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Difference</span>
                <span className={`font-semibold ${balanced ? "text-emerald-700" : "text-red-700"}`}>{formatRp(difference)}</span>
              </div>
              <div className={`mt-3 flex items-center gap-1.5 text-xs ${balanced ? "text-emerald-700" : "text-gray-500"}`}>
                {balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {balanced ? "Balanced. The journal is ready to post." : "Not balanced yet. Make sure debits equal credits."}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 flex-wrap items-center">
          <button
            type="button"
            onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
            disabled={step === 1}
            className="border px-4 py-2 rounded-full text-sm disabled:opacity-50"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={(step === 1 && !date) || (step === 2 && !hasDebit)}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={post}
              disabled={!hasDebit || !hasCredit || !balanced}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              Post Journal
            </button>
          )}
          <button type="button" onClick={reset} className="border px-4 py-2 rounded-full text-sm">
            Reset
          </button>
        </div>
      </section>

      <JournalList />

      <AccountInfoModal visible={!!info} account={info} onClose={() => setInfo(undefined)} />
    </div>
  );
}
