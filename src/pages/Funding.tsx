import { useEffect, useMemo, useRef, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  ShieldCheck,
  Banknote,
  Percent,
  Calendar,
  Briefcase,
  Info,
  CheckCircle2,
  FileText,
  Wallet,
  Clock,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useJournal } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { formatRp } from "../data/reports";
import { celebrate } from "../utils/effects";

type ProductType = "KUR" | "Invoice Financing" | "Micro Working Capital";

type LoanProduct = {
  id: string;
  name: string;
  partnerType: "Bank" | "Fintech";
  productType: ProductType;
  logo?: string;
  interestPa: number;
  maxTenorMonths: number;
  processingDays: number;
};

const loanProducts: LoanProduct[] = [
  { id: "p1", name: "Bank Maju - KUR", partnerType: "Bank", productType: "KUR", logo: "/funding-1.png", interestPa: 6.0, maxTenorMonths: 36, processingDays: 7 },
  { id: "p2", name: "FundIndo - Invoice Financing", partnerType: "Fintech", productType: "Invoice Financing", logo: "/funding-3.png", interestPa: 12.5, maxTenorMonths: 12, processingDays: 3 },
  { id: "p3", name: "KreditMikro - Working Capital", partnerType: "Fintech", productType: "Micro Working Capital", logo: "/funding-2.png", interestPa: 18.0, maxTenorMonths: 24, processingDays: 5 },
  { id: "p4", name: "Sinergi Modal - KUR", partnerType: "Bank", productType: "KUR", logo: "/funding-4.png", interestPa: 7.5, maxTenorMonths: 36, processingDays: 10 },
  { id: "p5", name: "DanaCepat - Invoice Financing", partnerType: "Fintech", productType: "Invoice Financing", logo: "/funding-5.png", interestPa: 13.0, maxTenorMonths: 12, processingDays: 2 },
  { id: "p6", name: "MitraKita - Working Capital", partnerType: "Fintech", productType: "Micro Working Capital", logo: "/funding-6.png", interestPa: 15.0, maxTenorMonths: 18, processingDays: 4 },
];

const DESCRIPTIONS: Record<ProductType, { text: string; requirements: string[] }> = {
  KUR: {
    text: "Government-subsidized People's Business Credit (KUR) for productive MSMEs. Low interest and long tenors, suitable for working capital or equipment investment.",
    requirements: [
      "Owner's ID card (KTP) and Family Card",
      "Personal or business tax ID (NPWP)",
      "Business Identification Number (NIB) from OSS",
      "Business has been running for at least 6 months",
      "Financial statements for the last 6 months (exportable from Catalys)",
      "Not currently receiving other productive credit from banks",
    ],
  },
  "Invoice Financing": {
    text: "Bridging funds for invoices customers haven't paid yet. Fast disbursement, repaid when the invoice is paid.",
    requirements: [
      "Owner's ID card (KTP) and tax ID (NPWP)",
      "NIB or business license",
      "Active invoice along with the customer's contract/PO",
      "Bank statements for the last 3 months",
      "The paying customer is a registered business entity",
    ],
  },
  "Micro Working Capital": {
    text: "Unsecured working capital loan from an OJK-licensed lending platform, for short-term stock and operating needs.",
    requirements: [
      "Owner's ID card (KTP) and a selfie holding the ID",
      "Tax ID (NPWP) (for loans above Rp 50 million)",
      "Photo of the business premises",
      "Account statement or transaction history for the last 3 months",
      "Simple income statement",
    ],
  },
};

const METHODS = ["Bank Transfer", "Virtual Account", "Auto-debit", "QRIS"] as const;
type Method = (typeof METHODS)[number];

type Loan = {
  id: string;
  partner: string;
  product: ProductType;
  principal: number;
  interestPa: number;
  tenor: number;
  paid: number; // number of installments already paid
  start: string; // YYYY-MM-DD disbursement
  status: "Processing" | "Active" | "Paid Off";
  method: Method;
};

// Annuity installment: P × r / (1 − (1 + r)^−n)
function installment(principal: number, interestPa: number, tenor: number) {
  const r = interestPa / 100 / 12;
  if (r === 0) return principal / tenor;
  return (principal * r) / (1 - Math.pow(1 + r, -tenor));
}

function remainingPrincipal(p: Loan) {
  const r = p.interestPa / 100 / 12;
  const c = installment(p.principal, p.interestPa, p.tenor);
  const k = p.paid;
  if (r === 0) return Math.max(0, p.principal - c * k);
  return Math.max(0, p.principal * Math.pow(1 + r, k) - (c * (Math.pow(1 + r, k) - 1)) / r);
}

function addMonths(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const STORAGE = "catalys_portfolio_v2";
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const INITIAL: Loan[] = [
  { id: "ln-1", partner: "Bank Maju - KUR", product: "KUR", principal: 30_000_000, interestPa: 6, tenor: 24, paid: 9, start: monthsAgo(9), status: "Active", method: "Auto-debit" },
  { id: "ln-2", partner: "MitraKita - Working Capital", product: "Micro Working Capital", principal: 10_000_000, interestPa: 15, tenor: 12, paid: 4, start: monthsAgo(4), status: "Active", method: "Virtual Account" },
  { id: "ln-3", partner: "DanaCepat - Invoice Financing", product: "Invoice Financing", principal: 8_000_000, interestPa: 13, tenor: 6, paid: 6, start: monthsAgo(14), status: "Paid Off", method: "Bank Transfer" },
];

function Funding() {
  usePageTitle("Funding");
  const { toast } = useToast();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const preScreenLimit = 50_000_000;
  const [amount, setAmount] = useState<number>(20_000_000);
  const [tenor, setTenor] = useState<number>(12);
  type Purpose = "Working Capital" | "Equipment Investment" | "Operations" | "Invoice Financing";
  const [purpose, setPurpose] = useState<Purpose>("Working Capital");
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const [application, setApplication] = useState<LoanProduct | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [portfolio, setPortfolio] = useState<Loan[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL;
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(portfolio));
    } catch {
      // ignore
    }
  }, [portfolio]);

  const filtered = useMemo(
    () =>
      loanProducts
        .map((p) => {
          let score = 100;
          if (p.maxTenorMonths < tenor) score -= 25;
          if (purpose === "Invoice Financing" && p.productType !== "Invoice Financing") score -= 15;
          if (purpose === "Working Capital" && p.productType === "Invoice Financing") score -= 10;
          if (purpose === "Equipment Investment" && p.productType !== "KUR") score -= 10;
          // lower interest is a better fit
          score -= Math.round(p.interestPa / 3);
          score = Math.max(40, Math.min(100, score));
          const effectiveTenor = Math.min(tenor, p.maxTenorMonths);
          const c = installment(amount, p.interestPa, effectiveTenor);
          return { ...p, matchScore: score, effectiveTenor, installment: c, totalInterest: c * effectiveTenor - amount };
        })
        .sort((a, b) => b.matchScore - a.matchScore),
    [amount, tenor, purpose],
  );

  // ---------- automatic journals ----------
  const account = (code: string) => accounts.find((a) => a.code === code)?.id;
  const recordJournal = (description: string, lines: [string | undefined, "debit" | "credit", number][]) => {
    if (lines.some(([a]) => !a)) return;
    const now = Date.now();
    setEntries([
      {
        id: `loan-${now}`,
        date: new Date().toISOString().slice(0, 10),
        description,
        lines: lines.map(([accountId, side, amount], i) => ({ id: `${now}-${i}`, side, accountId: accountId!, amount: Math.round(amount) })),
      },
      ...entries,
    ]);
  };

  const submitApplication = () => {
    if (!application) return;
    const p = filtered.find((x) => x.id === application.id)!;
    setPortfolio((prev) => [
      {
        id: `ln-${Date.now()}`,
        partner: p.name,
        product: p.productType,
        principal: amount,
        interestPa: p.interestPa,
        tenor: p.effectiveTenor,
        paid: 0,
        start: new Date().toISOString().slice(0, 10),
        status: "Processing",
        method: "Bank Transfer",
      },
      ...prev,
    ]);
    toast(`Application to ${p.name} sent. Estimated processing time ${p.processingDays} business days.`);
    celebrate();
    setApplication(null);
    setAgreed(false);
  };

  const approve = (l: Loan) => {
    setPortfolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "Active", start: new Date().toISOString().slice(0, 10) } : x)));
    recordJournal(`Loan disbursement from ${l.partner}`, [
      [account("1.1.1.02") ?? account("1.1.1.01"), "debit", l.principal],
      [account("2.2.2.01"), "credit", l.principal],
    ]);
    toast("Loan approved and funds disbursed (simulation)");
    celebrate("big");
  };

  const payInstallment = (l: Loan) => {
    const c = installment(l.principal, l.interestPa, l.tenor);
    const interest = remainingPrincipal(l) * (l.interestPa / 100 / 12);
    const principal = c - interest;
    const done = l.paid + 1 >= l.tenor;
    setPortfolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, paid: x.paid + 1, status: done ? "Paid Off" : x.status } : x)));
    recordJournal(`Installment #${l.paid + 1} ${l.partner} via ${l.method}`, [
      [account("2.2.2.01"), "debit", principal],
      [account("9.2.2.01"), "debit", interest],
      [account("1.1.1.02") ?? account("1.1.1.01"), "credit", Math.round(principal) + Math.round(interest)],
    ]);
    toast(`Installment of ${formatRp(Math.round(c))} paid via ${l.method}${done ? ". Loan paid off!" : ""}`);
  };

  const payOff = (l: Loan) => {
    const remaining = Math.round(remainingPrincipal(l));
    if (!confirm(`Pay off ${formatRp(remaining)} now via ${l.method}?`)) return;
    setPortfolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, paid: x.tenor, status: "Paid Off" } : x)));
    recordJournal(`Early repayment of ${l.partner} via ${l.method}`, [
      [account("2.2.2.01"), "debit", remaining],
      [account("1.1.1.02") ?? account("1.1.1.01"), "credit", remaining],
    ]);
    toast("Loan paid off successfully");
    celebrate("big");
  };

  const active = portfolio.filter((l) => l.status === "Active");
  const totalRemaining = active.reduce((s, l) => s + remainingPrincipal(l), 0);
  const totalInstallments = active.reduce((s, l) => s + installment(l.principal, l.interestPa, l.tenor), 0);

  const STATUS_CLS = {
    Processing: "bg-amber-50 text-amber-700 ring-amber-200",
    Active: "bg-blue-50 text-blue-700 ring-blue-200",
    "Paid Off": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  const selected = application ? filtered.find((x) => x.id === application.id) : undefined;

  return (
    <div className="max-w-[80rem] mx-auto">
      <p className="text-sm text-gray-600 mb-6">
        Catalys is not a lender. We're a trusted bridge to legal partners (banks and OJK-licensed P2P platforms) with data-driven recommendations to
        protect MSMEs from illegal loans.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="card-elegant lg:col-span-5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Financial Health & Limit</h2>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Based on last quarter's financial performance, you're eligible for funding of up to:</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-800">{formatRp(preScreenLimit)}</p>
            <span className="mt-3 inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border border-blue-300 bg-white text-blue-700">
              <ShieldCheck className="w-4 h-4" /> Data verified by the Catalys Audit System
            </span>
          </div>
          {active.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Outstanding active loans {formatRp(Math.round(totalRemaining))}. Total monthly installments {formatRp(Math.round(totalInstallments))}.
            </p>
          )}
        </section>

        <section className="card-elegant lg:col-span-7 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Loan Simulation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700 mb-1">Amount needed</p>
              <input type="range" min={1_000_000} max={preScreenLimit} step={500_000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full" />
              <p className="mt-1 text-sm font-semibold text-primary">{formatRp(amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-1">Tenor (term)</p>
              <select className="border rounded-lg px-3 py-2 w-full" value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>
                {[6, 12, 24, 36].map((t) => (
                  <option key={t} value={t}>
                    {t} months
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-700 mb-1">Financing purpose</p>
              <select className="border rounded-lg px-3 py-2 w-full" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                <option>Working Capital</option>
                <option>Equipment Investment</option>
                <option>Operations</option>
                <option>Invoice Financing</option>
              </select>
            </div>
            {filtered[0] && (
              <div className="md:col-span-2 rounded-xl bg-primary/5 p-3 text-sm">
                Best recommendation <b>{filtered[0].name}</b>: installments of about <b>{formatRp(Math.round(filtered[0].installment))}</b>/month for{" "}
                {filtered[0].effectiveTenor} months, total interest {formatRp(Math.round(filtered[0].totalInterest))}.
              </div>
            )}
          </div>
        </section>

        <section className="card-elegant lg:col-span-12 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Recommended Partners</h2>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => carouselRef.current?.scrollBy({ left: -Math.floor((carouselRef.current?.clientWidth ?? 0) * 0.8), behavior: "smooth" })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md border hidden md:inline-flex"
            >
              ‹
            </button>
            <div ref={carouselRef} className="flex gap-6 overflow-x-auto scroll-smooth py-2 px-1 snap-x snap-mandatory" role="list">
              {filtered.map((p) => (
                <div key={p.id} role="listitem" className="card-elegant snap-start flex-shrink-0 w-[90%] sm:w-[70%] md:w-80 lg:w-96 overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b">
                    <img src={p.logo} alt={p.name} className="w-10 h-10 rounded" />
                    <div className="min-w-0">
                      <p className="font-semibold text-primary truncate">{p.name}</p>
                      <p className="text-xs text-gray-600">Registered & supervised by OJK · {p.partnerType}</p>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="inline-flex items-center gap-1">
                      <Percent className="w-4 h-4 text-blue-700" /> Interest {p.interestPa}% p.a.
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-700" /> Max tenor {p.maxTenorMonths} mo
                    </div>
                    <div className="inline-flex items-center gap-1 col-span-2">
                      <Info className="w-4 h-4 text-blue-700" /> {p.processingDays}-day processing · installments ±{formatRp(Math.round(p.installment))}/mo
                    </div>
                    {p.maxTenorMonths < tenor && (
                      <p className="col-span-2 text-xs text-amber-700">Tenor capped at {p.maxTenorMonths} months by the partner.</p>
                    )}
                    <div className="col-span-2 mt-1">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">{p.matchScore}% match</span>
                    </div>
                    <button
                      onClick={() => {
                        setAgreed(false);
                        setApplication(p);
                      }}
                      className="col-span-2 mt-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-95"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Next"
              onClick={() => carouselRef.current?.scrollBy({ left: Math.floor((carouselRef.current?.clientWidth ?? 0) * 0.8), behavior: "smooth" })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md border hidden md:inline-flex"
            >
              ›
            </button>
          </div>
        </section>

        {/* Loan portfolio */}
        <section className="card-elegant lg:col-span-12 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-semibold">Loan Portfolio</h2>
            </div>
            <p className="text-sm text-gray-500">
              {active.length} active · {portfolio.filter((l) => l.status === "Paid Off").length} paid off · {portfolio.filter((l) => l.status === "Processing").length} processing
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {portfolio.map((l) => {
              const c = installment(l.principal, l.interestPa, l.tenor);
              const remaining = remainingPrincipal(l);
              const pct = (l.paid / l.tenor) * 100;
              return (
                <div key={l.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{l.partner}</p>
                      <p className="text-xs text-gray-500">
                        {l.product} · interest {l.interestPa}% p.a.
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_CLS[l.status]}`}>{l.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-gray-500">Principal</p>
                      <p className="font-semibold">{formatRp(l.principal)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Tenor</p>
                      <p className="font-semibold">{l.tenor} months</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Installment/month</p>
                      <p className="font-semibold">{formatRp(Math.round(c))}</p>
                    </div>
                  </div>
                  {l.status !== "Processing" && (
                    <>
                      <div className="mt-3 flex justify-between text-xs text-gray-600">
                        <span>
                          Paid {l.paid}/{l.tenor} installments
                        </span>
                        <span>Remaining principal {formatRp(Math.round(remaining))}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${l.status === "Paid Off" ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                  {l.status === "Active" && (
                    <>
                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5" /> Next due date {addMonths(l.start, l.paid + 1)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={l.method}
                          onChange={(e) => setPortfolio((prev) => prev.map((x) => (x.id === l.id ? { ...x, method: e.target.value as Method } : x)))}
                          className="border rounded-lg px-2 py-1.5 text-sm"
                          aria-label="Payment method"
                        >
                          {METHODS.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                        <button onClick={() => payInstallment(l)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
                          Pay Installment
                        </button>
                        <button onClick={() => payOff(l)} className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary">
                          Pay Off Now
                        </button>
                      </div>
                    </>
                  )}
                  {l.status === "Processing" && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">Applied {new Date(l.start).toLocaleDateString("en-US")}, awaiting partner verification.</p>
                      <button onClick={() => approve(l)} className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                        Approve (demo)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">Disbursements, installments, and payoffs are automatically recorded as journals (bank loans, interest expense, cash).</p>
        </section>

        <section className="lg:col-span-12 rounded-2xl p-4 border border-blue-200 bg-blue-50">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <p className="text-sm text-blue-800">Catalys only partners with legal institutions. Avoid illegal online loans that aren't registered with OJK.</p>
          </div>
        </section>
      </div>

      <Modal isOpen={!!application} onClose={() => setApplication(null)} title="Apply for Financing" wide>
        {application && selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img src={application.logo} alt="" className="w-12 h-12 rounded" />
              <div>
                <p className="font-semibold text-primary">{application.name}</p>
                <p className="text-xs text-gray-500">
                  {application.productType} · OJK-licensed {application.partnerType}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Description</p>
              <p className="text-sm text-gray-700">{DESCRIPTIONS[application.productType].text}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Requirements
              </p>
              <ul className="space-y-1.5">
                {DESCRIPTIONS[application.productType].requirements.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-primary/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-gray-500">Amount</p>
                <p className="font-semibold">{formatRp(amount)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Tenor</p>
                <p className="font-semibold">{selected.effectiveTenor} months</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Installment/month</p>
                <p className="font-semibold">{formatRp(Math.round(selected.installment))}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Total interest</p>
                <p className="font-semibold">{formatRp(Math.round(selected.totalInterest))}</p>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              I agree to share my business data and financial statements in Catalys with {application.name} for credit analysis purposes.
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setApplication(null)} className="rounded-full border px-4 py-2 text-sm">
                Cancel
              </button>
              <button disabled={!agreed} onClick={submitApplication} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Submit Application
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Funding;
