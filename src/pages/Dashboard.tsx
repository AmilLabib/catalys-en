import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Factory,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Wallet,
  PiggyBank,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Tag,
  BarChart2,
  MessagesSquare,
  Lock,
  Store,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { usePageTitle } from "../hooks/usePageTitle";
import AnimatedNumber from "../components/AnimatedNumber";
import { useReport, useOwnEntity } from "../hooks/useReport";
import { useAccount } from "../context/AccountContext";
import { useInventory } from "../context/InventoryContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { formatRp, formatRpShort, computeReport, CURRENT_YEAR } from "../data/reports";
import { FEATURES, type FeatureKey } from "../config/access";
import { CITY_COORDINATES } from "../utils/pricing";
import { useAccess } from "../context/AccessContext";
import { canRender3D, ErrorBoundary3D } from "../components/three/support";
import type { BranchPoint } from "../components/three/IndonesiaMap3D";

// three.js is loaded separately, only when the Parent account opens the home page
const IndonesiaMap3D = lazy(() => import("../components/three/IndonesiaMap3D"));

// Branch pillar colors on the map, in order from the navy tones
const BRANCH_COLORS = ["#012a3d", "#2f6b8f", "#5487ab", "#13577d", "#7193ad", "#9cb2c1", "#0a3f5e"];
const branchColor = (i: number) => BRANCH_COLORS[i % BRANCH_COLORS.length];

const revenueMix = [
  { name: "Online", value: 48 },
  { name: "Offline", value: 32 },
  { name: "Reseller", value: 20 },
];

const mixColors = ["#012a3d", "#2f6b8f", "#9cb2c1"];

function growth(now: number, before: number) {
  if (!before) return 0;
  return ((now - before) / Math.abs(before)) * 100;
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/25 text-rose-100"
      }`}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Dashboard() {
  usePageTitle("Home");
  const rep = useReport(CURRENT_YEAR);
  const entity = useOwnEntity();
  const { lockReason, quotaRemaining, sessions, role, branchList, hasBranches } = useAccount();
  const { showAccess, openBranchDialog } = useAccess();
  const { products } = useInventory();
  const { accounts } = useChartOfAccounts();
  const [use3D] = useState(canRender3D);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(branchList[0]?.name ?? null);

  // Performance of each branch for the branch map (Parent account only)
  const branchPerformance = useMemo(() => {
    if (role !== "parent") return [];
    const data = branchList.map(({ name, city }, i) => {
      const s = computeReport(name, CURRENT_YEAR, [], accounts).summary;
      return { name, city, color: branchColor(i), revenue: s.totalRevenue, profit: s.netProfit };
    });
    const total = data.reduce((s, d) => s + d.revenue, 0) || 1;
    return data.map((d) => ({ ...d, share: d.revenue / total, margin: d.profit / (d.revenue || 1) }));
  }, [role, accounts, branchList]);

  // branches in the same city are offset slightly so their pillars don't overlap
  const mapPoints: BranchPoint[] = branchPerformance.map((d, i) => {
    const [lat, lon] = CITY_COORDINATES[d.city] ?? CITY_COORDINATES.Bogor;
    const nth = branchPerformance.slice(0, i).filter((x) => x.city === d.city).length;
    return { name: d.name, lat: lat - nth * 0.35, lon: lon + nth * 0.35, color: d.color, share: d.share, label: formatRpShort(d.revenue) };
  });

  const S = rep.summary;
  const P = rep.summaryPrev;
  // The current year is compared proportionally (annualized) with last year
  const factor = 12 / rep.ongoingMonth;

  const kpi = [
    {
      label: `Revenue ${rep.year}`,
      value: S.totalRevenue,
      trend: growth(S.totalRevenue * factor, P.totalRevenue),
      note: "vs last year (annualized)",
      icon: TrendingUp,
      grad: "grad-navy",
    },
    {
      label: "Net Profit",
      value: S.netProfit,
      trend: growth(S.netProfit * factor, P.netProfit),
      note: `Margin ${((S.netProfit / (S.totalRevenue || 1)) * 100).toFixed(1)}%`,
      icon: PiggyBank,
      grad: "grad-ocean",
    },
    {
      label: "Total Assets",
      value: S.totalAssets,
      trend: growth(S.totalAssets, P.totalAssets),
      note: "position as of today",
      icon: Wallet,
      grad: "grad-indigo",
    },
    {
      label: "Closing Cash",
      value: rep.cashFlow.closingCash,
      trend: growth(rep.cashFlow.closingCash, rep.cashFlow.openingCash),
      note: "vs opening cash",
      icon: Activity,
      grad: "grad-steel",
    },
  ];

  const lowStock = products.filter((p) => p.qty < 20).length;
  const scheduledSessions = sessions.filter((s) => s.status === "Scheduled").length;

  const modules: {
    key: FeatureKey;
    icon: typeof Factory;
    stats: [string, string][];
    cta: string;
  }[] = [
    {
      key: "cashier",
      icon: ShoppingCart,
      stats: [
        ["Active products", String(products.length)],
        ["Low stock", String(lowStock)],
      ],
      cta: "Open cashier",
    },
    {
      key: "smartPricing",
      icon: Tag,
      stats: [
        ["Market comparison", "5 competitors"],
        ["Average margin", "28%"],
      ],
      cta: "Calculate price",
    },
    {
      key: "financialReports",
      icon: BarChart2,
      stats: [
        ["Operating profit", formatRpShort(S.operatingProfit)],
        ["Current ratio", `${(S.totalCurrentAssets / (S.totalCurrentLiabilities || 1)).toFixed(2)}x`],
      ],
      cta: "View reports",
    },
    {
      key: "internalManagement",
      icon: Factory,
      stats: [
        ["Active employees", "12"],
        ["Low stock", String(lowStock)],
      ],
      cta: "Manage operations",
    },
    {
      key: "audit",
      icon: AlertTriangle,
      stats: [
        ["Risk findings", "5"],
        ["Recommendations", "8"],
      ],
      cta: "View audit",
    },
    {
      key: "consultation",
      icon: MessagesSquare,
      stats: [
        ["Sessions left", String(quotaRemaining("consultation") ?? 0)],
        ["Scheduled sessions", String(scheduledSessions)],
      ],
      cta: "Schedule session",
    },
    {
      key: "msmeGrowth",
      icon: Trophy,
      stats: [
        ["Growth score", "78 / 100"],
        ["Active programs", "4"],
      ],
      cta: "View programs",
    },
    {
      key: "funding",
      icon: ShieldCheck,
      stats: [
        ["Funding access", "6 partners"],
        ["Active loans", "2"],
      ],
      cta: "View options",
    },
  ];

  // every module is shown; ones outside the role/plan show a lock
  const visibleModules = modules;

  return (
    <div className="min-h-screen">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {entity}
          </p>
          <h2 className="text-2xl font-bold text-primary">{rep.year} Performance Summary</h2>
        </div>
        <span className="text-xs text-gray-500">
          Data through month {rep.ongoingMonth} of the current year
        </span>
      </div>

      {/* KPI row */}
      <section data-tour="home-kpi" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpi.map(({ label, value, trend, note, icon: Icon, grad }) => (
          <div key={label} className={`card-gradient ${grad} p-5`}>
            <div className="relative flex items-center justify-between">
              <p className="text-sm text-white/75">{label}</p>
              <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="relative mt-3 text-xl font-extrabold tracking-tight">
              <AnimatedNumber value={value} format={formatRp} />
            </p>
            <div className="relative mt-2 flex items-center gap-2 text-xs text-white/70">
              <Trend value={trend} /> {note}
            </div>
          </div>
        ))}
      </section>

      {/* Business without branches: invitation to open the first branch */}
      {role === "parent" && !hasBranches && (
        <section data-tour="open-branch" className="card-gradient grad-navy p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div className="relative flex-1">
            <h2 className="text-lg font-bold">Ready to grow? Open your first branch</h2>
            <p className="mt-1 text-sm text-white/75">
              Every feature is open right now because your business has no branches yet. Once you open a branch, this store becomes the Main Branch,
              the Parent account monitors every branch, and you can switch accounts from the menu in the top right corner.
            </p>
          </div>
          <button
            onClick={openBranchDialog}
            className="relative shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-white/90"
          >
            <Plus className="w-4 h-4" /> Open Branch
          </button>
        </section>
      )}

      {/* Branch map (Parent only) */}
      {role === "parent" && branchPerformance.length > 0 && (
        <section data-tour="branch-map" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 card-elegant p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Branch Map</h2>
                <p className="text-sm text-gray-500">
                  {use3D ? "Pillar height = revenue share. Click a pillar to see details, or view all of Indonesia." : "Revenue share of each branch."}
                </p>
              </div>
              <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">Indonesia</span>
            </div>
            {use3D ? (
              <ErrorBoundary3D fallback={<p className="py-16 text-center text-sm text-gray-500">The 3D map can't be displayed on this device.</p>}>
                <Suspense fallback={<div className="shimmer h-72 sm:h-80 rounded-xl bg-gray-100" />}>
                  <div className="h-72 sm:h-80 rounded-xl bg-gradient-to-b from-[#f3f8fc] to-white">
                    <IndonesiaMap3D points={mapPoints} selected={selectedBranch} onSelect={setSelectedBranch} />
                  </div>
                </Suspense>
              </ErrorBoundary3D>
            ) : (
              <div className="space-y-3 py-4">
                {branchPerformance.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{d.name}</span>
                      <span className="font-semibold text-primary">{(d.share * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full" style={{ width: `${d.share * 100}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 card-elegant p-5 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Branch Performance {CURRENT_YEAR}</h2>
              <p className="text-sm text-gray-500">Select a branch to highlight it on the map.</p>
            </div>
            {[...branchPerformance]
              .sort((a, b) => b.revenue - a.revenue)
              .map((d, i) => {
                const active = selectedBranch === d.name;
                return (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setSelectedBranch(d.name)}
                    aria-pressed={active}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      active ? "border-primary bg-white shadow-md" : "border-gray-100 bg-white/70 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400">#{i + 1}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Revenue</p>
                        <p className="font-bold text-gray-900">{formatRpShort(d.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Net profit</p>
                        <p className="font-bold text-gray-900">{formatRpShort(d.profit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Share</p>
                        <p className="font-bold text-gray-900">{(d.share * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    {active && (
                      <p className="mt-2 text-xs text-gray-500">
                        Profit margin {(d.margin * 100).toFixed(1)}%
                      </p>
                    )}
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* Chart row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8 card-elegant p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Revenue vs Expense Trend</h2>
              <p className="text-sm text-gray-500">
                Monitor monthly trends to spot anomalies sooner.
              </p>
            </div>
            <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {rep.year}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rep.monthly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5edf3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  width={72}
                  tickFormatter={(v) => formatRpShort(Number(v)).replace("Rp ", "")}
                  tickLine={false}
                  axisLine={false}
                />
                <ReTooltip formatter={(value, name) => [formatRp(Number(value)), name === "revenue" ? "Revenue" : "Expenses"]} />
                <Area type="monotone" dataKey="revenue" stroke="#2f6b8f" strokeWidth={2} fill="url(#gradRevenue)" />
                <Line type="monotone" dataKey="expense" stroke="#9cb2c1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 card-elegant p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Mix</h2>
            <p className="text-sm text-gray-500">Sales channels (estimate).</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {revenueMix.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={mixColors[i % mixColors.length]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {revenueMix.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: mixColors[i % mixColors.length] }} />
                  <span className="text-gray-700">{m.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module summary by role & plan */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleModules.map(({ key, icon: Icon, stats, cta }) => {
          const def = FEATURES[key];
          const lock = lockReason(key);
          const locked = !!lock;
          return (
            <div key={key} className="card-elegant hover-lift p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center chip-gradient">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{def.label}</h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {stats.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-primary">{locked ? "—" : v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-5">
                {lock ? (
                  <button
                    onClick={() => showAccess(key)}
                    title={lock.message}
                    className="btn-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {cta} <Lock className="w-3.5 h-3.5 text-white/70" />
                  </button>
                ) : (
                  <Link
                    to={def.path}
                    className="btn-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
