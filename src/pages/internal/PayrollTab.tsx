import { useEffect, useMemo, useState } from "react";
import { Trophy, Medal, Wallet, Brain, CheckCircle2, Users, Phone, Search, Plus, Trash2, Target, Banknote, Building2 } from "lucide-react";
import { useBusinessSector } from "../../context/BusinessSectorContext";
import { useJournal } from "../../context/JournalContext";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useToast } from "../../context/ToastContext";
import { useAccount } from "../../context/AccountContext";
import BrandIcon from "../../components/BrandIcon";
import AnimatedNumber from "../../components/AnimatedNumber";
import Modal from "../../components/Modal";
import {
  computePay,
  sectorEmployees,
  kpiProgress,
  employeeScore,
  BPJS_DEDUCTION,
  workUnits,
  type Employee,
  type EmployeeKpi,
} from "../../data/internal";
import { formatRp, formatRpShort, MONTH_NAMES } from "../../data/reports";
import { celebrate } from "../../utils/effects";

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

// Today's attendance status from check-in/out times (work starts at 08:00, 5-minute tolerance)
function attendanceStatus(e: Employee): { label: string; cls: string } {
  if (!e.checkIn) return { label: "Not in yet", cls: "bg-gray-100 text-gray-500" };
  if (e.checkIn > "08:05") return { label: "Late", cls: "bg-[#e1ecf3] text-[#5487ab] ring-1 ring-[#9cb2c1]" };
  if (!e.checkOut) return { label: "Working", cls: "bg-[#e1ecf3] text-[#2f6b8f]" };
  return { label: "On time", cls: "bg-primary text-white" };
}

const initials = (n: string) =>
  n
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);

// Profile photo; if it fails to load, show initials
function Photo({ e, size = "w-10 h-10", className = "" }: { e: Employee; size?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={`${size} shrink-0 rounded-full chip-gradient text-xs font-bold flex items-center justify-center ${className}`}>{initials(e.name)}</span>
  ) : (
    <img src={e.photo} alt={e.name} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full object-cover ${className}`} />
  );
}

function ProgressBar({ value, thickness = "h-2" }: { value: number; thickness?: string }) {
  return (
    <div className={`${thickness} w-full rounded-full bg-[#e1ecf3] overflow-hidden`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2f6b8f] to-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const STORAGE_KEY = (sector: string) => `catalys_employees_v3_${sector}`;

export default function PayrollTab() {
  const { sector } = useBusinessSector();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { toast } = useToast();

  const { branchList } = useAccount();
  const WORK_UNITS = workUnits(branchList.map((c) => c.name));

  // employee data can be edited (KPIs, salary), so it's stored per sector in the browser
  const [saved, setEmployees] = useState<Employee[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(sector));
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });
  // merge with sample employees of newly opened units; units that no longer exist are ignored
  const employees = useMemo(() => {
    const samples = sectorEmployees(sector, WORK_UNITS);
    const existing = new Set(saved.map((e) => e.id));
    return [...saved.filter((e) => WORK_UNITS.includes(e.unit)), ...samples.filter((e) => !existing.has(e.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, sector, WORK_UNITS.join("|")]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(sector), JSON.stringify(employees));
    } catch {
      // ignore
    }
  }, [employees, sector]);

  const [unit, setUnit] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = employees.find((e) => e.id === selectedId) ?? null;

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const periodCode = `${year}-${String(month + 1).padStart(2, "0")}`;
  const payId = (e: Employee) => `salary-${periodCode}-${e.id}`;
  const isPaid = (e: Employee) => entries.some((x) => x.id === payId(e));

  const filtered = employees.filter(
    (e) => (unit === "all" || e.unit === unit) && `${e.name} ${e.position}`.toLowerCase().includes(search.toLowerCase()),
  );
  const details = filtered.map((e) => ({ ...e, ...computePay(e), score: employeeScore(e), progress: kpiProgress(e.kpi) }));
  const total = details.reduce(
    (s, e) => ({ gross: s.gross + e.gross, deduction: s.deduction + e.deduction, net: s.net + e.net }),
    { gross: 0, deduction: 0, net: 0 },
  );
  const ranking = [...details].sort((a, b) => b.score - a.score);
  const champion = ranking[0];
  const present = filtered.filter((e) => e.checkIn).length;
  const paidCount = filtered.filter(isPaid).length;
  const count = filtered.length;
  // "x / total" format for summary cards
  const fmtPerPerson = (v: number) => `${v} / ${count}`;

  const countPerUnit = useMemo(() => {
    const m: Record<string, number> = {};
    employees.forEach((e) => (m[e.unit] = (m[e.unit] || 0) + 1));
    return m;
  }, [employees]);

  // ---------- update one employee's data ----------
  const update = (id: string, changes: Partial<Employee>) =>
    setEmployees(() =>
      employees.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...changes };
        return { ...next, target: kpiProgress(next.kpi) };
      }),
    );
  const updateKpi = (e: Employee, kpiId: string, p: Partial<EmployeeKpi>) =>
    update(e.id, { kpi: e.kpi.map((x) => (x.id === kpiId ? { ...x, ...p } : x)) });
  const addKpi = (e: Employee) =>
    update(e.id, { kpi: [...e.kpi, { id: `kpi-${Date.now()}`, name: "New KPI", target: 100, achieved: 0, unit: "%", weight: 10 }] });
  const removeKpi = (e: Employee, kpiId: string) => update(e.id, { kpi: e.kpi.filter((x) => x.id !== kpiId) });

  // ---------- pay out salary per person ----------
  const payOut = (e: Employee) => {
    const id = (code: string) => accounts.find((a) => a.code === code)?.id;
    const expense = id("6.1.1.01");
    const cash = id("1.1.1.02") ?? id("1.1.1.01");
    const payable = id("2.1.5.01");
    if (!expense || !cash || !payable) return toast("Salary expense / cash / salaries payable account not found in the Chart of Accounts", "warning");
    const g = computePay(e);
    const now = payId(e);
    setEntries([
      {
        id: payId(e),
        date: `${periodCode}-${String(Math.min(25, new Date().getDate())).padStart(2, "0")}`,
        description: `Salary for ${e.name} (${e.unit}) ${MONTH_NAMES[month]} ${year}`,
        lines: [
          { id: `${now}-1`, side: "debit", accountId: expense, amount: g.gross },
          { id: `${now}-2`, side: "credit", accountId: cash, amount: g.net },
          // the BPJS deduction is held as a liability until it's paid in
          { id: `${now}-3`, side: "credit", accountId: payable, amount: g.deduction },
        ],
      },
      ...entries,
    ]);
    toast(`${e.name}'s salary of ${formatRp(g.net)} paid out, journal created`);
    celebrate();
  };

  const medals = ["text-white", "text-white/80", "text-white/60"];
  const input = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Work unit filter */}
      <section className="lg:col-span-12 card-elegant p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary shrink-0">
          <Building2 className="w-4 h-4" /> Work unit
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {["all", ...WORK_UNITS].map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                unit === u ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-[#9cb2c1]"
              }`}
            >
              {u === "all" ? "All units" : u.replace(/ Branch$/, "")}
              <span className={`ml-1.5 ${unit === u ? "text-white/70" : "text-gray-400"}`}>
                {u === "all" ? employees.length : countPerUnit[u] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <label className="relative md:w-56">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / position" className="w-full rounded-full border border-gray-200 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15" />
        </label>
      </section>

      {/* Summary */}
      <section className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            ["Employees present today", present, Users, "grad-navy", fmtPerPerson],
            ["Total gross pay", total.gross, Wallet, "grad-ocean", formatRpShort],
            ["Net pay (after BPJS)", total.net, Wallet, "grad-indigo", formatRpShort],
            ["Salaries paid out", paidCount, Banknote, "grad-steel", fmtPerPerson],
          ] as const
        ).map(([k, v, Icon, grad, fmt]) => (
          <div key={k} className={`card-gradient ${grad} p-4`}>
            <div className="relative flex items-center justify-between">
              <p className="text-xs text-white/75">{k}</p>
              <Icon className="w-4 h-4 text-white/80" />
            </div>
            <p className="relative mt-1 text-xl font-bold">
              <AnimatedNumber value={v} format={fmt} />
            </p>
          </div>
        ))}
      </section>

      {/* Left: leaderboard */}
      <section className="lg:col-span-4 card-gradient grad-navy p-6">
        <div className="relative flex items-center gap-2">
          <Trophy className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold">Leaderboard</h2>
        </div>
        <p className="relative text-xs text-white/70 mt-1">
          Score = performance 50% + attendance 30% + KPI achievement 20%. {MONTH_NAMES[month]} {year}.
        </p>
        <ol className="relative mt-4 space-y-2">
          {ranking.slice(0, 8).map((e, i) => (
            <li key={e.id}>
              <button
                onClick={() => setSelectedId(e.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/25 ${i < 3 ? "bg-white/15" : "bg-white/5"}`}
              >
                <span className="w-5 text-center font-bold">{i < 3 ? <Medal className={`w-5 h-5 inline ${medals[i]}`} /> : i + 1}</span>
                <Photo e={e} size="w-8 h-8" className="ring-2 ring-white/30" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{e.name}</span>
                  <span className="block text-[11px] text-white/60 truncate">{e.unit.replace(/ Branch$/, "")}</span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-extrabold">{e.score}</span>
                  <span className="block text-[10px] text-white/60">points</span>
                </span>
              </button>
            </li>
          ))}
          {ranking.length === 0 && <li className="text-sm text-white/70">No employees in this filter.</li>}
        </ol>
      </section>

      {/* Right: employee cards */}
      <section data-tour="hr" className="lg:col-span-8 card-elegant p-6 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Employees & KPI Progress</h2>
            <p className="text-xs text-gray-500">Click a card to set KPIs and salary, and to pay out the salary.</p>
          </div>
          <span className="text-xs text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {details.map((e) => {
            const st = attendanceStatus(e);
            return (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-[#9cb2c1] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <Photo e={e} size="w-12 h-12" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {e.position} · {e.unit}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500">KPI progress ({e.kpi.length} indicators)</span>
                    <span className="font-bold text-primary">{e.progress}%</span>
                  </div>
                  <ProgressBar value={e.progress} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    In {e.checkIn || "—"} · Out {e.checkOut || "—"}
                  </span>
                  {isPaid(e) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Salary paid
                    </span>
                  ) : (
                    <span>Salary {formatRpShort(e.net)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Payroll table */}
      <section className="lg:col-span-8 card-elegant p-6 min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Payroll for {MONTH_NAMES[month]} {year}
          </h2>
          <p className="text-xs text-gray-500">
            Employee BPJS contribution deduction of {BPJS_DEDUCTION * 100}% of base salary + allowance. Salaries are paid out per person.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium text-right">Gross</th>
                <th className="py-2 pr-3 font-medium text-right">Deductions</th>
                <th className="py-2 pr-3 font-medium text-right">Take-home</th>
                <th className="py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {details.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3">
                    <button onClick={() => setSelectedId(e.id)} className="flex items-center gap-2 text-left">
                      <Photo e={e} size="w-7 h-7" />
                      <span>
                        <span className="block font-medium text-gray-800 hover:text-primary">{e.name}</span>
                        <span className="block text-[11px] text-gray-500">{e.unit}</span>
                      </span>
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatRp(e.gross)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-500">{formatRp(-e.deduction)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-primary">{formatRp(e.net)}</td>
                  <td className="py-2 text-right">
                    {isPaid(e) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e1ecf3] px-2.5 py-1 text-xs font-semibold text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    ) : (
                      <button
                        onClick={() => confirm(`Pay out ${e.name}'s salary of ${formatRp(e.net)}?`) && payOut(e)}
                        className="rounded-full btn-gradient px-3 py-1 text-xs font-semibold"
                      >
                        Pay out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#e1ecf3] font-bold">
                <td className="py-2 pr-3 pl-1">Total</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(total.gross)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(-total.deduction)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatRp(total.net)}</td>
                <td className="py-2 pr-1 text-right text-xs font-semibold">
                  {paidCount}/{details.length} paid
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Role fit */}
      <section className="lg:col-span-4 card-elegant p-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Role Fit</h2>
        </div>
        {champion && (
          <div className="flex flex-col items-center text-center gap-2">
            <Photo e={champion} size="w-16 h-16" className="ring-4 ring-[#e1ecf3]" />
            <Gauge value={champion.performance} />
            <p className="font-bold text-gray-900 text-lg">{champion.name}</p>
            <p className="text-sm font-medium text-primary">
              {champion.position} · {champion.unit}
            </p>
            <p className="text-sm text-gray-600">
              Performance {champion.performance}, attendance {champion.attendance}%, KPI progress {champion.progress}%. Recommended to lead the main shift and mentor the lowest-scoring employees.
            </p>
          </div>
        )}
      </section>

      {/* ---------- employee detail: KPIs, salary, payout ---------- */}
      <Modal isOpen={!!selected} onClose={() => setSelectedId(null)} title="Employee Details" wide>
        {selected && (
          <div className="space-y-6">
            {(() => {
              const g = computePay(selected);
              const progress = kpiProgress(selected.kpi);
              const totalWeight = selected.kpi.reduce((s, x) => s + x.weight, 0);
              const wa = "62" + selected.phone.replace(/\D/g, "").slice(1);
              const paid = isPaid(selected);
              return (
                <>
                  {/* profile */}
                  <div className="flex flex-wrap items-center gap-4">
                    <Photo e={selected} size="w-20 h-20" className="ring-4 ring-[#e1ecf3]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold text-gray-900">{selected.name}</p>
                      <p className="text-sm text-gray-600">
                        {selected.position} · {selected.unit}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {selected.phone}
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${selected.name}`}>
                          <BrandIcon brand="whatsapp" size={14} />
                        </a>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-primary">{progress}%</p>
                      <p className="text-[11px] text-gray-500">KPI progress</p>
                    </div>
                  </div>

                  {/* KPI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Target className="w-4 h-4 text-primary" /> Key Performance Indicators (KPIs)
                      </h4>
                      <button onClick={() => addKpi(selected)} className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5">
                        <Plus className="w-3.5 h-3.5" /> Add KPI
                      </button>
                    </div>
                    {totalWeight !== 100 && (
                      <p className="mb-2 rounded-lg bg-[#e1ecf3] px-3 py-1.5 text-xs text-primary">
                        Total weight is {totalWeight}%. It should be 100% so progress is easy to read.
                      </p>
                    )}
                    <div className="space-y-3">
                      {selected.kpi.map((x) => {
                        const p = Math.round((x.achieved / (x.target || 1)) * 100);
                        return (
                          <div key={x.id} className="rounded-xl border border-gray-100 p-3">
                            <div className="flex items-center gap-2">
                              <input value={x.name} onChange={(e) => updateKpi(selected, x.id, { name: e.target.value })} className={`${input} font-medium`} aria-label="KPI name" />
                              <button onClick={() => removeKpi(selected, x.id)} aria-label="Delete KPI" className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {(
                                [
                                  ["Achieved", "achieved"],
                                  ["Target", "target"],
                                  ["Unit", "unit"],
                                  ["Weight %", "weight"],
                                ] as const
                              ).map(([lbl, f]) => (
                                <label key={f} className="text-[11px] text-gray-500">
                                  {lbl}
                                  <input
                                    type={f === "unit" ? "text" : "number"}
                                    min={0}
                                    step="any"
                                    value={x[f]}
                                    onChange={(e) => updateKpi(selected, x.id, { [f]: f === "unit" ? e.target.value : Number(e.target.value) })}
                                    className={`${input} mt-0.5`}
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <ProgressBar value={p} thickness="h-1.5" />
                              <span className="w-12 text-right text-xs font-bold text-primary">{p}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {selected.kpi.length === 0 && <p className="text-sm text-gray-400">No KPIs yet. Add the first indicator.</p>}
                    </div>
                  </div>

                  {/* salary */}
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                      <Wallet className="w-4 h-4 text-primary" /> Salary Settings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          ["Base salary", "baseSalary"],
                          ["Allowance", "allowance"],
                          ["Overtime this month", "overtime"],
                        ] as const
                      ).map(([lbl, f]) => (
                        <label key={f} className="text-xs text-gray-500">
                          {lbl}
                          <input
                            type="number"
                            min={0}
                            step={50000}
                            value={selected[f]}
                            disabled={paid}
                            onChange={(e) => update(selected.id, { [f]: Math.max(0, Number(e.target.value)) })}
                            className={`${input} mt-0.5 disabled:bg-gray-50 disabled:text-gray-400`}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl bg-[#e1ecf3]/60 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross</span>
                        <span className="tabular-nums">{formatRp(g.gross)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">BPJS deduction ({BPJS_DEDUCTION * 100}%)</span>
                        <span className="tabular-nums">{formatRp(-g.deduction)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#9cb2c1]/50 pt-1 font-bold text-primary">
                        <span>Take-home</span>
                        <span className="tabular-nums">{formatRp(g.net)}</span>
                      </div>
                    </div>
                  </div>

                  {/* payout */}
                  {paid ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                      <CheckCircle2 className="w-5 h-5" /> {MONTH_NAMES[month]} {year} salary has been paid out
                    </div>
                  ) : (
                    <button
                      onClick={() => confirm(`Pay out ${selected.name}'s salary of ${formatRp(g.net)}?`) && payOut(selected)}
                      className="btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                    >
                      <Banknote className="w-5 h-5" /> Pay Out Salary {formatRp(g.net)}
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
