import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BarChart2,
  Boxes,
  Wallet,
  Megaphone,
  ShieldAlert,
  Info,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
  ReferenceDot,
  Legend,
} from "recharts";
import PillTabs from "../components/PillTabs";
import AnimatedNumber from "../components/AnimatedNumber";
import { useReport } from "../hooks/useReport";
import { useInventory } from "../context/InventoryContext";
import { useBusinessSector } from "../context/BusinessSectorContext";
import { formatRp, formatRpShort, CURRENT_YEAR, CONSOLIDATED, INCOME_STATEMENT } from "../data/reports";
import { computePay, sectorEmployees, initialReviews, workUnits, type Topic } from "../data/internal";
import { useAccount } from "../context/AccountContext";

type Severity = "high" | "medium" | "low";
type Finding = { title: string; detail: string; advice: string; severity: Severity };

const SEVERITY: Record<Severity, { label: string; cls: string; icon: typeof AlertTriangle }> = {
  high: { label: "High risk", cls: "border-red-200 bg-red-50/70 text-red-700", icon: ShieldAlert },
  medium: { label: "Needs attention", cls: "border-amber-200 bg-amber-50/70 text-amber-700", icon: AlertTriangle },
  low: { label: "Note", cls: "border-blue-200 bg-blue-50/70 text-blue-700", icon: Info },
};

const scoreFrom = (f: Finding[]) =>
  Math.max(0, 100 - f.reduce((s, x) => s + (x.severity === "high" ? 25 : x.severity === "medium" ? 12 : 4), 0));

// Sales per hour (sample cashier data)
const SALES_PER_HOUR = [
  { hour: "10:00", n: 32 },
  { hour: "11:00", n: 48 },
  { hour: "12:00", n: 75 },
  { hour: "13:00", n: 68 },
  { hour: "14:00", n: 50 },
  { hour: "15:00", n: 54 },
  { hour: "16:00", n: 70 },
  { hour: "17:00", n: 90 },
  { hour: "18:00", n: 110 },
  { hour: "19:00", n: 135 },
  { hour: "20:00", n: 120 },
  { hour: "21:00", n: 98 },
  { hour: "22:00", n: 60 },
];

const TABS = [
  { key: "finance", label: "Financial Reports", icon: BarChart2 },
  { key: "inventory", label: "Stock", icon: Boxes },
  { key: "payroll", label: "Human Resources", icon: Wallet },
  { key: "marketing", label: "Marketing", icon: Megaphone },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function FindingList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0)
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> No findings. This area is in good shape.
      </div>
    );
  return (
    <ul className="space-y-3">
      {findings.map((t) => {
        const S = SEVERITY[t.severity];
        return (
          <li key={t.title} className={`rounded-xl border p-4 ${S.cls}`}>
            <div className="flex items-center gap-2">
              <S.icon className="w-4 h-4" />
              <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
              <span className="ml-auto text-[11px] font-semibold">{S.label}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{t.detail}</p>
            <p className="text-sm text-gray-900 mt-2">
              <b>Recommendation:</b> {t.advice}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function DataDriven() {
  usePageTitle("Data-Driven Audit");
  const [params, setParams] = useSearchParams();
  const active: TabKey = TABS.some((t) => t.key === params.get("tab")) ? (params.get("tab") as TabKey) : "finance";

  const rep = useReport(CURRENT_YEAR, CONSOLIDATED);
  const { products } = useInventory();
  const { sector } = useBusinessSector();
  const { branchList } = useAccount();
  const auditUnits = workUnits(branchList.map((c) => c.name)).join("|");

  // ---------- Finance ----------
  const finance = useMemo(() => {
    const m = rep.monthly;
    const avgExpense = m.reduce((s, x) => s + x.expense, 0) / (m.length || 1);
    const spike = m
      .map((x, i) => ({ ...x, i }))
      .filter((x) => x.expense > avgExpense * 1.12)
      .sort((a, z) => z.expense - a.expense)[0];
    const losses = m.filter((x) => x.profit < 0);
    const S = rep.summary;
    const findings: Finding[] = [];
    if (spike) {
      findings.push({
        title: `Expense spike in ${spike.month}`,
        detail: `Expenses of ${formatRp(spike.expense)}, ${Math.round((spike.expense / avgExpense - 1) * 100)}% above the monthly average.`,
        advice: "Review that month's expense journals and make sure every expense has supporting documents and approval.",
        severity: spike.expense > avgExpense * 1.25 ? "high" : "medium",
      });
    }
    if (losses.length > 0) {
      findings.push({
        title: `${losses.length} months recorded a loss`,
        detail: `Months: ${losses.map((x) => x.month).join(", ")}.`,
        advice: "Review selling prices and fixed costs in slow months; prepare seasonal promotions.",
        severity: losses.length > 2 ? "high" : "medium",
      });
    }
    const current = S.totalCurrentAssets / (S.totalCurrentLiabilities || 1);
    if (current < 1.2) {
      findings.push({
        title: "Tight liquidity",
        detail: `Current ratio ${current.toFixed(2)}x.`,
        advice: "Speed up receivable collection and postpone non-urgent capital spending.",
        severity: "high",
      });
    }
    const receivableDays = ((rep.balance.receivables || 0) / (S.totalRevenue / rep.ongoingMonth / 30 || 1)) | 0;
    if (receivableDays > 25) {
      findings.push({
        title: "Receivables take fairly long to collect",
        detail: `Receivables are collected in ±${receivableDays} days on average.`,
        advice: "Offer early-payment discounts and send automatic invoice reminders.",
        severity: receivableDays > 45 ? "medium" : "low",
      });
    }
    const largestExpense = INCOME_STATEMENT.operatingExpenses
      .map((p) => ({ label: p.label, v: rep.is[p.key] || 0 }))
      .sort((a, z) => z.v - a.v)[0];
    if (largestExpense && largestExpense.v / (S.totalRevenue || 1) > 0.08) {
      findings.push({
        title: `${largestExpense.label} dominates`,
        detail: `${((largestExpense.v / S.totalRevenue) * 100).toFixed(1)}% of revenue.`,
        advice: "Compare with industry benchmarks and look for efficiency opportunities.",
        severity: "low",
      });
    }
    return { findings, spike };
  }, [rep]);

  // ---------- Inventory ----------
  const inventory = useMemo(() => {
    const findings: Finding[] = [];
    const losing = products.filter((p) => p.sellingPrice < p.unitCost);
    const low = products.filter((p) => p.qty < 20);
    const thin = products.filter((p) => p.sellingPrice >= p.unitCost && (p.sellingPrice - p.unitCost) / (p.sellingPrice || 1) < 0.15);
    if (losing.length)
      findings.push({
        title: `${losing.length} products sold below COGS`,
        detail: losing.map((p) => p.name).slice(0, 5).join(", "),
        advice: "Raise the selling price or recalculate COGS with the COGS Builder.",
        severity: "high",
      });
    if (low.length)
      findings.push({
        title: `${low.length} products are running low`,
        detail: low.map((p) => `${p.name} (${p.qty})`).slice(0, 5).join(", "),
        advice: "Reorder from suppliers before peak sales hours.",
        severity: low.length > 5 ? "medium" : "low",
      });
    if (thin.length)
      findings.push({
        title: `${thin.length} products have thin margins (<15%)`,
        detail: thin.map((p) => p.name).slice(0, 5).join(", "),
        advice: "Use Smart Pricing to compare with market prices.",
        severity: "low",
      });
    const peak = [...SALES_PER_HOUR].sort((a, b) => b.n - a.n)[0];
    findings.push({
      title: `Peak sales hour ${peak.hour}`,
      detail: `${peak.n} transactions per hour on weekends.`,
      advice: "Make sure best-seller stock is secured 2 hours before the peak to avoid lost sales.",
      severity: "low",
    });
    return { findings, peak: peak.hour };
  }, [products]);

  // ---------- Payroll ----------
  const payroll = useMemo(() => {
    const e = sectorEmployees(sector, auditUnits.split("|"));
    const findings: Finding[] = [];
    const absent = 100 - e.reduce((s, x) => s + x.attendance, 0) / e.length;
    const lowAttendance = e.filter((x) => x.attendance < 90);
    if (absent > 8)
      findings.push({
        title: "High absenteeism",
        detail: `On average ${absent.toFixed(1)}% of workdays without on-time attendance.`,
        advice: "Check night shift schedules and set a clear attendance policy.",
        severity: absent > 12 ? "high" : "medium",
      });
    if (lowAttendance.length)
      findings.push({
        title: `${lowAttendance.length} employees have attendance below 90%`,
        detail: lowAttendance.map((x) => `${x.name} (${x.attendance}%)`).join(", "),
        advice: "Hold one-on-one coaching and review workloads.",
        severity: "medium",
      });
    const pay = e.map(computePay);
    const gross = pay.reduce((s, x) => s + x.gross, 0);
    const overtime = e.reduce((s, x) => s + x.overtime, 0);
    if (overtime / gross > 0.06)
      findings.push({
        title: "High overtime costs",
        detail: `Overtime of ${formatRp(overtime)}, or ${((overtime / gross) * 100).toFixed(1)}% of gross pay.`,
        advice: "Rearrange shift schedules or add part-time staff during peak hours.",
        severity: "medium",
      });
    const ratio = (gross * 12) / ((rep.summary.totalRevenue / rep.ongoingMonth) * 12 || 1);
    findings.push({
      title: "Payroll-to-revenue ratio",
      detail: `${(ratio * 100).toFixed(1)}% of revenue.`,
      advice: ratio > 0.2 ? "The ratio is above 20%, review productivity per employee." : "Still within a healthy range for MSMEs (below 20%).",
      severity: ratio > 0.2 ? "medium" : "low",
    });
    const chart = e.map((x) => ({ name: x.name.split(" ")[0], attendance: x.attendance, performance: x.performance }));
    return { findings, chart };
  }, [sector, rep, auditUnits]);

  // ---------- Marketing ----------
  const marketing = useMemo(() => {
    const r = initialReviews();
    const findings: Finding[] = [];
    const neg = r.filter((x) => x.sentiment === "negative");
    const share = neg.length / r.length;
    if (share > 0.15)
      findings.push({
        title: "High share of negative reviews",
        detail: `${Math.round(share * 100)}% of reviews are negative.`,
        advice: "Reply to every negative review within 24 hours and offer a solution.",
        severity: share > 0.25 ? "high" : "medium",
      });
    const topics: Topic[] = ["Taste / Quality", "Price", "Delivery", "Service", "Packaging"];
    const complaint = topics.map((t) => ({ t, n: neg.filter((x) => x.topics.includes(t)).length })).sort((a, b) => b.n - a.n)[0];
    if (complaint.n)
      findings.push({
        title: `Main complaint: ${complaint.t}`,
        detail: `${complaint.n} negative reviews mention this topic.`,
        advice: "See the Marketing tab in Internal Management for a per-platform breakdown.",
        severity: "medium",
      });
    const platform = ["Instagram", "TikTok", "Shopee", "Tokopedia"].map((p) => {
      const xs = r.filter((x) => x.platform === p);
      return { platform: p, rating: xs.reduce((s, x) => s + x.rating, 0) / (xs.length || 1) };
    });
    platform
      .filter((p) => p.rating < 3.8)
      .forEach((p) =>
        findings.push({
          title: `${p.platform} rating below 3.8`,
          detail: `Average of ${p.rating.toFixed(1)} stars.`,
          advice: `Prioritize improving service and chat response on ${p.platform}.`,
          severity: "medium",
        }),
      );
    return { findings, platform };
  }, []);

  const aspects = [
    { key: "finance" as const, label: "Finance", score: scoreFrom(finance.findings) },
    { key: "inventory" as const, label: "Stock", score: scoreFrom(inventory.findings) },
    { key: "payroll" as const, label: "Human Resources", score: scoreFrom(payroll.findings) },
    { key: "marketing" as const, label: "Marketing", score: scoreFrom(marketing.findings) },
  ];
  const totalScore = Math.round(aspects.reduce((s, a) => s + a.score, 0) / aspects.length);
  const all = [...finance.findings, ...inventory.findings, ...payroll.findings, ...marketing.findings];
  const priorities = all.filter((t) => t.severity !== "low").slice(0, 4);
  const consultationNotes = priorities.map((p) => p.title).join("; ");

  return (
    <div className="max-w-[80rem] mx-auto space-y-6">
      <p className="text-sm text-gray-600">
        Anomaly detection and data-driven recommendations from financial reports, inventory, payroll, and marketing.
      </p>

      {/* Top summary */}
      <section id="audit-summary" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="card-gradient grad-navy lg:col-span-5 p-6">
          <div className="relative flex items-center gap-2 mb-3">
            <Gauge className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold">MSME Health Score</h2>
          </div>
          <div className="relative flex items-end gap-2 mb-4">
            <span className="text-5xl font-extrabold">
              <AnimatedNumber value={totalScore} format={String} />
            </span>
            <span className="text-sm text-white/70 mb-2">/ 100</span>
          </div>
          <div className="relative space-y-3">
            {aspects.map((a) => (
              <button key={a.key} onClick={() => setParams({ tab: a.key })} className="w-full text-left">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white/90">{a.label}</span>
                  <span className="text-white/80">{a.score}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${a.score >= 80 ? "bg-emerald-400" : a.score >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${a.score}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="card-elegant lg:col-span-7 p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Strategic Summary</h2>
          {priorities.length === 0 ? (
            <p className="text-sm text-gray-600">No priority findings. Keep up the current performance.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              {priorities.map((t) => (
                <li key={t.title} className="flex gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${t.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
                  <span>
                    <b>{t.title}.</b> {t.advice}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/consultation?topic=${encodeURIComponent("Audit Findings")}&notes=${encodeURIComponent(consultationNotes)}`}
            className="mt-auto pt-4"
          >
            <span className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow">
              Consult a Catalys Expert <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      <PillTabs tabs={TABS} active={active} onChange={(k) => setParams({ tab: k })} />

      {active === "finance" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Revenue & Expense Anomaly Detection</h3>
            <p className="text-xs text-gray-500 mb-3">Consolidated {rep.year}. Red dot = month with an expense spike.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rep.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis width={60} tickFormatter={(v) => formatRpShort(Number(v)).replace("Rp ", "")} tickLine={false} axisLine={false} fontSize={11} />
                  <ReTooltip formatter={(v: number, n: string) => [formatRp(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2f6b8f" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="expense" name="Expenses" stroke="#9cb2c1" strokeWidth={2} dot={{ r: 2 }} />
                  {finance.spike && (
                    <ReferenceDot x={finance.spike.month} y={finance.spike.expense} r={7} fill="#9cb2c1" stroke="#fff" strokeWidth={2} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Link to="/financial" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Open Financial Reports <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <FindingList findings={finance.findings} />
          </div>
        </section>
      )}

      {active === "inventory" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Sales per Hour</h3>
            <p className="text-xs text-gray-500 mb-3">Average weekend cashier transactions. Highlighted bar = peak hour.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SALES_PER_HOUR} barCategoryGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis width={36} tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: number) => [`${v} transactions`, "Count"]} />
                  <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                    {SALES_PER_HOUR.map((x) => (
                      <Cell key={x.hour} fill={x.hour === inventory.peak ? "#5487ab" : "#2f6b8f"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-5">
            <FindingList findings={inventory.findings} />
          </div>
        </section>
      )}

      {active === "payroll" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Employee Attendance & Performance</h3>
            <p className="text-xs text-gray-500 mb-3">Healthy attendance threshold: 90%.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payroll.chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[50, 100]} width={32} tickLine={false} axisLine={false} />
                  <ReTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="attendance" name="Attendance (%)" radius={[4, 4, 0, 0]}>
                    {payroll.chart.map((x) => (
                      <Cell key={x.name} fill={x.attendance < 90 ? "#9cb2c1" : "#2f6b8f"} />
                    ))}
                  </Bar>
                  <Bar dataKey="performance" name="Performance" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/internal-management?tab=payroll" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Open Human Resources <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <FindingList findings={payroll.findings} />
          </div>
        </section>
      )}

      {active === "marketing" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="card-elegant lg:col-span-7 p-6">
            <h3 className="font-semibold mb-1">Average Rating per Platform</h3>
            <p className="text-xs text-gray-500 mb-3">Reviews from Instagram, TikTok, Shopee, and Tokopedia.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketing.platform}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="platform" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 5]} width={28} tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: number) => [v.toFixed(1), "Rating"]} />
                  <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
                    {marketing.platform.map((p) => (
                      <Cell key={p.platform} fill={p.rating < 3.8 ? "#9cb2c1" : "#2f6b8f"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/internal-management?tab=marketing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Open Marketing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <FindingList findings={marketing.findings} />
          </div>
        </section>
      )}
    </div>
  );
}

export default DataDriven;
