import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry, JournalLine } from "../context/JournalContext";
import { formatRp } from "../data/reports";

export type AlertSeverity = "error" | "warning" | "info";
export type Alert = { severity: AlertSeverity; message: string; code?: string };

function endsWithZeros(n: number, digits = 6) {
  return n % Math.pow(10, digits) === 0;
}

function normalizeLines(lines: JournalLine[]) {
  return [...lines]
    .map((l) => ({ side: l.side, accountId: l.accountId, amount: l.amount }))
    .sort((a, b) => {
      if (a.side !== b.side) return a.side < b.side ? -1 : 1;
      if (a.accountId !== b.accountId) return a.accountId < b.accountId ? -1 : 1;
      return a.amount - b.amount;
    });
}

// Automatic journal checks before and after posting.
export function evaluateAlerts(
  entry: { date: string; description?: string; lines: JournalLine[] },
  options: {
    currentAssetsTotal?: number;
    currentCash?: number;
    getAccount?: (id: string | undefined) => Account | undefined;
    existingEntries?: Pick<JournalEntry, "date" | "lines" | "description" | "id">[];
  } = {},
): Alert[] {
  const alerts: Alert[] = [];
  const { currentAssetsTotal = 0, currentCash = 0, getAccount, existingEntries = [] } = options;

  const totalDebit = entry.lines.filter((l) => l.side === "debit").reduce((s, l) => s + (l.amount || 0), 0);
  const totalCredit = entry.lines.filter((l) => l.side === "credit").reduce((s, l) => s + (l.amount || 0), 0);

  if (entry.lines.length === 0) {
    alerts.push({ severity: "error", code: "NO_LINES", message: "The journal has no lines yet." });
  }
  if (totalDebit <= 0 || totalCredit <= 0) {
    alerts.push({ severity: "error", code: "NO_AMOUNTS", message: "Debit and credit must be greater than 0." });
  }
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    alerts.push({
      severity: "error",
      code: "IMBALANCED",
      message: `The journal isn't balanced, difference of ${formatRp(Math.abs(totalDebit - totalCredit))}.`,
    });
  }
  for (const l of entry.lines) {
    if (!l.accountId) {
      alerts.push({ severity: "error", code: "MISSING_ACCOUNT", message: "A line has no account selected." });
      break;
    }
    if (!(l.amount > 0)) {
      alerts.push({ severity: "error", code: "INVALID_AMOUNT", message: "Amounts must be positive numbers." });
      break;
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  if (entry.date && entry.date > todayISO) {
    alerts.push({ severity: "warning", code: "FUTURE_DATE", message: "The journal date is in the future." });
  }

  if (!entry.description || !entry.description.trim()) {
    alerts.push({
      severity: "warning",
      code: "NO_DESC",
      message: "Add a clear description so the audit trail is easy to follow.",
    });
  }

  for (const l of entry.lines) {
    const acc = getAccount ? getAccount(l.accountId) : undefined;
    if (!acc) continue;
    if (acc.type === "revenue" && l.side === "debit") {
      alerts.push({ severity: "warning", code: "REV_DEBIT", message: "A revenue account is debited. Is this a return or a correction?" });
    }
    if (acc.type === "expense" && l.side === "credit") {
      alerts.push({ severity: "warning", code: "EXP_CREDIT", message: "An expense account is credited. Is this a refund or a reclassification?" });
    }
  }

  const entryTotal = totalDebit;
  if (currentAssetsTotal > 0 && entryTotal / currentAssetsTotal >= 0.2) {
    alerts.push({
      severity: "warning",
      code: "LARGE_VS_ASSETS",
      message: `Large transaction (${((entryTotal / currentAssetsTotal) * 100).toFixed(1)}% of total assets). Check its authorization.`,
    });
  }
  if (currentCash > 0 && entryTotal / currentCash >= 0.5) {
    alerts.push({
      severity: "warning",
      code: "LARGE_VS_CASH",
      message: `Large transaction (${((entryTotal / currentCash) * 100).toFixed(1)}% of cash balance). Make sure there's enough cash and it's approved.`,
    });
  }

  const largeRoundedCount = entry.lines.filter((l) => l.amount >= 1_000_000 && endsWithZeros(l.amount, 6)).length;
  if (largeRoundedCount >= Math.max(2, Math.ceil(entry.lines.length / 2))) {
    alerts.push({
      severity: "info",
      code: "ROUND_NUMBERS",
      message: "Many large round amounts. Double-check them against supporting documents.",
    });
  }

  const normalized = JSON.stringify(normalizeLines(entry.lines));
  for (const ex of existingEntries) {
    if (!ex.lines || ex.lines.length === 0) continue;
    if (ex.date === entry.date && JSON.stringify(normalizeLines(ex.lines)) === normalized) {
      alerts.push({
        severity: "warning",
        code: "POSSIBLE_DUP",
        message: "Possible duplicate of another journal on the same date.",
      });
      break;
    }
  }

  return alerts;
}
