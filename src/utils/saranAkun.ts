// Bantuan pengisian jurnal: templat transaksi umum, saran akun debit dari
// keterangan, dan saran akun lawan (kredit) yang "biasanya" dipakai.
import type { Account } from "../context/ChartOfAccountsContext";

export type TemplatJurnal = { nama: string; keterangan: string; debit: string; kredit: string };

// kode akun mengacu ke Bagan Akun bawaan
export const TEMPLAT_JURNAL: TemplatJurnal[] = [
  { nama: "Bayar sewa", keterangan: "Pembayaran sewa tempat usaha", debit: "6.1.5.01", kredit: "1.1.1.01" },
  { nama: "Penjualan tunai", keterangan: "Penjualan tunai", debit: "1.1.1.01", kredit: "4.2.1.01" },
  { nama: "Penjualan kredit", keterangan: "Penjualan kredit ke pelanggan", debit: "1.1.2.01", kredit: "4.2.1.01" },
  { nama: "Terima pelunasan piutang", keterangan: "Pelunasan piutang pelanggan", debit: "1.1.1.02", kredit: "1.1.2.01" },
  { nama: "Beli persediaan tunai", keterangan: "Pembelian persediaan tunai", debit: "1.1.4.01", kredit: "1.1.1.01" },
  { nama: "Beli persediaan kredit", keterangan: "Pembelian persediaan secara kredit", debit: "1.1.4.01", kredit: "2.1.3.01" },
  { nama: "Bayar utang usaha", keterangan: "Pelunasan utang ke supplier", debit: "2.1.3.01", kredit: "1.1.1.02" },
  { nama: "Bayar gaji", keterangan: "Pembayaran gaji karyawan", debit: "6.1.1.01", kredit: "1.1.1.02" },
  { nama: "Bayar listrik & internet", keterangan: "Pembayaran listrik dan internet", debit: "6.1.4.01", kredit: "1.1.1.01" },
  { nama: "Bayar iklan", keterangan: "Biaya iklan media sosial", debit: "6.2.2.01", kredit: "1.1.1.01" },
  { nama: "Beli peralatan", keterangan: "Pembelian peralatan usaha", debit: "1.3.3.01", kredit: "1.1.1.02" },
  { nama: "Terima pinjaman bank", keterangan: "Pencairan pinjaman bank", debit: "1.1.1.02", kredit: "2.2.2.01" },
  { nama: "Setoran modal", keterangan: "Setoran modal pemilik", debit: "1.1.1.02", kredit: "3.1.1.01" },
];

// kata kunci keterangan -> prefiks kode akun debit yang cocok
const KATA_KUNCI: [RegExp, string[]][] = [
  [/sewa/, ["6.1.5.01"]],
  [/gaji|upah|honor|lembur|bonus/, ["6.1.1"]],
  [/listrik|air|pdam|internet|telepon|wifi|pulsa/, ["6.1.4"]],
  [/iklan|promosi|endorse|ads|marketing/, ["6.2.2"]],
  [/atk|alat tulis|perlengkapan|fotokopi/, ["6.1.2", "1.1.4.03"]],
  [/perbaik|servis|service|pemeliharaan/, ["6.1.3"]],
  [/bahan|persediaan|stok|kulakan|belanja barang|beli barang/, ["1.1.4.01"]],
  [/peralatan|mesin|kompor|kulkas|etalase|meja|kursi/, ["1.3.3.01"]],
  [/kendaraan|motor|mobil/, ["1.3.4.01"]],
  [/jual|penjualan|omzet|pendapatan/, ["1.1.1.01", "1.1.1.02", "1.1.2.01"]],
  [/pelunasan piutang|terima piutang|tagih/, ["1.1.1.01", "1.1.1.02"]],
  [/bayar utang|pelunasan utang|lunasi/, ["2.1.3.01", "2.2.2.01"]],
  [/pajak|pph|ppn/, ["9.3", "2.1.4"]],
  [/bunga/, ["9.2.2.01"]],
  [/modal|setor/, ["1.1.1.02", "1.1.1.01"]],
  [/pinjam/, ["1.1.1.02"]],
  [/penyusutan|depresiasi/, ["6.1.8"]],
];

const KAS = ["1.1.1.01", "1.1.1.10", "1.1.1.02", "1.1.1.03", "1.1.1.04", "1.1.1.05", "1.1.1.06", "1.1.1.07"];

// akun debit (prefiks) -> akun kredit yang biasanya menjadi lawannya
const LAWAN: [string, string[], string][] = [
  ["6.1.1", ["2.1.5.01", ...KAS], "gaji dibayar dari kas/bank atau dicatat sebagai utang gaji"],
  ["6.1.4", [...KAS, "2.1.6"], "tagihan dibayar dari kas/bank atau dicatat sebagai utang utilitas"],
  ["6.1.5", [...KAS, "1.1.5.01"], "sewa dibayar tunai, atau mengurangi sewa dibayar di muka"],
  ["6.1.7", ["1.1.3"], "penyisihan piutang dicatat ke akun kontra piutang"],
  ["6.1.8", ["1.3.5", "1.4.2"], "penyusutan dicatat ke akumulasi penyusutan"],
  ["6", [...KAS, "2.1.3.01"], "beban dibayar dari kas/bank atau masih terutang"],
  ["9.2", [...KAS], "beban lain dibayar dari kas/bank"],
  ["9.3", [...KAS, "2.1.4"], "pajak disetor dari kas/bank atau dicatat sebagai utang pajak"],
  ["5", ["1.1.4.01"], "HPP mengurangi persediaan"],
  ["1.1.4", [...KAS, "2.1.3.01"], "persediaan dibeli tunai atau kredit ke supplier"],
  ["1.1.5", [...KAS], "biaya dibayar di muka dari kas/bank"],
  ["1.3", [...KAS, "2.1.3.01", "2.2.2.01"], "aset tetap dibeli tunai, kredit, atau dengan pinjaman"],
  ["1.1.2", ["4.2.1.01", "4.2.2.01", "4.2.9.01", "4.1.1.01"], "piutang timbul dari penjualan kredit"],
  ["1.1.1", ["4.2.1.01", "1.1.2.01", "2.2.2.01", "3.1.1.01", "9.1.1.01", "4.2.9.01", ...KAS], "kas bertambah dari penjualan, pelunasan piutang, pinjaman, atau modal"],
  ["2", [...KAS], "utang dilunasi dari kas/bank"],
  ["3", [...KAS], "pengambilan modal dari kas/bank"],
];

function cocokPrefiks(code: string, pre: string) {
  return code === pre || code.startsWith(pre + ".");
}

function dariPrefiks(accounts: Account[], prefiks: string[], kecuali: Set<string>) {
  const out: Account[] = [];
  for (const pre of prefiks) {
    for (const a of accounts) {
      if (!kecuali.has(a.id) && cocokPrefiks(a.code, pre) && !out.includes(a)) out.push(a);
    }
  }
  return out;
}

export function saranDebit(keterangan: string, accounts: Account[], kecuali: Set<string>): Account[] {
  const k = keterangan.toLowerCase();
  const prefiks = KATA_KUNCI.filter(([re]) => re.test(k)).flatMap(([, p]) => p);
  // tanpa kata kunci: tampilkan akun debit yang paling umum
  return dariPrefiks(accounts, prefiks.length ? prefiks : ["1.1.1.01", "1.1.4.01", "6.1.5.01", "6.1.1.01"], kecuali).slice(0, 6);
}

export function saranKredit(debitAccounts: Account[], accounts: Account[], kecuali: Set<string>): { akun: Account[]; alasan: string[] } {
  const prefiks: string[] = [];
  const alasan: string[] = [];
  for (const d of debitAccounts) {
    const aturan = LAWAN.find(([pre]) => cocokPrefiks(d.code, pre));
    if (!aturan) continue;
    prefiks.push(...aturan[1]);
    alasan.push(`${d.name}: ${aturan[2]}`);
  }
  return { akun: dariPrefiks(accounts, prefiks, kecuali).slice(0, 8), alasan };
}
