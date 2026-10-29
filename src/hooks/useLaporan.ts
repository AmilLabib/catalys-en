import { useMemo } from "react";
import { useAccount } from "../context/AccountContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { entitasJurnal, useJournal } from "../context/JournalContext";
import { hitungLaporan, hitungLaporanRentang, KONSOLIDASI } from "../data/laporan";
import type { JournalEntry } from "../context/JournalContext";

// Entitas laporan milik akun yang sedang masuk: induk melihat konsolidasi,
// cabang melihat cabangnya sendiri.
export function useEntitasSendiri() {
  return useAccount().entitasSendiri;
}

// Jurnal pengguna yang masuk ke laporan entitas: konsolidasi memuat semua jurnal,
// laporan cabang hanya jurnal yang dicatat cabang itu.
function useJurnalEntitas(target: string) {
  const { entries } = useJournal();
  return useMemo(
    () => (target === KONSOLIDASI ? entries : entries.filter((e: JournalEntry) => entitasJurnal(e) === target)),
    [entries, target],
  );
}

export function useLaporan(tahun: number, entitas?: string) {
  const { entitasSendiri, cabangList } = useAccount();
  const target = entitas ?? entitasSendiri;
  const jurnal = useJurnalEntitas(target);
  const { accounts } = useChartOfAccounts();
  return useMemo(
    () => hitungLaporan(target, tahun, jurnal, accounts),
    // daftar cabang mengubah angka konsolidasi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, tahun, jurnal, accounts, cabangList.length],
  );
}

// Laporan untuk rentang tanggal bebas (format YYYY-MM-DD)
export function useLaporanRentang(dari: string, sampai: string, entitas?: string) {
  const { entitasSendiri, cabangList } = useAccount();
  const target = entitas ?? entitasSendiri;
  const jurnal = useJurnalEntitas(target);
  const { accounts } = useChartOfAccounts();
  return useMemo(
    () => hitungLaporanRentang(target, dari, sampai, jurnal, accounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, dari, sampai, jurnal, accounts, cabangList.length],
  );
}
