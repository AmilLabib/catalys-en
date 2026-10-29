import { useMemo, useState } from "react";
import { Search, Trash2, CalendarDays, X } from "lucide-react";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useJournal, type JournalEntry } from "../../context/JournalContext";
import { evaluateAlerts } from "../../utils/journalAlerts";
import { formatRp, MONTH_NAMES } from "../../data/reports";

const DAYS_PER_PAGE = 7;
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const totalDebit = (e: JournalEntry) => e.lines.reduce((s, l) => s + (l.side === "debit" ? l.amount : 0), 0);

export default function JournalList() {
  const { accounts } = useChartOfAccounts();
  const { entries, allJournals, setEntries } = useJournal();
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [date, setDate] = useState("");
  const [source, setSource] = useState<"all" | "input" | "sample">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const yearList = useMemo(() => Array.from(new Set(allJournals.map((e) => e.date.slice(0, 4)))).sort().reverse(), [allJournals]);
  const monthList = useMemo(
    () =>
      year === "all"
        ? []
        : Array.from(new Set(allJournals.filter((e) => e.date.startsWith(year)).map((e) => e.date.slice(5, 7)))).sort(),
    [allJournals, year],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allJournals.filter((e) => {
      if (date) {
        if (e.date !== date) return false;
      } else {
        if (year !== "all" && !e.date.startsWith(year)) return false;
        if (month !== "all" && e.date.slice(5, 7) !== month) return false;
      }
      if (source === "input" && e.sample) return false;
      if (source === "sample" && !e.sample) return false;
      if (!q) return true;
      return (
        (e.description || "").toLowerCase().includes(q) ||
        e.lines.some((l) => {
          const a = accountMap.get(l.accountId);
          return a ? (a.code + " " + a.name).toLowerCase().includes(q) : false;
        })
      );
    });
  }, [allJournals, year, month, date, source, search, accountMap]);

  // grouped by date
  const groups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(groups.length / DAYS_PER_PAGE));
  const pg = Math.min(page, totalPages);
  const pageGroups = groups.slice((pg - 1) * DAYS_PER_PAGE, pg * DAYS_PER_PAGE);
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const select = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white";
  const hasFilter = year !== "all" || date || source !== "all" || search;

  return (
    <section className="card-elegant p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Journal List</h3>
          <p className="text-sm text-gray-500">
            {filtered.length.toLocaleString("en-US")} journals across {groups.length.toLocaleString("en-US")} days ·{" "}
            {entries.length} entered by you, the rest are sample journals from the last 3 years
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <CalendarDays className="w-4 h-4 text-primary" />
        <select
          value={year}
          disabled={!!date}
          onChange={(e) => {
            change(setYear)(e.target.value);
            setMonth("all");
          }}
          className={select}
          aria-label="Year"
        >
          <option value="all">All years</option>
          {yearList.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={month} disabled={year === "all" || !!date} onChange={(e) => change(setMonth)(e.target.value)} className={select} aria-label="Month">
          <option value="all">All months</option>
          {monthList.map((b) => (
            <option key={b} value={b}>
              {LONG_MONTHS[Number(b) - 1]}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => change(setDate)(e.target.value)} className={select} aria-label="Specific date" />
        <select value={source} onChange={(e) => change(setSource)(e.target.value as typeof source)} className={select} aria-label="Journal source">
          <option value="all">All journals</option>
          <option value="input">My entries</option>
          <option value="sample">Sample journals</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => change(setSearch)(e.target.value)}
            placeholder="Search description or account..."
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-60 max-w-full"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setYear("all");
              setMonth("all");
              setDate("");
              setSource("all");
              setSearch("");
              setPage(1);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No journals match this filter.</p>
      ) : (
        <div className="space-y-5">
          {pageGroups.map(([day, list]) => (
            <div key={day} className="rounded-xl border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#e1ecf3]/60 px-4 py-2.5">
                <p className="font-semibold text-primary">{longDate(day)}</p>
                <p className="text-xs text-gray-600">
                  {list.length} journals · total {formatRp(list.reduce((s, e) => s + totalDebit(e), 0))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 px-4 font-medium">Description</th>
                      <th className="py-2 pr-4 font-medium">Account</th>
                      <th className="py-2 pr-4 font-medium text-right">Debit</th>
                      <th className="py-2 pr-4 font-medium text-right">Credit</th>
                      <th className="py-2 pr-4 font-medium">Checks</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => {
                      // sample journals are guaranteed balanced, checks are only for user entries
                      const alerts = e.sample
                        ? []
                        : evaluateAlerts(e, { getAccount: (id) => (id ? accountMap.get(id) : undefined), existingEntries: entries.filter((x) => x.id !== e.id) });
                      const err = alerts.filter((a) => a.severity === "error").length;
                      const warn = alerts.filter((a) => a.severity === "warning").length;
                      return e.lines.map((l, i) => {
                        const a = accountMap.get(l.accountId);
                        return (
                          <tr key={`${e.id}-${l.id}`} className={`align-top ${i === 0 ? "border-t" : ""}`}>
                            <td className="py-2 px-4">
                              {i === 0 && (
                                <span className="flex flex-wrap items-center gap-1.5">
                                  {e.description || "-"}
                                  {e.sample ? (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Sample</span>
                                  ) : (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Input</span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 pr-4 ${l.side === "credit" ? "pl-6" : ""}`}>
                              {a ? `${a.code} — ${a.name}` : <span className="text-red-600">Account not found</span>}
                            </td>
                            <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{l.side === "debit" ? formatRp(l.amount) : ""}</td>
                            <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{l.side === "credit" ? formatRp(l.amount) : ""}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {i === 0 && (
                                <span className="flex gap-1">
                                  {err > 0 && <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">{err} errors</span>}
                                  {warn > 0 && <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">{warn} warnings</span>}
                                  {err === 0 && warn === 0 && <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700">Balanced</span>}
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {i === 0 && !e.sample && (
                                <button
                                  onClick={() => {
                                    if (confirm("Delete this journal?")) setEntries(entries.filter((x) => x.id !== e.id));
                                  }}
                                  aria-label="Delete journal"
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

      {groups.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-sm">
          <p className="text-gray-600">
            Days {(pg - 1) * DAYS_PER_PAGE + 1}–{Math.min(pg * DAYS_PER_PAGE, groups.length)} of {groups.length}
            {pageGroups.length > 0 && (
              <span className="text-gray-400">
                {" "}
                ({pageGroups[pageGroups.length - 1][0].slice(8)} {MONTH_NAMES[Number(pageGroups[pageGroups.length - 1][0].slice(5, 7)) - 1]} –{" "}
                {pageGroups[0][0].slice(8)} {MONTH_NAMES[Number(pageGroups[0][0].slice(5, 7)) - 1]} {pageGroups[0][0].slice(0, 4)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={pg === 1} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Newest
            </button>
            <button onClick={() => setPage(pg - 1)} disabled={pg === 1} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Previous
            </button>
            <span className="px-2 text-gray-700">
              Page {pg} / {totalPages}
            </span>
            <button onClick={() => setPage(pg + 1)} disabled={pg === totalPages} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Next
            </button>
            <button onClick={() => setPage(totalPages)} disabled={pg === totalPages} className="border px-3 py-1.5 rounded-lg disabled:opacity-50">
              Oldest
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
