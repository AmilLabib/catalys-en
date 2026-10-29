// Journal entry helpers: common transaction templates, debit account suggestions from
// the description, and the counter (credit) account suggestions that are "usually" used.
import type { Account } from "../context/ChartOfAccountsContext";

export type JournalTemplate = { name: string; description: string; debit: string; credit: string };

// account codes refer to the default Chart of Accounts
export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  { name: "Pay rent", description: "Business premises rent payment", debit: "6.1.5.01", credit: "1.1.1.01" },
  { name: "Cash sale", description: "Cash sale", debit: "1.1.1.01", credit: "4.2.1.01" },
  { name: "Credit sale", description: "Credit sale to customer", debit: "1.1.2.01", credit: "4.2.1.01" },
  { name: "Receive receivable payment", description: "Customer receivable settlement", debit: "1.1.1.02", credit: "1.1.2.01" },
  { name: "Buy inventory (cash)", description: "Cash inventory purchase", debit: "1.1.4.01", credit: "1.1.1.01" },
  { name: "Buy inventory (credit)", description: "Inventory purchase on credit", debit: "1.1.4.01", credit: "2.1.3.01" },
  { name: "Pay accounts payable", description: "Payment to supplier", debit: "2.1.3.01", credit: "1.1.1.02" },
  { name: "Pay salaries", description: "Employee salary payment", debit: "6.1.1.01", credit: "1.1.1.02" },
  { name: "Pay electricity & internet", description: "Electricity and internet payment", debit: "6.1.4.01", credit: "1.1.1.01" },
  { name: "Pay for ads", description: "Social media advertising", debit: "6.2.2.01", credit: "1.1.1.01" },
  { name: "Buy equipment", description: "Business equipment purchase", debit: "1.3.3.01", credit: "1.1.1.02" },
  { name: "Receive bank loan", description: "Bank loan disbursement", debit: "1.1.1.02", credit: "2.2.2.01" },
  { name: "Capital contribution", description: "Owner capital contribution", debit: "1.1.1.02", credit: "3.1.1.01" },
];

// description keywords -> matching debit account code prefixes
const KEYWORDS: [RegExp, string[]][] = [
  [/rent/, ["6.1.5.01"]],
  [/salar|wage|payroll|overtime|bonus/, ["6.1.1"]],
  [/electric|water|internet|phone|wifi|utilit/, ["6.1.4"]],
  [/advert|promo|endorse|ads|marketing/, ["6.2.2"]],
  [/stationery|supplies|photocop|office/, ["6.1.2", "1.1.4.03"]],
  [/repair|servic|maintenance/, ["6.1.3"]],
  [/material|inventory|stock|restock|purchase goods|buy goods/, ["1.1.4.01"]],
  [/equipment|machine|stove|fridge|display|desk|chair/, ["1.3.3.01"]],
  [/vehicle|motorbike|car/, ["1.3.4.01"]],
  [/sale|sell|turnover|revenue/, ["1.1.1.01", "1.1.1.02", "1.1.2.01"]],
  [/receivable|collect/, ["1.1.1.01", "1.1.1.02"]],
  [/pay debt|pay payable|settle|repay/, ["2.1.3.01", "2.2.2.01"]],
  [/tax|pph|vat|ppn/, ["9.3", "2.1.4"]],
  [/interest/, ["9.2.2.01"]],
  [/capital|deposit/, ["1.1.1.02", "1.1.1.01"]],
  [/loan|borrow/, ["1.1.1.02"]],
  [/depreciation/, ["6.1.8"]],
];

const CASH = ["1.1.1.01", "1.1.1.10", "1.1.1.02", "1.1.1.03", "1.1.1.04", "1.1.1.05", "1.1.1.06", "1.1.1.07"];

// debit account (prefix) -> credit accounts that are usually its counterpart
const COUNTER: [string, string[], string][] = [
  ["6.1.1", ["2.1.5.01", ...CASH], "salaries paid from cash/bank or recorded as salaries payable"],
  ["6.1.4", [...CASH, "2.1.6"], "bills paid from cash/bank or recorded as utilities payable"],
  ["6.1.5", [...CASH, "1.1.5.01"], "rent paid in cash, or reducing prepaid rent"],
  ["6.1.7", ["1.1.3"], "allowance for receivables recorded to the contra-receivable account"],
  ["6.1.8", ["1.3.5", "1.4.2"], "depreciation recorded to accumulated depreciation"],
  ["6", [...CASH, "2.1.3.01"], "expenses paid from cash/bank or still payable"],
  ["9.2", [...CASH], "other expenses paid from cash/bank"],
  ["9.3", [...CASH, "2.1.4"], "tax paid from cash/bank or recorded as tax payable"],
  ["5", ["1.1.4.01"], "COGS reduces inventory"],
  ["1.1.4", [...CASH, "2.1.3.01"], "inventory bought in cash or on credit from a supplier"],
  ["1.1.5", [...CASH], "prepaid costs paid from cash/bank"],
  ["1.3", [...CASH, "2.1.3.01", "2.2.2.01"], "fixed assets bought in cash, on credit, or with a loan"],
  ["1.1.2", ["4.2.1.01", "4.2.2.01", "4.2.9.01", "4.1.1.01"], "receivables arise from credit sales"],
  ["1.1.1", ["4.2.1.01", "1.1.2.01", "2.2.2.01", "3.1.1.01", "9.1.1.01", "4.2.9.01", ...CASH], "cash increases from sales, receivable settlements, loans, or capital"],
  ["2", [...CASH], "liabilities settled from cash/bank"],
  ["3", [...CASH], "capital withdrawn from cash/bank"],
];

function matchesPrefix(code: string, pre: string) {
  return code === pre || code.startsWith(pre + ".");
}

function fromPrefixes(accounts: Account[], prefixes: string[], exclude: Set<string>) {
  const out: Account[] = [];
  for (const pre of prefixes) {
    for (const a of accounts) {
      if (!exclude.has(a.id) && matchesPrefix(a.code, pre) && !out.includes(a)) out.push(a);
    }
  }
  return out;
}

export function suggestDebit(description: string, accounts: Account[], exclude: Set<string>): Account[] {
  const k = description.toLowerCase();
  const prefixes = KEYWORDS.filter(([re]) => re.test(k)).flatMap(([, p]) => p);
  // no keyword: show the most common debit accounts
  return fromPrefixes(accounts, prefixes.length ? prefixes : ["1.1.1.01", "1.1.4.01", "6.1.5.01", "6.1.1.01"], exclude).slice(0, 6);
}

export function suggestCredit(debitAccounts: Account[], accounts: Account[], exclude: Set<string>): { accounts: Account[]; reasons: string[] } {
  const prefixes: string[] = [];
  const reasons: string[] = [];
  for (const d of debitAccounts) {
    const rule = COUNTER.find(([pre]) => matchesPrefix(d.code, pre));
    if (!rule) continue;
    prefixes.push(...rule[1]);
    reasons.push(`${d.name}: ${rule[2]}`);
  }
  return { accounts: fromPrefixes(accounts, prefixes, exclude).slice(0, 8), reasons };
}
