// Sample journals from the start of (current year − 3) up to today.
//
// These journals are a BREAKDOWN of the report model figures (computeReport), not
// additions: each entry is flagged `sample: true` and skipped when posting
// so revenue/expenses aren't counted twice. Total revenue, COGS, and
// expenses per year match the figures in the Income Statement.
import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry } from "../context/JournalContext";
import { computeReport, CURRENT_YEAR, type Values } from "./reports";

const NONE: JournalEntry[] = [];

function random(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Split a total into n random parts whose sum stays the same
function split(total: number, n: number, seed: number) {
  const weights = Array.from({ length: n }, (_, i) => 0.6 + random(seed + i));
  const sumW = weights.reduce((s, x) => s + x, 0);
  const parts = weights.map((w) => Math.round(((total * w) / sumW) / 1000) * 1000);
  parts[n - 1] += total - parts.reduce((s, x) => s + x, 0);
  return parts;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildSampleJournals(entity: string, accounts: Account[]): JournalEntry[] {
  const id = (code: string) => accounts.find((a) => a.code === code)?.id;
  const A = {
    cash: id("1.1.1.01"),
    bank: id("1.1.1.02") ?? id("1.1.1.01"),
    receivables: id("1.1.2.01"),
    inventory: id("1.1.4.01"),
    accum: id("1.3.5.02"),
    allowance: id("1.1.3.01"),
    sales: id("4.2.1.01"),
    services: id("4.2.9.01") ?? id("4.2.1.01"),
    cogs: id("5.1.1.01"),
    salary: id("6.1.1.01"),
    supplies: id("6.1.2.01"),
    maintenance: id("6.1.3.01"),
    electricity: id("6.1.4.01"),
    rent: id("6.1.5.01"),
    security: id("6.1.6.01"),
    badDebt: id("6.1.7.01"),
    depreciation: id("6.1.8.03"),
    admin: id("6.1.9.99"),
    ads: id("6.2.2.01"),
    otherIncome: id("9.1.1.01"),
    interest: id("9.2.2.01"),
    tax: id("9.3.1.07"),
  };
  if (Object.values(A).some((v) => !v)) return NONE;

  const result: JournalEntry[] = [];
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  const record = (date: string, description: string, rows: [string | undefined, "debit" | "credit", number][]) => {
    // current-month transactions whose date hasn't passed yet are recorded as of today
    if (date > today) date = today;
    if (rows.some(([, , v]) => v <= 0)) return;
    const k = n++;
    result.push({
      id: `sample-${entity}-${k}`,
      date,
      description,
      sample: true,
      lines: rows.map(([accountId, side, amount], i) => ({ id: `c${k}-${i}`, side, accountId: accountId!, amount })),
    });
  };

  for (let year = CURRENT_YEAR - 3; year <= CURRENT_YEAR; year++) {
    const rep = computeReport(entity, year, NONE, accounts);
    const is: Values = rep.is;
    const months = rep.ongoingMonth;
    const totalRevenue = (is.sales || 0) + (is.services || 0);
    const servicesShare = totalRevenue ? (is.services || 0) / totalRevenue : 0;
    // expenses are spread evenly per month, rounding remainder goes to the last month
    const perMonth = (v: number, m: number) => {
      const base = Math.round(v / months / 1000) * 1000;
      return m === months - 1 ? v - base * (months - 1) : base;
    };
    // revenue & COGS are split following the seasonal pattern in rep.monthly
    const monthlyTotal = rep.monthly.reduce((s, b) => s + b.revenue, 0) || 1;

    for (let m = 0; m < months; m++) {
      // current month: days 1–28 are scaled to 1–today so they don't pile up on today
      const thisMonth = `${year}-${pad(m + 1)}` === today.slice(0, 7);
      const todayDay = Number(today.slice(8, 10));
      const date = (d: number) => {
        const day = thisMonth ? Math.max(1, Math.ceil((Math.min(d, 28) * todayDay) / 28)) : Math.min(d, 28);
        return `${year}-${pad(m + 1)}-${pad(day)}`;
      };
      const seed = year * 100 + m;
      const monthRevenue = Math.round((totalRevenue * (rep.monthly[m].revenue / monthlyTotal)) / 1000) * 1000;
      const monthServices = Math.round((monthRevenue * servicesShare) / 1000) * 1000;
      const monthSales = monthRevenue - monthServices;
      const monthCogs = Math.round(((is.cogs || 0) * (rep.monthly[m].revenue / monthlyTotal)) / 1000) * 1000;

      // sales: 6 transactions per month, some on credit (receivables)
      const sales = split(monthSales, 6, seed);
      const costs = split(monthCogs, 6, seed + 50);
      sales.forEach((v, i) => {
        const day = 2 + i * 5 + Math.floor(random(seed + i * 3) * 3);
        const credit = i % 3 === 2;
        record(date(day), credit ? "Credit sale to reseller" : "Daily cash sales", [
          [credit ? A.receivables : A.cash, "debit", v],
          [A.sales, "credit", v],
        ]);
        record(date(day), "Recording COGS for sales", [
          [A.cogs, "debit", costs[i]],
          [A.inventory, "credit", costs[i]],
        ]);
      });
      record(date(18), "Service revenue (custom orders)", [
        [A.bank, "debit", monthServices],
        [A.services, "credit", monthServices],
      ]);
      // inventory purchases to replace what was sold
      record(date(4), "Purchase of raw materials and inventory", [
        [A.inventory, "debit", monthCogs],
        [A.bank, "credit", monthCogs],
      ]);

      const expenses: [keyof typeof A, number, number, string][] = [
        ["salary", is.salaryExpense || 0, 25, "Employee salary payment"],
        ["rent", is.rentExpense || 0, 1, "Business premises rent payment"],
        ["electricity", is.utilitiesExpense || 0, 10, "Electricity, water, and internet payment"],
        ["ads", is.marketingExpense || 0, 7, "Social media advertising"],
        ["admin", is.adminExpense || 0, 15, "General and administrative costs"],
        ["supplies", is.suppliesExpense || 0, 12, "Purchase of supplies and stationery"],
        ["maintenance", is.maintenanceExpense || 0, 20, "Equipment repair and maintenance"],
        ["security", is.securityExpense || 0, 5, "Security and cleaning fees"],
      ];
      for (const [account, total, day, desc] of expenses) {
        record(date(day), desc, [
          [A[account], "debit", perMonth(total, m)],
          [A.cash, "credit", perMonth(total, m)],
        ]);
      }
      record(date(28), "Monthly fixed asset depreciation", [
        [A.depreciation, "debit", perMonth(is.depreciationExpense || 0, m)],
        [A.accum, "credit", perMonth(is.depreciationExpense || 0, m)],
      ]);
      record(date(28), "Allowance for doubtful accounts", [
        [A.badDebt, "debit", perMonth(is.badDebtExpense || 0, m)],
        [A.allowance, "credit", perMonth(is.badDebtExpense || 0, m)],
      ]);
      record(date(26), "Bank interest received", [
        [A.bank, "debit", perMonth(is.otherIncome || 0, m)],
        [A.otherIncome, "credit", perMonth(is.otherIncome || 0, m)],
      ]);
      record(date(27), "Bank loan interest payment", [
        [A.interest, "debit", perMonth(is.otherExpense || 0, m)],
        [A.bank, "credit", perMonth(is.otherExpense || 0, m)],
      ]);
      record(date(15), "Payment of 0.5% final income tax on turnover", [
        [A.tax, "debit", perMonth(is.incomeTax || 0, m)],
        [A.bank, "credit", perMonth(is.incomeTax || 0, m)],
      ]);
    }
  }
  return result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
