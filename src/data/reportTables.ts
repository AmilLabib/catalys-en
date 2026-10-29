// Builds the report table rows (SAK EMKM format) from the computeReport result.
// Shared by the on-screen view, the Excel export, and the PDF export.
import { INCOME_STATEMENT, BALANCE_SHEET, periodLabel, type Report, type PosDef } from "./reports";

export type RowType = "title" | "subtitle" | "row" | "subtotal" | "total";
export type Row = { label: string; type: RowType; value?: number; prev?: number; note?: string };

export type Table = { key: string; title: string; columns: [string, string]; rows: Row[] };

function pos(defs: PosDef[], cur: Record<string, number>, prev: Record<string, number>, negative = false): Row[] {
  return defs
    .map((p) => ({
      label: p.label,
      type: "row" as const,
      value: negative ? -(cur[p.key] || 0) : cur[p.key] || 0,
      prev: negative ? -(prev[p.key] || 0) : prev[p.key] || 0,
    }))
    .filter((b) => b.value !== 0 || b.prev !== 0);
}

export function buildTables(rep: Report): Table[] {
  const t = rep.year;
  const balanceColumns: [string, string] = rep.period
    ? rep.period.positionColumns
    : [rep.ongoing ? `Position ${t} (to date)` : `31 Dec ${t}`, `31 Dec ${t - 1}`];
  const periodColumns: [string, string] = rep.period
    ? rep.period.periodColumns
    : [rep.ongoing ? `${t} (to date)` : String(t), String(t - 1)];
  const n = rep.balance;
  const p = rep.balancePrev;
  const S = rep.summary;
  const SP = rep.summaryPrev;

  const balance: Row[] = [
    { label: "ASSETS", type: "title" },
    { label: "Current Assets", type: "subtitle" },
    ...pos(BALANCE_SHEET.currentAssets, n, p),
    { label: "Total Current Assets", type: "subtotal", value: S.totalCurrentAssets, prev: SP.totalCurrentAssets },
    { label: "Non-Current Assets", type: "subtitle" },
    ...pos(BALANCE_SHEET.nonCurrentAssets, n, p),
    { label: "Total Non-Current Assets", type: "subtotal", value: S.totalNonCurrentAssets, prev: SP.totalNonCurrentAssets },
    { label: "TOTAL ASSETS", type: "total", value: S.totalAssets, prev: SP.totalAssets },
    { label: "LIABILITIES AND EQUITY", type: "title" },
    { label: "Current Liabilities", type: "subtitle" },
    ...pos(BALANCE_SHEET.currentLiabilities, n, p),
    { label: "Total Current Liabilities", type: "subtotal", value: S.totalCurrentLiabilities, prev: SP.totalCurrentLiabilities },
    { label: "Long-Term Liabilities", type: "subtitle" },
    ...pos(BALANCE_SHEET.longTermLiabilities, n, p),
    { label: "Total Long-Term Liabilities", type: "subtotal", value: S.totalLongTermLiabilities, prev: SP.totalLongTermLiabilities },
    { label: "Total Liabilities", type: "subtotal", value: S.totalLiabilities, prev: SP.totalLiabilities },
    { label: "Equity", type: "subtitle" },
    ...pos(BALANCE_SHEET.equity, n, p),
    { label: "Total Equity", type: "subtotal", value: S.totalEquity, prev: SP.totalEquity },
    {
      label: "TOTAL LIABILITIES AND EQUITY",
      type: "total",
      value: S.totalLiabilities + S.totalEquity,
      prev: SP.totalLiabilities + SP.totalEquity,
    },
  ];

  const is = rep.is;
  const isp = rep.isPrev;
  const incomeStatement: Row[] = [
    { label: "Revenue", type: "subtitle" },
    ...pos(INCOME_STATEMENT.revenue, is, isp),
    { label: "Total Revenue", type: "subtotal", value: S.totalRevenue, prev: SP.totalRevenue },
    ...pos(INCOME_STATEMENT.cogs, is, isp, true),
    { label: "GROSS PROFIT", type: "total", value: S.grossProfit, prev: SP.grossProfit },
    { label: "Operating Expenses", type: "subtitle" },
    ...pos(INCOME_STATEMENT.operatingExpenses, is, isp, true),
    { label: "Total Operating Expenses", type: "subtotal", value: -S.totalOperatingExpenses, prev: -SP.totalOperatingExpenses },
    { label: "OPERATING PROFIT", type: "total", value: S.operatingProfit, prev: SP.operatingProfit },
    { label: "Other Income (Expenses)", type: "subtitle" },
    {
      label: INCOME_STATEMENT.other[0].label,
      type: "row",
      value: is.otherIncome || 0,
      prev: isp.otherIncome || 0,
    },
    {
      label: INCOME_STATEMENT.other[1].label,
      type: "row",
      value: -(is.otherExpense || 0),
      prev: -(isp.otherExpense || 0),
    },
    { label: "PROFIT BEFORE TAX", type: "total", value: S.profitBeforeTax, prev: SP.profitBeforeTax },
    ...pos(INCOME_STATEMENT.tax, is, isp, true),
    { label: "NET PROFIT", type: "total", value: S.netProfit, prev: SP.netProfit },
  ];

  const cf = rep.cashFlow;
  const cfp = rep.cashFlowPrev;
  const zip = (a: { label: string; value: number }[], b: { label: string; value: number }[]): Row[] =>
    a.map((x, i) => ({ label: x.label, type: "row" as const, value: x.value, prev: b[i]?.value ?? 0 }));
  const cashFlow: Row[] = [
    { label: "Cash Flows from Operating Activities", type: "subtitle" },
    ...zip(cf.operating, cfp.operating),
    { label: "Net Cash from Operating Activities", type: "subtotal", value: cf.totalOperating, prev: cfp.totalOperating },
    { label: "Cash Flows from Investing Activities", type: "subtitle" },
    ...zip(cf.investing, cfp.investing),
    { label: "Net Cash from Investing Activities", type: "subtotal", value: cf.totalInvesting, prev: cfp.totalInvesting },
    { label: "Cash Flows from Financing Activities", type: "subtitle" },
    ...zip(cf.financing, cfp.financing),
    { label: "Net Cash from Financing Activities", type: "subtotal", value: cf.totalFinancing, prev: cfp.totalFinancing },
    { label: "NET INCREASE (DECREASE) IN CASH", type: "total", value: cf.cashIncrease, prev: cfp.cashIncrease },
    { label: "Cash and cash equivalents at beginning of year", type: "row", value: cf.openingCash, prev: cfp.openingCash },
    { label: "CASH AND CASH EQUIVALENTS AT END OF YEAR", type: "total", value: cf.closingCash, prev: cfp.closingCash },
  ];

  const e = rep.equity;
  const equity: Row[] = [
    { label: "Paid-in Capital", type: "subtitle" },
    { label: "Opening balance", type: "row", value: e.openingCapital },
    { label: "Capital contributions for the year", type: "row", value: e.capitalContribution },
    { label: "Closing paid-in capital", type: "subtotal", value: e.closingCapital },
    { label: "Reserves", type: "subtitle" },
    { label: "Closing reserves", type: "subtotal", value: e.closingReserves },
    { label: "Retained Earnings", type: "subtitle" },
    { label: "Opening balance", type: "row", value: e.openingRetainedEarnings },
    { label: "Net profit for the year", type: "row", value: e.netProfit },
    { label: "Owner drawings / profit distribution", type: "row", value: -e.drawings },
    { label: "Closing retained earnings", type: "subtotal", value: e.closingRetainedEarnings },
    { label: "TOTAL EQUITY AT BEGINNING OF YEAR", type: "total", value: e.openingTotal },
    { label: "TOTAL EQUITY AT END OF YEAR", type: "total", value: e.closingTotal },
  ];

  return [
    { key: "balance", title: "Statement of Financial Position", columns: balanceColumns, rows: balance },
    { key: "incomeStatement", title: "Income Statement", columns: periodColumns, rows: incomeStatement },
    { key: "cashFlow", title: "Statement of Cash Flows", columns: periodColumns, rows: cashFlow },
    { key: "equity", title: "Statement of Changes in Equity", columns: periodColumns, rows: equity },
  ];
}

// Notes to the Financial Statements (required under SAK EMKM)
export function buildNotes(rep: Report, businessName: string): { title: string; items: string[] }[] {
  const rp = (v: number) => "Rp " + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const n = rep.balance;
  return [
    {
      title: "1. General",
      items: [
        `${businessName} (${rep.entity}) is a micro, small, and medium enterprise that prepares financial statements for the period ${periodLabel(rep)}.`,
      ],
    },
    {
      title: "2. Summary of Significant Accounting Policies",
      items: [
        "Statement of compliance: the financial statements are prepared in accordance with the Financial Accounting Standards for Micro, Small, and Medium Entities (SAK EMKM).",
        "Basis of preparation: accrual basis using the historical cost concept, in Indonesian Rupiah.",
        "Accounts receivable are presented at the billed amount less the allowance for doubtful accounts.",
        "Inventory is measured at acquisition cost (full costing) using the first-in, first-out (FIFO) method.",
        "Fixed assets are recorded at acquisition cost and depreciated using the straight-line method.",
        "Revenue is recognized when goods are delivered or services are completed for the customer.",
        "Income tax uses the 0.5% final tax rate on gross turnover under Government Regulation (PP) 55 of 2022.",
      ],
    },
    {
      title: "3. Cash and Cash Equivalents",
      items: [`Cash on hand and bank balances at the end of the period amounted to ${rp(n.cash || 0)}.`],
    },
    {
      title: "4. Accounts Receivable",
      items: [
        `Gross accounts receivable of ${rp(n.receivables || 0)} with an allowance for doubtful accounts of ${rp(-(n.allowance || 0))}.`,
      ],
    },
    {
      title: "5. Fixed Assets",
      items: [
        `Acquisition cost ${rp(n.fixedAssets || 0)}, accumulated depreciation ${rp(-(n.accumDepreciation || 0))}, book value ${rp(
          (n.fixedAssets || 0) + (n.accumDepreciation || 0),
        )}.`,
      ],
    },
    {
      title: "6. Bank Loans",
      items: [`Outstanding bank loan balance at the end of the period was ${rp(n.bankLoans || 0)}.`],
    },
  ];
}
