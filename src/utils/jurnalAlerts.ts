import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry, JournalLine } from "../context/JournalContext";
import { formatRp } from "../data/laporan";

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

// Pemeriksaan otomatis jurnal sebelum dan sesudah diposting.
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
    alerts.push({ severity: "error", code: "NO_LINES", message: "Jurnal belum memiliki baris." });
  }
  if (totalDebit <= 0 || totalCredit <= 0) {
    alerts.push({ severity: "error", code: "NO_AMOUNTS", message: "Debit dan kredit harus lebih dari 0." });
  }
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    alerts.push({
      severity: "error",
      code: "IMBALANCED",
      message: `Jurnal belum seimbang, selisih ${formatRp(Math.abs(totalDebit - totalCredit))}.`,
    });
  }
  for (const l of entry.lines) {
    if (!l.accountId) {
      alerts.push({ severity: "error", code: "MISSING_ACCOUNT", message: "Ada baris yang belum memilih akun." });
      break;
    }
    if (!(l.amount > 0)) {
      alerts.push({ severity: "error", code: "INVALID_AMOUNT", message: "Nominal harus berupa angka positif." });
      break;
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  if (entry.date && entry.date > todayISO) {
    alerts.push({ severity: "warning", code: "FUTURE_DATE", message: "Tanggal jurnal berada di masa depan." });
  }

  if (!entry.description || !entry.description.trim()) {
    alerts.push({
      severity: "warning",
      code: "NO_DESC",
      message: "Tambahkan keterangan yang jelas agar jejak audit mudah ditelusuri.",
    });
  }

  for (const l of entry.lines) {
    const acc = getAccount ? getAccount(l.accountId) : undefined;
    if (!acc) continue;
    if (acc.type === "revenue" && l.side === "debit") {
      alerts.push({ severity: "warning", code: "REV_DEBIT", message: "Akun pendapatan didebit. Apakah ini retur atau koreksi?" });
    }
    if (acc.type === "expense" && l.side === "credit") {
      alerts.push({ severity: "warning", code: "EXP_CREDIT", message: "Akun beban dikredit. Apakah ini pengembalian atau reklasifikasi?" });
    }
  }

  const entryTotal = totalDebit;
  if (currentAssetsTotal > 0 && entryTotal / currentAssetsTotal >= 0.2) {
    alerts.push({
      severity: "warning",
      code: "LARGE_VS_ASSETS",
      message: `Transaksi besar (${((entryTotal / currentAssetsTotal) * 100).toFixed(1)}% dari total aset). Periksa otorisasinya.`,
    });
  }
  if (currentCash > 0 && entryTotal / currentCash >= 0.5) {
    alerts.push({
      severity: "warning",
      code: "LARGE_VS_CASH",
      message: `Transaksi besar (${((entryTotal / currentCash) * 100).toFixed(1)}% dari saldo kas). Pastikan kas cukup dan sudah disetujui.`,
    });
  }

  const largeRoundedCount = entry.lines.filter((l) => l.amount >= 1_000_000 && endsWithZeros(l.amount, 6)).length;
  if (largeRoundedCount >= Math.max(2, Math.ceil(entry.lines.length / 2))) {
    alerts.push({
      severity: "info",
      code: "ROUND_NUMBERS",
      message: "Banyak nominal besar yang bulat. Cocokkan lagi dengan dokumen pendukung.",
    });
  }

  const normalized = JSON.stringify(normalizeLines(entry.lines));
  for (const ex of existingEntries) {
    if (!ex.lines || ex.lines.length === 0) continue;
    if (ex.date === entry.date && JSON.stringify(normalizeLines(ex.lines)) === normalized) {
      alerts.push({
        severity: "warning",
        code: "POSSIBLE_DUP",
        message: "Kemungkinan duplikat dengan jurnal lain di tanggal yang sama.",
      });
      break;
    }
  }

  return alerts;
}
