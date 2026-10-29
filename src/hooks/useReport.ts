import { useMemo } from "react";
import { useAccount } from "../context/AccountContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { journalEntity, useJournal } from "../context/JournalContext";
import { computeReport, computeRangeReport, CONSOLIDATED } from "../data/reports";
import type { JournalEntry } from "../context/JournalContext";

// Report entity of the signed-in account: the parent sees consolidated,
// a branch sees its own branch.
export function useOwnEntity() {
  return useAccount().ownEntity;
}

// User journals included in an entity's report: consolidated includes all journals,
// a branch report only the journals recorded by that branch.
function useEntityJournals(target: string) {
  const { entries } = useJournal();
  return useMemo(
    () => (target === CONSOLIDATED ? entries : entries.filter((e: JournalEntry) => journalEntity(e) === target)),
    [entries, target],
  );
}

export function useReport(year: number, entity?: string) {
  const { ownEntity, branchList } = useAccount();
  const target = entity ?? ownEntity;
  const journals = useEntityJournals(target);
  const { accounts } = useChartOfAccounts();
  return useMemo(
    () => computeReport(target, year, journals, accounts),
    // the branch list changes the consolidated figures
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, year, journals, accounts, branchList.length],
  );
}

// Report for an arbitrary date range (YYYY-MM-DD format)
export function useRangeReport(from: string, to: string, entity?: string) {
  const { ownEntity, branchList } = useAccount();
  const target = entity ?? ownEntity;
  const journals = useEntityJournals(target);
  const { accounts } = useChartOfAccounts();
  return useMemo(
    () => computeRangeReport(target, from, to, journals, accounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, from, to, journals, accounts, branchList.length],
  );
}
