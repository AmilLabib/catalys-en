// Financial report engine in SAK EMKM format.
//
// Base balances for each year come from a (deterministic) sample data model, then
// journals entered by the user (Journal Entries, Cashier, Receipt Scan) are posted to
// report line items based on the account code prefix in the Chart of Accounts. The cash
// flow is built with the indirect method from balance sheet changes so it always
// reconciles opening cash to closing cash.

import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry } from "../context/JournalContext";
import { MAIN_BRANCH } from "../config/access";

export type PosDef = { key: string; label: string; prefixes: string[] };

export const BALANCE_SHEET = {
  currentAssets: [
    { key: "cash", label: "Cash and cash equivalents", prefixes: ["1.1.1"] },
    { key: "receivables", label: "Accounts receivable", prefixes: ["1.1.2"] },
    { key: "allowance", label: "Allowance for doubtful accounts", prefixes: ["1.1.3"] },
    { key: "inventory", label: "Inventory", prefixes: ["1.1.4"] },
    { key: "prepaid", label: "Prepaid expenses and taxes", prefixes: ["1.1.5"] },
    { key: "otherCurrentAssets", label: "Other current assets", prefixes: ["1.1.8", "1.1.9"] },
  ],
  nonCurrentAssets: [
    { key: "investments", label: "Investments", prefixes: ["1.2", "1.5"] },
    { key: "fixedAssets", label: "Fixed assets (at cost)", prefixes: ["1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.9"] },
    { key: "accumDepreciation", label: "Accumulated depreciation", prefixes: ["1.3.5"] },
    { key: "intangibles", label: "Intangible assets (net)", prefixes: ["1.4"] },
    { key: "otherAssets", label: "Other assets", prefixes: ["1.9"] },
  ],
  currentLiabilities: [
    { key: "accountsPayable", label: "Accounts payable", prefixes: ["2.1.3"] },
    { key: "taxPayable", label: "Taxes payable", prefixes: ["2.1.4"] },
    { key: "salariesPayable", label: "Salaries and benefits payable", prefixes: ["2.1.5"] },
    { key: "accruedExpenses", label: "Accrued expenses", prefixes: ["2.1.6"] },
    { key: "unearnedRevenue", label: "Unearned revenue", prefixes: ["2.1.7"] },
    { key: "otherCurrentLiabilities", label: "Other short-term liabilities", prefixes: ["2.1.1", "2.1.2", "2.1.8", "2.1.9"] },
  ],
  longTermLiabilities: [
    { key: "bankLoans", label: "Bank loans", prefixes: ["2.2.2"] },
    { key: "otherLongTermLiabilities", label: "Other long-term liabilities", prefixes: ["2.2.1", "2.2.9"] },
  ],
  equity: [
    { key: "capital", label: "Paid-in capital", prefixes: ["3.1", "3.2"] },
    { key: "reserves", label: "Reserves", prefixes: ["3.3"] },
    { key: "retainedEarnings", label: "Retained earnings", prefixes: ["3.4", "3.9"] },
  ],
} satisfies Record<string, PosDef[]>;

export const INCOME_STATEMENT = {
  revenue: [
    { key: "sales", label: "Sales of goods", prefixes: ["4.1.1", "4.1.2", "4.2.1", "4.2.2"] },
    { key: "services", label: "Service revenue", prefixes: ["4.1.3", "4.1.9", "4.2.3", "4.2.9"] },
  ],
  cogs: [{ key: "cogs", label: "Cost of goods sold", prefixes: ["5"] }],
  operatingExpenses: [
    { key: "salaryExpense", label: "Salaries and benefits expense", prefixes: ["6.1.1"] },
    { key: "suppliesExpense", label: "Supplies and stationery expense", prefixes: ["6.1.2"] },
    { key: "maintenanceExpense", label: "Maintenance and repairs expense", prefixes: ["6.1.3"] },
    { key: "utilitiesExpense", label: "Electricity, phone, and utilities expense", prefixes: ["6.1.4"] },
    { key: "rentExpense", label: "Rent and insurance expense", prefixes: ["6.1.5"] },
    { key: "securityExpense", label: "Security and cleaning expense", prefixes: ["6.1.6"] },
    { key: "badDebtExpense", label: "Bad debt expense", prefixes: ["6.1.7"] },
    { key: "depreciationExpense", label: "Depreciation and amortization expense", prefixes: ["6.1.8"] },
    { key: "adminExpense", label: "General and administrative expense", prefixes: ["6.1.9"] },
    { key: "marketingExpense", label: "Marketing expense", prefixes: ["6.2"] },
  ],
  other: [
    { key: "otherIncome", label: "Other income", prefixes: ["9.1"] },
    { key: "otherExpense", label: "Other expenses (incl. interest)", prefixes: ["9.2"] },
  ],
  tax: [{ key: "incomeTax", label: "Income tax expense (0.5% final tax)", prefixes: ["9.3"] }],
} satisfies Record<string, PosDef[]>;

const ALL_BALANCE = Object.values(BALANCE_SHEET).flat();
const ALL_IS = Object.values(INCOME_STATEMENT).flat();

export type Values = Record<string, number>;

export type Summary = {
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  profitBeforeTax: number;
  netProfit: number;
};

export type CashFlow = {
  operating: { label: string; value: number }[];
  investing: { label: string; value: number }[];
  financing: { label: string; value: number }[];
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  cashIncrease: number;
  openingCash: number;
  closingCash: number;
};

export type EquityChanges = {
  openingCapital: number;
  capitalContribution: number;
  closingCapital: number;
  openingReserves: number;
  closingReserves: number;
  openingRetainedEarnings: number;
  netProfit: number;
  drawings: number;
  closingRetainedEarnings: number;
  openingTotal: number;
  closingTotal: number;
};

export type Monthly = {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
  cashIn: number;
  cashOut: number;
};

export type Report = {
  year: number;
  entity: string;
  ongoing: boolean;
  ongoingMonth: number;
  balance: Values;
  balancePrev: Values;
  is: Values;
  isPrev: Values;
  summary: Summary;
  summaryPrev: Summary;
  cashFlow: CashFlow;
  cashFlowPrev: CashFlow;
  equity: EquityChanges;
  monthly: Monthly[];
  // only present on date range reports (computeRangeReport)
  period?: {
    from: string;
    to: string;
    days: number;
    label: string;
    periodColumns: [string, string];
    positionColumns: [string, string];
  };
};

export const CONSOLIDATED = "Consolidated";

// The active branch list is set by AccountContext (branches can be opened at any time).
// Without branches, "Consolidated" means the parent's single business = Main Branch.
let BRANCH_LIST: string[] = [];

export function setBranchList(list: string[]) {
  if (list.join("|") === BRANCH_LIST.join("|")) return;
  BRANCH_LIST = [...list];
  modelCache.clear();
}

export function entityList() {
  return [CONSOLIDATED, ...BRANCH_LIST];
}

// Sample data scale per branch. Main Branch = full scale of the original store; new branches
// 30–55% of it (stable per name). Consolidated = sum of all branches.
function branchShare(name: string) {
  if (name === MAIN_BRANCH) return 1;
  const h = Array.from(name).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
  return 0.3 + (h % 1000) / 4000;
}

// Entity name for report titles
export function entityLabel(entity: string) {
  return entity === CONSOLIDATED && !BRANCH_LIST.length ? "Entire business" : entity;
}

function entityShare(entity: string) {
  if (entity !== CONSOLIDATED) return branchShare(entity);
  return BRANCH_LIST.length ? BRANCH_LIST.reduce((t, c) => t + branchShare(c), 0) : 1;
}

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NOW = new Date();
export const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const MODEL_START_YEAR = CURRENT_YEAR - 4;
export const AVAILABLE_YEARS = [3, 2, 1, 0].map((i) => CURRENT_YEAR - i);

const r = (x: number) => Math.round(x / 1000) * 1000;

// ---------- Base data model ----------

type Snapshot = { balance: Values; is: Values };

function baseModel(share: number): Record<number, Snapshot> {
  const result: Record<number, Snapshot> = {};
  let retainedEarnings = r(120e6 * share);
  let accum = r(90e6 * share);

  for (let y = MODEL_START_YEAR; y <= CURRENT_YEAR; y++) {
    const i = y - MODEL_START_YEAR;
    const frac = y === CURRENT_YEAR ? CURRENT_MONTH / 12 : 1;
    const g = Math.pow(1.12, i);
    const salesA = 1.05e9 * g * share;
    const servicesA = 0.15e9 * g * share;
    const revA = salesA + servicesA;
    const fixedAssets = r(800e6 * share * (1 + 0.08 * i));
    const bankLoans = r(Math.max(60e6, 300e6 * (1 - 0.15 * i)) * share);

    const is: Values = {
      sales: r(salesA * frac),
      services: r(servicesA * frac),
      cogs: r(salesA * 0.58 * frac),
      salaryExpense: r(revA * 0.1 * frac),
      suppliesExpense: r(revA * 0.012 * frac),
      maintenanceExpense: r(revA * 0.008 * frac),
      utilitiesExpense: r(revA * 0.02 * frac),
      rentExpense: r(revA * 0.03 * frac),
      securityExpense: r(revA * 0.006 * frac),
      badDebtExpense: r(revA * 0.003 * frac),
      depreciationExpense: r(fixedAssets * 0.1 * frac),
      adminExpense: r(revA * 0.015 * frac),
      marketingExpense: r(revA * 0.025 * frac),
      otherIncome: r(revA * 0.004 * frac),
      otherExpense: r(bankLoans * 0.09 * frac),
      incomeTax: r(revA * frac * 0.005),
    };
    const profit = incomeSummary(is).netProfit;
    const drawings = r(Math.max(0, profit) * 0.6);
    retainedEarnings += profit - drawings;
    accum += is.depreciationExpense;

    const n: Values = {
      receivables: r(revA * 0.08),
      allowance: -r(revA * 0.08 * 0.03),
      inventory: r(salesA * 0.58 * 0.1),
      prepaid: r(revA * 0.01),
      otherCurrentAssets: r(revA * 0.005),
      investments: r(50e6 * share),
      fixedAssets,
      accumDepreciation: -accum,
      intangibles: r(30e6 * share),
      otherAssets: r(10e6 * share),
      accountsPayable: r(salesA * 0.58 * 0.07),
      taxPayable: r((revA * 0.005) / 12),
      salariesPayable: r((revA * 0.1) / 12),
      accruedExpenses: r((revA * 0.02) / 12),
      unearnedRevenue: r(revA * 0.005),
      otherCurrentLiabilities: r(40e6 * share),
      bankLoans,
      otherLongTermLiabilities: r(60e6 * share),
      capital: r(600e6 * share),
      reserves: r(50e6 * share),
      retainedEarnings,
    };
    // Cash as the balancing figure so assets = liabilities + equity
    const others = sum(n, [...BALANCE_SHEET.currentAssets, ...BALANCE_SHEET.nonCurrentAssets].filter((p) => p.key !== "cash"));
    const side = sum(n, [...BALANCE_SHEET.currentLiabilities, ...BALANCE_SHEET.longTermLiabilities, ...BALANCE_SHEET.equity]);
    n.cash = side - others;
    result[y] = { balance: n, is };
  }
  return result;
}

const modelCache = new Map<string, Record<number, Snapshot>>();
function model(entity: string) {
  if (!modelCache.has(entity)) modelCache.set(entity, baseModel(entityShare(entity)));
  return modelCache.get(entity)!;
}

// ---------- Utilities ----------

function sum(n: Values, pos: PosDef[]) {
  return pos.reduce((s, p) => s + (n[p.key] || 0), 0);
}

function incomeSummary(is: Values) {
  const totalRevenue = sum(is, INCOME_STATEMENT.revenue);
  const grossProfit = totalRevenue - (is.cogs || 0);
  const totalOperatingExpenses = sum(is, INCOME_STATEMENT.operatingExpenses);
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const profitBeforeTax = operatingProfit + (is.otherIncome || 0) - (is.otherExpense || 0);
  const netProfit = profitBeforeTax - (is.incomeTax || 0);
  return { totalRevenue, grossProfit, totalOperatingExpenses, operatingProfit, profitBeforeTax, netProfit };
}

function summarize(n: Values, is: Values): Summary {
  const totalCurrentAssets = sum(n, BALANCE_SHEET.currentAssets);
  const totalNonCurrentAssets = sum(n, BALANCE_SHEET.nonCurrentAssets);
  const totalCurrentLiabilities = sum(n, BALANCE_SHEET.currentLiabilities);
  const totalLongTermLiabilities = sum(n, BALANCE_SHEET.longTermLiabilities);
  return {
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets: totalCurrentAssets + totalNonCurrentAssets,
    totalCurrentLiabilities,
    totalLongTermLiabilities,
    totalLiabilities: totalCurrentLiabilities + totalLongTermLiabilities,
    totalEquity: sum(n, BALANCE_SHEET.equity),
    ...incomeSummary(is),
  };
}

function findPos(code: string, pos: PosDef[]) {
  // the longest matching prefix wins
  let best: PosDef | undefined;
  let bestLen = -1;
  for (const p of pos) {
    for (const pre of p.prefixes) {
      if ((code === pre || code.startsWith(pre + ".")) && pre.length > bestLen) {
        best = p;
        bestLen = pre.length;
      }
    }
  }
  return best;
}

// Journal posting: balance sheet cumulative to year end, income statement for that year only.
function post(
  snap: Snapshot,
  year: number,
  entries: JournalEntry[],
  accounts: Account[],
): Snapshot {
  const balance = { ...snap.balance };
  const is = { ...snap.is };
  const byId = new Map(accounts.map((a) => [a.id, a]));

  for (const e of entries) {
    if (e.sample) continue;
    const y = Number((e.date || "").slice(0, 4));
    if (!y || y > year) continue;
    for (const l of e.lines) {
      const acc = byId.get(l.accountId);
      if (!acc || !(l.amount > 0)) continue;
      const debit = l.side === "debit";
      if (acc.type === "asset" || acc.type === "liability" || acc.type === "equity") {
        const p = findPos(acc.code, ALL_BALANCE);
        if (!p) continue;
        const up = acc.type === "asset" ? debit : !debit;
        balance[p.key] = (balance[p.key] || 0) + (up ? l.amount : -l.amount);
      } else {
        const p = findPos(acc.code, ALL_IS);
        if (!p) continue;
        const up = acc.type === "revenue" ? !debit : debit;
        const delta = up ? l.amount : -l.amount;
        // effect on profit: revenue adds, expenses subtract
        const toProfit = acc.type === "revenue" ? delta : -delta;
        balance.retainedEarnings = (balance.retainedEarnings || 0) + toProfit;
        if (y === year) is[p.key] = (is[p.key] || 0) + delta;
      }
    }
  }
  return { balance, is };
}

function buildCashFlow(n: Values, prev: Values, is: Values): CashFlow {
  const d = (k: string) => (n[k] || 0) - (prev[k] || 0);
  const profit = incomeSummary(is).netProfit;
  const drawings = (prev.retainedEarnings || 0) + profit - (n.retainedEarnings || 0);

  const operating = [
    { label: "Net profit", value: profit },
    { label: "Depreciation of fixed assets", value: -d("accumDepreciation") },
    { label: "(Increase) decrease in accounts receivable", value: -(d("receivables") + d("allowance")) },
    { label: "(Increase) decrease in inventory", value: -d("inventory") },
    { label: "(Increase) decrease in other current assets", value: -(d("prepaid") + d("otherCurrentAssets")) },
    { label: "Increase (decrease) in accounts payable", value: d("accountsPayable") },
    {
      label: "Increase (decrease) in taxes payable and accrued expenses",
      value: d("taxPayable") + d("salariesPayable") + d("accruedExpenses") + d("unearnedRevenue"),
    },
  ];
  const investing = [
    { label: "Acquisition of fixed assets", value: -d("fixedAssets") },
    { label: "Placement of investments", value: -d("investments") },
    { label: "Acquisition of intangible and other assets", value: -(d("intangibles") + d("otherAssets")) },
  ];
  const financing = [
    { label: "Proceeds from (repayment of) bank loans", value: d("bankLoans") },
    { label: "Proceeds from (repayment of) other liabilities", value: d("otherLongTermLiabilities") + d("otherCurrentLiabilities") },
    { label: "Capital and reserve contributions", value: d("capital") + d("reserves") },
    { label: "Owner drawings / profit distribution", value: -drawings },
  ];
  const t = (xs: { value: number }[]) => xs.reduce((s, x) => s + x.value, 0);
  const totalOperating = t(operating);
  const totalInvesting = t(investing);
  const totalFinancing = t(financing);
  return {
    operating,
    investing,
    financing,
    totalOperating,
    totalInvesting,
    totalFinancing,
    cashIncrease: totalOperating + totalInvesting + totalFinancing,
    openingCash: prev.cash || 0,
    closingCash: n.cash || 0,
  };
}

// Seasonal sales pattern (Eid & year end are higher)
const SEASON = [0.074, 0.07, 0.08, 0.095, 0.083, 0.078, 0.08, 0.082, 0.08, 0.084, 0.088, 0.106];

function buildMonthly(year: number, is: Values, entries: JournalEntry[], accounts: Account[], maxMonth: number): Monthly[] {
  const rk = incomeSummary(is);
  const totalExpense = rk.totalRevenue + (is.otherIncome || 0) - rk.netProfit;
  const weights = SEASON.slice(0, maxMonth);
  const totalWeight = weights.reduce((s, x) => s + x, 0);
  const byId = new Map(accounts.map((a) => [a.id, a]));

  // journals per month that affect revenue/expenses
  const extra = Array.from({ length: maxMonth }, () => ({ p: 0, b: 0 }));
  for (const e of entries) {
    if (e.sample || Number(e.date?.slice(0, 4)) !== year) continue;
    const m = Number(e.date.slice(5, 7)) - 1;
    if (m < 0 || m >= maxMonth) continue;
    for (const l of e.lines) {
      const a = byId.get(l.accountId);
      if (!a) continue;
      if (a.type === "revenue") extra[m].p += l.side === "credit" ? l.amount : -l.amount;
      if (a.type === "expense") extra[m].b += l.side === "debit" ? l.amount : -l.amount;
    }
  }
  const revenueBase = rk.totalRevenue - extra.reduce((s, x) => s + x.p, 0);
  const expenseBase = totalExpense - extra.reduce((s, x) => s + x.b, 0);

  return weights.map((w, i) => {
    // expenses are flatter than revenue
    const wb = (w + 1 / 12) / 2 / ((totalWeight + maxMonth / 12) / 2);
    const revenue = r((revenueBase * w) / totalWeight) + extra[i].p;
    const expense = r(expenseBase * wb) + extra[i].b;
    return {
      month: MONTH_NAMES[i],
      revenue,
      expense,
      profit: revenue - expense,
      cashIn: r(revenue * 0.94),
      cashOut: r(expense * 0.9),
    };
  });
}

// ---------- Main API ----------

export function computeReport(
  entity: string,
  year: number,
  entries: JournalEntry[],
  accounts: Account[],
): Report {
  const m = model(entity);
  const cur = post(m[year], year, entries, accounts);
  const prev = post(m[year - 1], year - 1, entries, accounts);
  const prev2 = m[year - 2] ? post(m[year - 2], year - 2, entries, accounts) : prev;

  const cashFlow = buildCashFlow(cur.balance, prev.balance, cur.is);
  const cashFlowPrev = buildCashFlow(prev.balance, prev2.balance, prev.is);
  const netProfit = incomeSummary(cur.is).netProfit;
  const drawings = (prev.balance.retainedEarnings || 0) + netProfit - (cur.balance.retainedEarnings || 0);

  const equity: EquityChanges = {
    openingCapital: prev.balance.capital || 0,
    capitalContribution: (cur.balance.capital || 0) - (prev.balance.capital || 0),
    closingCapital: cur.balance.capital || 0,
    openingReserves: prev.balance.reserves || 0,
    closingReserves: cur.balance.reserves || 0,
    openingRetainedEarnings: prev.balance.retainedEarnings || 0,
    netProfit,
    drawings,
    closingRetainedEarnings: cur.balance.retainedEarnings || 0,
    openingTotal: sum(prev.balance, BALANCE_SHEET.equity),
    closingTotal: sum(cur.balance, BALANCE_SHEET.equity),
  };

  const ongoing = year === CURRENT_YEAR;
  const maxMonth = ongoing ? CURRENT_MONTH : 12;

  return {
    year,
    entity: entityLabel(entity),
    ongoing,
    ongoingMonth: maxMonth,
    balance: cur.balance,
    balancePrev: prev.balance,
    is: cur.is,
    isPrev: prev.is,
    summary: summarize(cur.balance, cur.is),
    summaryPrev: summarize(prev.balance, prev.is),
    cashFlow,
    cashFlowPrev,
    equity,
    monthly: buildMonthly(year, cur.is, entries, accounts, maxMonth),
  };
}

// ---------- Reports for an arbitrary date range ----------
//
// The base model is annual. For a date range:
// - the annual income statement is split per day following the seasonal weights (SEASON), then summed;
// - the balance sheet on a date is interpolated between the previous year-end and that year-end position
//   (linear interpolation of two balanced balance sheets stays balanced);
// - user journals are posted by their date.
// A range of 1 January to 31 December (or to today) gives the same figures as computeReport.

const DAY_MS = 86_400_000;
export const TODAY = iso(new Date(Date.UTC(CURRENT_YEAR, NOW.getMonth(), NOW.getDate())));
export const MIN_DATE = `${AVAILABLE_YEARS[0]}-01-01`;

function toDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shiftDays(s: string, n: number) {
  return iso(new Date(toDate(s).getTime() + n * DAY_MS));
}
function shiftYears(s: string, n: number) {
  const d = toDate(s);
  const y = d.getUTCFullYear() + n;
  const maxDay = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(y, d.getUTCMonth(), Math.min(d.getUTCDate(), maxDay))));
}
function dayDiff(a: string, b: string) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

type WeightMode = "season" | "flat";

// Cumulative weight from 1 January to the end of date s (0..1 for a full year)
function cumulativeWeight(s: string, mode: WeightMode) {
  const d = toDate(s);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (mode === "flat") {
    const start = Date.UTC(y, 0, 1);
    const daysInYear = (Date.UTC(y + 1, 0, 1) - start) / DAY_MS;
    return ((d.getTime() - start) / DAY_MS + 1) / daysInYear;
  }
  let w = 0;
  for (let i = 0; i < m; i++) w += SEASON[i];
  return w + (SEASON[m] * day) / daysInMonth(y, m);
}

// Model snapshot point per year: year end, or today for the current year
function snapshotWeight(y: number, mode: WeightMode) {
  return y === CURRENT_YEAR ? cumulativeWeight(TODAY, mode) : 1;
}

// Model income statement (without journals) for range [a, b]
function modelIncome(m: Record<number, Snapshot>, a: string, b: string, mode: WeightMode): Values {
  const result: Values = {};
  const ya = Number(a.slice(0, 4));
  const yb = Number(b.slice(0, 4));
  for (let y = ya; y <= yb; y++) {
    const snap = m[y];
    if (!snap) continue;
    const s = y === ya ? a : `${y}-01-01`;
    const e = y === yb ? b : `${y}-12-31`;
    const before = s.endsWith("-01-01") ? 0 : cumulativeWeight(shiftDays(s, -1), mode);
    const share = (cumulativeWeight(e, mode) - before) / snapshotWeight(y, mode);
    for (const [k, v] of Object.entries(snap.is)) result[k] = (result[k] || 0) + v * share;
  }
  for (const k of Object.keys(result)) result[k] = r(result[k]);
  return result;
}

// Model balance sheet (without journals) at the end of date s
function modelBalance(m: Record<number, Snapshot>, s: string): Values {
  const y = Number(s.slice(0, 4));
  const now = m[y] ?? m[CURRENT_YEAR];
  const prev = m[y - 1] ?? now;
  const t = Math.min(1, cumulativeWeight(s, "season") / snapshotWeight(y, "season"));
  const result: Values = {};
  for (const k of new Set([...Object.keys(prev.balance), ...Object.keys(now.balance)])) {
    const a = prev.balance[k] || 0;
    result[k] = a + ((now.balance[k] || 0) - a) * t;
  }
  return result;
}

// Journal posting: the balance sheet includes all journals up to `position`, the income statement only journals in [from, to]
function postRange(balance: Values, is: Values, position: string, from: string, to: string, entries: JournalEntry[], accounts: Account[]) {
  const n = { ...balance };
  const l = { ...is };
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const e of entries) {
    if (e.sample || !e.date || e.date > position) continue;
    const inside = e.date >= from && e.date <= to;
    for (const ln of e.lines) {
      const acc = byId.get(ln.accountId);
      if (!acc || !(ln.amount > 0)) continue;
      const debit = ln.side === "debit";
      if (acc.type === "asset" || acc.type === "liability" || acc.type === "equity") {
        const p = findPos(acc.code, ALL_BALANCE);
        if (!p) continue;
        const up = acc.type === "asset" ? debit : !debit;
        n[p.key] = (n[p.key] || 0) + (up ? ln.amount : -ln.amount);
      } else {
        const p = findPos(acc.code, ALL_IS);
        if (!p) continue;
        const up = acc.type === "revenue" ? !debit : debit;
        const delta = up ? ln.amount : -ln.amount;
        n.retainedEarnings = (n.retainedEarnings || 0) + (acc.type === "revenue" ? delta : -delta);
        if (inside) l[p.key] = (l[p.key] || 0) + delta;
      }
    }
  }
  return { balance: n, is: l };
}

const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatDate(s: string, long = false) {
  const d = toDate(s);
  return `${d.getUTCDate()} ${(long ? LONG_MONTHS : MONTH_NAMES)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// "1 Jan – 19 Oct 2026", or "2025" for a full year
function rangeLabel(from: string, to: string, short: boolean) {
  if (from.endsWith("-01-01") && to.endsWith("-12-31") && from.slice(0, 4) === to.slice(0, 4)) return from.slice(0, 4);
  const a = formatDate(from, !short);
  const b = formatDate(to, !short);
  return from.slice(0, 4) === to.slice(0, 4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}

// Time buckets for charts: daily (≤ 31 days), monthly (≤ 2 years), or quarterly
function buildBuckets(from: string, to: string) {
  const days = dayDiff(from, to) + 1;
  const buckets: { a: string; b: string; label: string }[] = [];
  if (days <= 31) {
    for (let s = from; s <= to; s = shiftDays(s, 1)) {
      const d = toDate(s);
      buckets.push({ a: s, b: s, label: `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}` });
    }
    return buckets;
  }
  const crossYear = from.slice(0, 4) !== to.slice(0, 4);
  const step = days <= 731 ? 1 : 3;
  const d = toDate(from);
  let y = d.getUTCFullYear();
  let m = step === 3 ? Math.floor(d.getUTCMonth() / 3) * 3 : d.getUTCMonth();
  for (;;) {
    const start = iso(new Date(Date.UTC(y, m, 1)));
    if (start > to) break;
    const end = iso(new Date(Date.UTC(y, m + step, 0)));
    const label =
      step === 3 ? `Q${m / 3 + 1} ${String(y).slice(2)}` : crossYear ? `${MONTH_NAMES[m]} ${String(y).slice(2)}` : MONTH_NAMES[m];
    buckets.push({ a: start < from ? from : start, b: end > to ? to : end, label });
    m += step;
    if (m > 11) {
      m -= 12;
      y++;
    }
  }
  return buckets;
}

function buildRangeMonthly(
  m: Record<number, Snapshot>,
  from: string,
  to: string,
  entries: JournalEntry[],
  accounts: Account[],
): Monthly[] {
  const buckets = buildBuckets(from, to);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const totalExpense = (x: Values) => {
    const rk = incomeSummary(x);
    return rk.totalRevenue + (x.otherIncome || 0) - rk.netProfit;
  };
  // model expenses are flatter than revenue: a mix of seasonal and flat weights
  const rangeModelExpense = totalExpense(modelIncome(m, from, to, "season"));
  const raw = buckets.map((k) => (totalExpense(modelIncome(m, k.a, k.b, "season")) + totalExpense(modelIncome(m, k.a, k.b, "flat"))) / 2);
  const rawTotal = raw.reduce((s, x) => s + x, 0) || 1;

  return buckets.map((k, i) => {
    let p = incomeSummary(modelIncome(m, k.a, k.b, "season")).totalRevenue;
    let b = (raw[i] / rawTotal) * rangeModelExpense;
    for (const e of entries) {
      if (e.sample || !e.date || e.date < k.a || e.date > k.b) continue;
      for (const l of e.lines) {
        const a = byId.get(l.accountId);
        if (a?.type === "revenue") p += l.side === "credit" ? l.amount : -l.amount;
        if (a?.type === "expense") b += l.side === "debit" ? l.amount : -l.amount;
      }
    }
    const revenue = r(p);
    const expense = r(b);
    return { month: k.label, revenue, expense, profit: revenue - expense, cashIn: r(revenue * 0.94), cashOut: r(expense * 0.9) };
  });
}

export function computeRangeReport(
  entity: string,
  fromInput: string,
  toInput: string,
  entries: JournalEntry[],
  accounts: Account[],
): Report {
  const m = model(entity);
  // limit to available data and don't go past today
  let to = toInput > TODAY ? TODAY : toInput;
  let from = fromInput < MIN_DATE ? MIN_DATE : fromInput;
  if (from > to) [from, to] = [to, from];
  const fromPrev = shiftYears(from, -1);
  const toPrev = shiftYears(to, -1);

  const compute = (a: string, b: string) => {
    const start = shiftDays(a, -1);
    const now = postRange(modelBalance(m, b), modelIncome(m, a, b, "season"), b, a, b, entries, accounts);
    const before = postRange(modelBalance(m, start), {}, start, a, b, entries, accounts).balance;
    for (const k of Object.keys(now.balance)) now.balance[k] = r(now.balance[k]);
    for (const k of Object.keys(before)) before[k] = r(before[k]);
    // rounding can shift the balance by a few thousand rupiah: cash as the balancing figure
    for (const n of [now.balance, before]) {
      const other = sum(n, [...BALANCE_SHEET.currentAssets, ...BALANCE_SHEET.nonCurrentAssets].filter((p) => p.key !== "cash"));
      n.cash = sum(n, [...BALANCE_SHEET.currentLiabilities, ...BALANCE_SHEET.longTermLiabilities, ...BALANCE_SHEET.equity]) - other;
    }
    return { ...now, opening: before };
  };

  const cur = compute(from, to);
  const prev = compute(fromPrev, toPrev);
  const netProfit = incomeSummary(cur.is).netProfit;

  const equity: EquityChanges = {
    openingCapital: cur.opening.capital || 0,
    capitalContribution: (cur.balance.capital || 0) - (cur.opening.capital || 0),
    closingCapital: cur.balance.capital || 0,
    openingReserves: cur.opening.reserves || 0,
    closingReserves: cur.balance.reserves || 0,
    openingRetainedEarnings: cur.opening.retainedEarnings || 0,
    netProfit,
    drawings: (cur.opening.retainedEarnings || 0) + netProfit - (cur.balance.retainedEarnings || 0),
    closingRetainedEarnings: cur.balance.retainedEarnings || 0,
    openingTotal: sum(cur.opening, BALANCE_SHEET.equity),
    closingTotal: sum(cur.balance, BALANCE_SHEET.equity),
  };

  return {
    year: Number(to.slice(0, 4)),
    entity: entityLabel(entity),
    ongoing: false,
    ongoingMonth: 12, // the comparison is already the same period last year, no need to annualize
    balance: cur.balance,
    balancePrev: prev.balance,
    is: cur.is,
    isPrev: prev.is,
    summary: summarize(cur.balance, cur.is),
    summaryPrev: summarize(prev.balance, prev.is),
    cashFlow: buildCashFlow(cur.balance, cur.opening, cur.is),
    cashFlowPrev: buildCashFlow(prev.balance, prev.opening, prev.is),
    equity,
    monthly: buildRangeMonthly(m, from, to, entries, accounts),
    period: {
      from,
      to,
      days: dayDiff(from, to) + 1,
      label: rangeLabel(from, to, false),
      periodColumns: [rangeLabel(from, to, true), rangeLabel(fromPrev, toPrev, true)],
      positionColumns: [formatDate(to), formatDate(toPrev)],
    },
  };
}

export function formatRp(v: number) {
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(Rp ${s})` : `Rp ${s}`;
}

export function formatRpShort(v: number) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}Rp ${(a / 1e9).toFixed(2).replace(".", ",")} B`;
  if (a >= 1e6) return `${sign}Rp ${(a / 1e6).toFixed(1).replace(".", ",")} M`;
  if (a >= 1e3) return `${sign}Rp ${(a / 1e3).toFixed(0)} K`;
  return `${sign}Rp ${a}`;
}

export function periodLabel(rep: Pick<Report, "year" | "ongoing" | "ongoingMonth" | "period">) {
  if (rep.period) return rep.period.label;
  return rep.ongoing
    ? `1 January – ${MONTH_NAMES[rep.ongoingMonth - 1]} ${rep.year} (to date)`
    : `1 January – 31 December ${rep.year}`;
}
