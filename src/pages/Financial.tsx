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
import { useOwnEntity, useRangeReport } from "../hooks/useReport";
import PeriodPicker from "../components/PeriodPicker";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { useJournal } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import QuotaBadge from "../components/QuotaBadge";
import AnimatedNumber from "../components/AnimatedNumber";
import ReceiptScanner from "../components/ReceiptScanner";
import {
  entityList,
  CONSOLIDATED,
  INCOME_STATEMENT,
  BALANCE_SHEET,
  formatRp,
  formatRpShort,
  computeRangeReport,
  TODAY,
  periodLabel,
  formatDate,
} from "../data/reports";
import { buildNotes, buildTables, type Row } from "../data/reportTables";
import { exportExcel, exportPdf, fileName } from "../utils/exportReport";
import { useAccess } from "../context/AccessContext";

// chart palette: navy tones only, alternating light and dark so they stay distinguishable
const COLORS = ["#012a3d", "#5487ab", "#13577d", "#9cb2c1", "#2f6b8f", "#c6d8e4", "#0a3f5e", "#7193ad", "#3d7ea3", "#adc4d3"];

const num = (v: number | undefined) => {
  if (v === undefined) return "";
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(${s})` : s;
};

const percent = (v: number) => `${(v * 100).toFixed(1)}%`;

function growth(now: number, before: number) {
  if (!before) return null;
  return (now - before) / Math.abs(before);
}

export default function Financial() {
  usePageTitle("Financial Reports");
  const navigate = useNavigate();
  const { role, lockReason, consumeQuota, quotaRemaining, profile } = useAccount();
  const auditLock = lockReason("audit");
  const { hasBranches, branchList } = useAccount();
  const { showAccess } = useAccess();
  const { toast, downloadNotice } = useToast();
  const own = useOwnEntity();

  // report period: defaults to the current year (1 January to today)
  const [range, setRange] = useState({ from: `${TODAY.slice(0, 4)}-01-01`, to: TODAY });
  const [entity, setEntity] = useState(own);
  const [tab, setTab] = useState(0);
  const rep = useRangeReport(range.from, range.to, entity);
  const period = rep.period!;
  const [currentLabel, prevLabel] = period.periodColumns;
  const tables = useMemo(() => buildTables(rep), [rep]);
  const notes = useMemo(() => buildNotes(rep, profile.businessName), [rep, profile.businessName]);

  const S = rep.summary;
  const SP = rep.summaryPrev;

  // ---------- Export ----------
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const doExport = async (kind: "excel" | "pdf") => {
    if (!consumeQuota("reportExport")) {
      toast("Report export quota used up. Upgrade to the Pro plan for unlimited exports.", "warning");
      return;
    }
    setExporting(kind);
    try {
      if (kind === "excel") await exportExcel(rep, profile.businessName);
      else await exportPdf(rep, profile.businessName);
      downloadNotice({
        title: "Download Complete",
        message: `Financial Report ${period.label} downloaded`,
        files: [fileName(rep, kind === "excel" ? "xlsx" : "pdf")],
      });
    } catch (e) {
      console.error(e);
      toast("Export failed. Please try again.", "warning");
    } finally {
      setExporting(null);
    }
  };
  const exportsLeft = quotaRemaining("reportExport");

  // ---------- Charts ----------
  const expenseMix = INCOME_STATEMENT.operatingExpenses
    .map((p) => { const n = p.label.replace(/ expense$/i, ""); return { name: n[0].toUpperCase() + n.slice(1), value: rep.is[p.key] || 0 }; })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const comparison = [
    { item: "Revenue", current: S.totalRevenue, prev: SP.totalRevenue },
    { item: "Gross profit", current: S.grossProfit, prev: SP.grossProfit },
    { item: "Operating profit", current: S.operatingProfit, prev: SP.operatingProfit },
    { item: "Net profit", current: S.netProfit, prev: SP.netProfit },
  ];

  const monthlyMargin = rep.monthly.map((b) => ({
    month: b.month,
    margin: b.revenue ? (b.profit / b.revenue) * 100 : 0,
  }));

  const assetMix = [...BALANCE_SHEET.currentAssets, ...BALANCE_SHEET.nonCurrentAssets]
    .map((p) => ({ name: p.label.replace(" (at cost)", "").replace(" (net)", ""), value: rep.balance[p.key] || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const fundingStructure = [
    { name: "Current liabilities", value: S.totalCurrentLiabilities },
    { name: "Long-term liabilities", value: S.totalLongTermLiabilities },
    { name: "Equity", value: S.totalEquity },
  ].filter((d) => d.value > 0);

  const cashFlowByActivity = [
    { activity: "Operating", current: rep.cashFlow.totalOperating, prev: rep.cashFlowPrev.totalOperating },
    { activity: "Investing", current: rep.cashFlow.totalInvesting, prev: rep.cashFlowPrev.totalInvesting },
    { activity: "Financing", current: rep.cashFlow.totalFinancing, prev: rep.cashFlowPrev.totalFinancing },
  ];

  // closing cash balance of each time bucket, from the period's opening cash plus its net cash flow
  const monthlyCashBalance = rep.monthly.reduce<{ month: string; balance: number }[]>((acc, b) => {
    const before = acc.length ? acc[acc.length - 1].balance : rep.cashFlow.openingCash;
    acc.push({ month: b.month, balance: before + b.cashIn - b.cashOut });
    return acc;
  }, []);

  const { entries, allJournals } = useJournal();
  const { accounts } = useChartOfAccounts();
  const latestJournals = allJournals.slice(0, 4);
  const branchContribution = useMemo(() => {
    if (entity !== CONSOLIDATED || !hasBranches) return [];
    return branchList.map(({ name: b }) => ({
      name: b,
      value: computeRangeReport(b, period.from, period.to, [], accounts).summary.totalRevenue,
    }));
  }, [entity, period.from, period.to, accounts, hasBranches, branchList]);

  // ---------- Insights ----------
  const ratios = {
    grossMargin: S.grossProfit / (S.totalRevenue || 1),
    netMargin: S.netProfit / (S.totalRevenue || 1),
    current: S.totalCurrentAssets / (S.totalCurrentLiabilities || 1),
    der: S.totalLiabilities / (S.totalEquity || 1),
    roa: S.netProfit / (S.totalAssets || 1),
    // annualized so it's comparable for any period length
    inventoryTurnover: ((rep.is.cogs || 0) * (365 / period.days)) / (rep.balance.inventory || 1),
  };
  const revenueGrowth = growth(S.totalRevenue, SP.totalRevenue);
  const largestExpense = expenseMix[0];

  const insights: { title: string; value: string; status: "good" | "attention" | "alert"; text: string }[] = [
    {
      title: "Net profit margin",
      value: percent(ratios.netMargin),
      status: ratios.netMargin >= 0.15 ? "good" : ratios.netMargin >= 0.08 ? "attention" : "alert",
      text:
        ratios.netMargin >= 0.15
          ? "Healthy profitability. Keep up the cost discipline."
          : "Thin margin. Review selling prices and the largest expenses.",
    },
    {
      title: "Current ratio",
      value: `${ratios.current.toFixed(2)}x`,
      status: ratios.current >= 1.5 ? "good" : ratios.current >= 1 ? "attention" : "alert",
      text:
        ratios.current >= 1.5
          ? "Current assets are enough to cover short-term liabilities."
          : "Tight liquidity. Speed up receivable collection.",
    },
    {
      title: "Debt to equity",
      value: `${ratios.der.toFixed(2)}x`,
      status: ratios.der <= 1 ? "good" : ratios.der <= 2 ? "attention" : "alert",
      text: ratios.der <= 1 ? "Conservative capital structure, there's still room for funding." : "Fairly high reliance on debt.",
    },
    {
      title: "Revenue growth",
      value: revenueGrowth === null ? "—" : percent(revenueGrowth),
      status: revenueGrowth === null || revenueGrowth >= 0.05 ? "good" : revenueGrowth >= 0 ? "attention" : "alert",
      text: `Compared with the same period last year (${prevLabel}).`,
    },
    {
      title: "Inventory turnover",
      value: `${ratios.inventoryTurnover.toFixed(1)}x / yr`,
      status: ratios.inventoryTurnover >= 6 ? "good" : ratios.inventoryTurnover >= 3 ? "attention" : "alert",
      text: `Stock sells through in ${Math.round(365 / (ratios.inventoryTurnover || 1))} days on average.`,
    },
    {
      title: "Largest operating expense",
      value: largestExpense ? largestExpense.name : "—",
      status: "attention",
      text: largestExpense
        ? `${percent(largestExpense.value / (S.totalRevenue || 1))} of revenue. Prioritize efficiency in this line item.`
        : "",
    },
  ];

  const statusColor = {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    attention: "bg-amber-50 text-amber-700 ring-amber-200",
    alert: "bg-red-50 text-red-700 ring-red-200",
  };
  const statusLabel = { good: "Good", attention: "Needs attention", alert: "Alert" };

  const kpi = [
    { label: "Total Revenue", value: S.totalRevenue, prev: SP.totalRevenue, icon: TrendingUp },
    { label: "Net Profit", value: S.netProfit, prev: SP.netProfit, icon: PiggyBank },
    { label: "Net Cash Increase", value: rep.cashFlow.cashIncrease, prev: rep.cashFlowPrev.cashIncrease, icon: Activity },
    { label: "Total Assets", value: S.totalAssets, prev: SP.totalAssets, icon: Wallet },
  ];

  const rpAxis = (v: number) => formatRpShort(Number(v)).replace("Rp ", "");
  const rpTooltip = (v: number, n: string) => [formatRp(v), n] as [string, string];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">Financial Reports</h2>
        <p className="text-sm text-gray-500">Record transactions, prepare SAK EMKM reports, then analyze the results.</p>
      </div>

      {/* ===== Part 1: transaction recording ===== */}
      <SectionDivider
        number={1}
        title="Transaction Recording"
        text="Record sales and purchases by scanning receipts, or enter journals manually."
      />
      <section data-tour="recording" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <ReceiptScanner className="lg:col-span-3" />
        <div className="lg:col-span-2 card-elegant p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">Journal Entries</h3>
              <p className="text-xs text-gray-500">Enter transactions manually with templates and account suggestions.</p>
            </div>
            <span className="w-9 h-9 shrink-0 rounded-xl chip-gradient flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Latest journals</p>
          <ul className="space-y-2 flex-1">
            {latestJournals.map((j) => {
              const total = j.lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
              return (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{j.description || "General journal"}</p>
                    <p className="text-[11px] text-gray-400">{j.date}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">{formatRpShort(total)}</span>
                </li>
              );
            })}
            {latestJournals.length === 0 && <li className="text-sm text-gray-400">No journals yet.</li>}
          </ul>
          <Link
            to="/journal"
            className="mt-4 btn-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <FileEdit className="w-4 h-4" /> Open Journal Entries <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ===== Part 2: financial reports & insights ===== */}
      <SectionDivider
        number={2}
        title="Financial Reports & Insights"
        text={`Generated automatically from journals · ${rep.entity} · ${periodLabel(rep)}`}
      />

      {/* Report settings: entity, period, export */}
      <section data-tour="report-settings" className="card-elegant p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 lg:items-end">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Report entity</p>
          {role === "parent" && !hasBranches ? (
            <span className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm" title="Per-branch options appear after opening a branch">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-primary">Entire business</span>
              <span className="text-xs text-gray-400">(no branches yet)</span>
            </span>
          ) : role === "parent" ? (
            <label className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm">
              <Building2 className="w-4 h-4 text-gray-500" />
              <select value={entity} onChange={(e) => setEntity(e.target.value)} className="bg-transparent font-semibold text-primary outline-none">
                {entityList().map((x) => (
                  <option key={x} value={x}>
                    {x === CONSOLIDATED ? "Consolidated (all branches)" : x}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span
              className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              title="Other branches' reports and the consolidated report can only be viewed from the Parent account"
            >
              <Building2 className="w-4 h-4" /> {own}
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Period</p>
          <PeriodPicker from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Export report <QuotaBadge quota="reportExport" />
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => doExport("excel")}
              disabled={exporting !== null || exportsLeft === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-600 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exporting === "excel" ? "Preparing..." : "Excel"}
            </button>
            <button
              onClick={() => doExport("pdf")}
              disabled={exporting !== null || exportsLeft === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-600 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {exporting === "pdf" ? "Preparing..." : "PDF"}
            </button>
          </div>
          {exportsLeft === 0 && (
            role === "parent" ? (
              <Link to="/profile?tab=plans" className="mt-1 block text-xs font-medium text-primary underline">
                Quota used up. Upgrade for unlimited exports.
              </Link>
            ) : (
              <p className="mt-1 text-xs text-gray-500">This account's quota is used up. Ask the Parent account to upgrade.</p>
            )
          )}
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map(({ label, value, prev, icon: Icon }, i) => {
          const g = growth(value, prev);
          return (
            <div key={label} className={`card-gradient ${["grad-navy", "grad-ocean", "grad-indigo", "grad-steel"][i]} p-5`}>
              <div className="relative flex items-center justify-between">
                <p className="text-sm text-white/75">{label}</p>
                <div className="w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="relative mt-2 text-2xl font-extrabold" title={formatRp(value)}>
                <AnimatedNumber value={value} format={formatRpShort} />
              </p>
              <p className="relative text-xs text-white/70 mt-1">
                Previous period {formatRpShort(prev)}
                {g !== null && (
                  <span className={g >= 0 ? "text-emerald-200" : "text-rose-200"}> · {g >= 0 ? "+" : ""}{percent(g)}</span>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {/* Financial statement tables */}
      <section id="tab-reports" className="card-elegant overflow-hidden">
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b px-3 pt-3">
          {[...tables.map((t) => t.title), "Notes to the Financial Statements"].map((j, i) => (
            <button
              key={j}
              onClick={() => setTab(i)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === i ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {j.replace(/^Statement of /, "")}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-5">
            <p className="font-bold text-gray-900">{profile.businessName}</p>
            <p className="font-semibold text-primary">{tab < tables.length ? tables[tab].title : "Notes to the Financial Statements"}</p>
            <p className="text-xs text-gray-500">
              {rep.entity} · {tab === 0 ? `As of ${formatDate(period.to, true)}` : `For the period ${periodLabel(rep)}`} · (in Rupiah)
            </p>
          </div>

          {tab < tables.length ? (
            <ReportTable rows={tables[tab].rows} columns={tables[tab].columns} singleColumn={tables[tab].key === "equity"} />
          ) : (
            <div className="space-y-5 text-sm text-gray-700 max-w-3xl mx-auto">
              {notes.map((c) => (
                <div key={c.title}>
                  <p className="font-semibold text-gray-900 mb-1">{c.title}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {c.items.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Insights */}
      <section className="card-elegant p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Financial Insights</h3>
              <p className="text-sm text-gray-500">Key financial ratios and what they mean for your business.</p>
            </div>
          </div>
          <button
            onClick={() => (auditLock ? showAccess("audit") : navigate("/data-driven"))}
            title={auditLock?.message}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Gauge className="w-4 h-4" /> Check Performance
            {auditLock ? <Lock className="w-3.5 h-3.5 text-white/70" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((x) => (
            <div key={x.title} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">{x.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusColor[x.status]}`}>
                  {statusLabel[x.status]}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-primary">{x.value}</p>
              <p className="mt-1 text-xs text-gray-600">{x.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Part 3: chart analysis ===== */}
      <SectionDivider number={3} title="Chart Analysis" text="Eight perspectives on performance, financial position, and cash flow." />
      <section data-tour="charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Revenue, Expenses, and Profit" sub="Bars = revenue & expenses, line = profit.">
          <ComposedChart data={rep.monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#2f6b8f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
            <Line dataKey="profit" name="Profit" stroke="#13577d" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Monthly Profit Margin Trend" sub={`Annual net profit margin ${percent(ratios.netMargin)}`}>
          <AreaChart data={monthlyMargin}>
            <defs>
              <linearGradient id="gradMargin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#13577d" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#13577d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={44} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Profit margin"]} />
            <Area type="monotone" dataKey="margin" stroke="#13577d" strokeWidth={2.5} fill="url(#gradMargin)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Operating Expense Mix" sub={`Total ${formatRp(S.totalOperatingExpenses)}`}>
          <BarChart data={expenseMix} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f6" />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
            <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Bar dataKey="value" name="Expense" radius={[0, 4, 4, 0]}>
              {expenseMix.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Comparison with Last Year"
          sub={`${currentLabel} vs ${prevLabel}`}
        >
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="item" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="current" name={currentLabel} fill="#012a3d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="prev" name={prevLabel} fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Asset Mix" sub={`Total assets ${formatRp(S.totalAssets)}`}>
          <PieChart>
            <Pie data={assetMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {assetMix.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartCard>

        <ChartCard
          title="Funding Structure"
          sub={`Debt to equity ${ratios.der.toFixed(2)}x`}
        >
          <PieChart>
            <Pie data={fundingStructure} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {fundingStructure.map((_, i) => (
                <Cell key={i} fill={["#9cb2c1", "#5487ab", "#012a3d"][i % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Cash Inflows vs Outflows" sub={`Net operating cash ${formatRp(rep.cashFlow.totalOperating)}`}>
          <BarChart data={rep.monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="cashIn" name="Cash in" fill="#13577d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cashOut" name="Cash out" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Cash Flow by Activity" sub={`Net cash increase ${formatRp(rep.cashFlow.cashIncrease)}`}>
          <BarChart data={cashFlowByActivity}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="activity" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
            <Tooltip formatter={rpTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="current" name={currentLabel} fill="#2f6b8f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="prev" name={prevLabel} fill="#9cb2c1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        {entity === CONSOLIDATED && hasBranches ? (
          <ChartCard title="Revenue Contribution by Branch" sub="Each branch's share of consolidated revenue.">
            <PieChart>
              <Pie data={branchContribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {branchContribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatRp(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartCard>
        ) : (
          <ChartCard title="Monthly Cash Balance" sub={`Opening cash ${formatRp(rep.cashFlow.openingCash)} → closing ${formatRp(rep.cashFlow.closingCash)}`}>
            <AreaChart data={monthlyCashBalance}>
              <defs>
                <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickFormatter={rpAxis} />
              <Tooltip formatter={(v: number) => [formatRp(v), "Cash balance"]} />
              <Area type="monotone" dataKey="balance" stroke="#2f6b8f" strokeWidth={2.5} fill="url(#gradBalance)" />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* user journal entries only affect the account's own entity report */}
      {entity !== own && entries.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Journals you enter are only recorded in the {own} report.
        </p>
      )}
    </div>
  );
}

// Divider between page sections: number, title, and separator line
function SectionDivider({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 pt-4">
      <span className="grad-navy w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-base font-extrabold text-white shadow-md">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-primary leading-tight">{title}</h2>
        <p className="text-xs text-gray-500">{text}</p>
      </div>
      <div className="hidden sm:block h-px flex-1 min-w-[2rem] bg-gradient-to-r from-primary/30 to-transparent" />
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactElement }) {
  return (
    <div className="card-elegant p-5">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{sub}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReportTable({ rows, columns, singleColumn }: { rows: Row[]; columns: [string, string]; singleColumn: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="text-left font-semibold px-3 py-2 rounded-l-lg">Description</th>
            <th className={`text-right font-semibold px-3 py-2 w-44 ${singleColumn ? "rounded-r-lg" : ""}`}>{columns[0]}</th>
            {!singleColumn && <th className="text-right font-semibold px-3 py-2 w-44 rounded-r-lg">{columns[1]}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => {
            const cls =
              b.type === "title"
                ? "font-bold text-primary pt-5"
                : b.type === "subtitle"
                  ? "font-semibold text-gray-800 pt-3"
                  : b.type === "total"
                    ? "font-bold text-gray-900 bg-[#e1ecf3]"
                    : b.type === "subtotal"
                      ? "font-semibold text-gray-900 border-t"
                      : "text-gray-700";
            const pad = b.type === "row" ? "pl-8" : "pl-3";
            return (
              <tr key={i} className={b.type === "row" ? "hover:bg-gray-50" : ""}>
                <td className={`${pad} pr-3 py-1.5 ${cls}`}>{b.label}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${cls}`}>{num(b.value)}</td>
                {!singleColumn && <td className={`px-3 py-1.5 text-right tabular-nums ${cls} ${b.type === "row" ? "text-gray-500" : ""}`}>{num(b.prev)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
