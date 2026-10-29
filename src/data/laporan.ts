// Mesin laporan keuangan format SAK EMKM.
//
// Saldo dasar tiap tahun dibuat dari model data contoh (deterministik), lalu
// jurnal yang diinput pengguna (Entri Jurnal, Kasir, Scan Struk) diposting ke
// pos laporan berdasarkan prefiks kode akun di Bagan Akun. Arus kas disusun
// dengan metode tidak langsung dari selisih neraca sehingga selalu
// merekonsiliasi kas awal ke kas akhir.

import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry } from "../context/JournalContext";
import { CABANG_UTAMA } from "../config/access";

export type PosDef = { key: string; label: string; prefixes: string[] };

export const NERACA = {
  asetLancar: [
    { key: "kas", label: "Kas dan setara kas", prefixes: ["1.1.1"] },
    { key: "piutang", label: "Piutang usaha", prefixes: ["1.1.2"] },
    { key: "penyisihan", label: "Penyisihan piutang tak tertagih", prefixes: ["1.1.3"] },
    { key: "persediaan", label: "Persediaan", prefixes: ["1.1.4"] },
    { key: "dibayarDimuka", label: "Biaya dan pajak dibayar di muka", prefixes: ["1.1.5"] },
    { key: "asetLancarLain", label: "Aset lancar lainnya", prefixes: ["1.1.8", "1.1.9"] },
  ],
  asetTidakLancar: [
    { key: "investasi", label: "Investasi", prefixes: ["1.2", "1.5"] },
    { key: "asetTetap", label: "Aset tetap (harga perolehan)", prefixes: ["1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.9"] },
    { key: "akumPenyusutan", label: "Akumulasi penyusutan", prefixes: ["1.3.5"] },
    { key: "asetTakBerwujud", label: "Aset tak berwujud (neto)", prefixes: ["1.4"] },
    { key: "asetLain", label: "Aset lain-lain", prefixes: ["1.9"] },
  ],
  liabilitasPendek: [
    { key: "utangUsaha", label: "Utang usaha", prefixes: ["2.1.3"] },
    { key: "utangPajak", label: "Utang pajak", prefixes: ["2.1.4"] },
    { key: "utangGaji", label: "Utang gaji dan tunjangan", prefixes: ["2.1.5"] },
    { key: "bebanAkrual", label: "Beban masih harus dibayar", prefixes: ["2.1.6"] },
    { key: "diterimaDimuka", label: "Pendapatan diterima di muka", prefixes: ["2.1.7"] },
    { key: "utangPendekLain", label: "Utang jangka pendek lainnya", prefixes: ["2.1.1", "2.1.2", "2.1.8", "2.1.9"] },
  ],
  liabilitasPanjang: [
    { key: "utangBank", label: "Utang bank", prefixes: ["2.2.2"] },
    { key: "utangPanjangLain", label: "Utang jangka panjang lainnya", prefixes: ["2.2.1", "2.2.9"] },
  ],
  ekuitas: [
    { key: "modal", label: "Modal disetor", prefixes: ["3.1", "3.2"] },
    { key: "cadangan", label: "Cadangan", prefixes: ["3.3"] },
    { key: "saldoLaba", label: "Saldo laba", prefixes: ["3.4", "3.9"] },
  ],
} satisfies Record<string, PosDef[]>;

export const LABA_RUGI = {
  pendapatan: [
    { key: "penjualan", label: "Penjualan barang", prefixes: ["4.1.1", "4.1.2", "4.2.1", "4.2.2"] },
    { key: "jasa", label: "Pendapatan jasa", prefixes: ["4.1.3", "4.1.9", "4.2.3", "4.2.9"] },
  ],
  hpp: [{ key: "hpp", label: "Harga pokok penjualan", prefixes: ["5"] }],
  bebanUsaha: [
    { key: "bebanGaji", label: "Beban gaji dan tunjangan", prefixes: ["6.1.1"] },
    { key: "bebanPerlengkapan", label: "Beban perlengkapan dan ATK", prefixes: ["6.1.2"] },
    { key: "bebanPemeliharaan", label: "Beban pemeliharaan dan perbaikan", prefixes: ["6.1.3"] },
    { key: "bebanUtilitas", label: "Beban listrik, telepon, dan utilitas", prefixes: ["6.1.4"] },
    { key: "bebanSewa", label: "Beban sewa dan asuransi", prefixes: ["6.1.5"] },
    { key: "bebanKeamanan", label: "Beban keamanan dan kebersihan", prefixes: ["6.1.6"] },
    { key: "bebanPenyisihan", label: "Beban penyisihan piutang", prefixes: ["6.1.7"] },
    { key: "bebanPenyusutan", label: "Beban penyusutan dan amortisasi", prefixes: ["6.1.8"] },
    { key: "bebanAdmin", label: "Beban administrasi dan umum", prefixes: ["6.1.9"] },
    { key: "bebanPemasaran", label: "Beban pemasaran", prefixes: ["6.2"] },
  ],
  lain: [
    { key: "pendapatanLain", label: "Pendapatan lain-lain", prefixes: ["9.1"] },
    { key: "bebanLain", label: "Beban lain-lain (termasuk bunga)", prefixes: ["9.2"] },
  ],
  pajak: [{ key: "pajak", label: "Beban pajak penghasilan (PPh final 0,5%)", prefixes: ["9.3"] }],
} satisfies Record<string, PosDef[]>;

const ALL_NERACA = Object.values(NERACA).flat();
const ALL_LR = Object.values(LABA_RUGI).flat();

export type Nilai = Record<string, number>;

export type Ringkasan = {
  totalAsetLancar: number;
  totalAsetTidakLancar: number;
  totalAset: number;
  totalLiabilitasPendek: number;
  totalLiabilitasPanjang: number;
  totalLiabilitas: number;
  totalEkuitas: number;
  totalPendapatan: number;
  labaKotor: number;
  totalBebanUsaha: number;
  labaUsaha: number;
  labaSebelumPajak: number;
  labaBersih: number;
};

export type ArusKas = {
  operasi: { label: string; nilai: number }[];
  investasi: { label: string; nilai: number }[];
  pendanaan: { label: string; nilai: number }[];
  totalOperasi: number;
  totalInvestasi: number;
  totalPendanaan: number;
  kenaikanKas: number;
  kasAwal: number;
  kasAkhir: number;
};

export type PerubahanEkuitas = {
  modalAwal: number;
  setoranModal: number;
  modalAkhir: number;
  cadanganAwal: number;
  cadanganAkhir: number;
  saldoLabaAwal: number;
  labaBersih: number;
  prive: number;
  saldoLabaAkhir: number;
  totalAwal: number;
  totalAkhir: number;
};

export type Bulanan = {
  bulan: string;
  pendapatan: number;
  beban: number;
  laba: number;
  kasMasuk: number;
  kasKeluar: number;
};

export type Laporan = {
  tahun: number;
  entitas: string;
  berjalan: boolean;
  bulanBerjalan: number;
  neraca: Nilai;
  neracaLalu: Nilai;
  lr: Nilai;
  lrLalu: Nilai;
  ringkasan: Ringkasan;
  ringkasanLalu: Ringkasan;
  arusKas: ArusKas;
  arusKasLalu: ArusKas;
  ekuitas: PerubahanEkuitas;
  bulanan: Bulanan[];
  // hanya ada pada laporan rentang tanggal (hitungLaporanRentang)
  periode?: {
    dari: string;
    sampai: string;
    hari: number;
    label: string;
    kolomPeriode: [string, string];
    kolomPosisi: [string, string];
  };
};

export const KONSOLIDASI = "Konsolidasi";

// Daftar cabang aktif diatur oleh AccountContext (cabang bisa dibuka kapan saja).
// Tanpa cabang, "Konsolidasi" berarti usaha tunggal milik induk = Cabang Utama.
let DAFTAR_CABANG: string[] = [];

export function aturDaftarCabang(daftar: string[]) {
  if (daftar.join("|") === DAFTAR_CABANG.join("|")) return;
  DAFTAR_CABANG = [...daftar];
  cacheModel.clear();
}

export function daftarEntitas() {
  return [KONSOLIDASI, ...DAFTAR_CABANG];
}

// Skala data contoh tiap cabang. Cabang Utama = skala penuh toko awal; cabang baru
// 30–55% darinya (stabil per nama). Konsolidasi = jumlah semua cabang.
function porsiCabang(nama: string) {
  if (nama === CABANG_UTAMA) return 1;
  const h = Array.from(nama).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
  return 0.3 + (h % 1000) / 4000;
}

// Nama entitas untuk judul laporan
export function labelEntitas(entitas: string) {
  return entitas === KONSOLIDASI && !DAFTAR_CABANG.length ? "Seluruh usaha" : entitas;
}

function porsiEntitas(entitas: string) {
  if (entitas !== KONSOLIDASI) return porsiCabang(entitas);
  return DAFTAR_CABANG.length ? DAFTAR_CABANG.reduce((t, c) => t + porsiCabang(c), 0) : 1;
}

export const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const SEKARANG = new Date();
export const TAHUN_BERJALAN = SEKARANG.getFullYear();
const BULAN_BERJALAN = SEKARANG.getMonth() + 1;
const TAHUN_AWAL_MODEL = TAHUN_BERJALAN - 4;
export const TAHUN_TERSEDIA = [3, 2, 1, 0].map((i) => TAHUN_BERJALAN - i);

const r = (x: number) => Math.round(x / 1000) * 1000;

// ---------- Model data dasar ----------

type Snapshot = { neraca: Nilai; lr: Nilai };

function modelDasar(porsi: number): Record<number, Snapshot> {
  const hasil: Record<number, Snapshot> = {};
  let saldoLaba = r(120e6 * porsi);
  let akum = r(90e6 * porsi);

  for (let y = TAHUN_AWAL_MODEL; y <= TAHUN_BERJALAN; y++) {
    const i = y - TAHUN_AWAL_MODEL;
    const frac = y === TAHUN_BERJALAN ? BULAN_BERJALAN / 12 : 1;
    const g = Math.pow(1.12, i);
    const penjA = 1.05e9 * g * porsi;
    const jasaA = 0.15e9 * g * porsi;
    const revA = penjA + jasaA;
    const asetTetap = r(800e6 * porsi * (1 + 0.08 * i));
    const utangBank = r(Math.max(60e6, 300e6 * (1 - 0.15 * i)) * porsi);

    const lr: Nilai = {
      penjualan: r(penjA * frac),
      jasa: r(jasaA * frac),
      hpp: r(penjA * 0.58 * frac),
      bebanGaji: r(revA * 0.1 * frac),
      bebanPerlengkapan: r(revA * 0.012 * frac),
      bebanPemeliharaan: r(revA * 0.008 * frac),
      bebanUtilitas: r(revA * 0.02 * frac),
      bebanSewa: r(revA * 0.03 * frac),
      bebanKeamanan: r(revA * 0.006 * frac),
      bebanPenyisihan: r(revA * 0.003 * frac),
      bebanPenyusutan: r(asetTetap * 0.1 * frac),
      bebanAdmin: r(revA * 0.015 * frac),
      bebanPemasaran: r(revA * 0.025 * frac),
      pendapatanLain: r(revA * 0.004 * frac),
      bebanLain: r(utangBank * 0.09 * frac),
      pajak: r(revA * frac * 0.005),
    };
    const laba = hitungRingkasanLR(lr).labaBersih;
    const prive = r(Math.max(0, laba) * 0.6);
    saldoLaba += laba - prive;
    akum += lr.bebanPenyusutan;

    const n: Nilai = {
      piutang: r(revA * 0.08),
      penyisihan: -r(revA * 0.08 * 0.03),
      persediaan: r(penjA * 0.58 * 0.1),
      dibayarDimuka: r(revA * 0.01),
      asetLancarLain: r(revA * 0.005),
      investasi: r(50e6 * porsi),
      asetTetap,
      akumPenyusutan: -akum,
      asetTakBerwujud: r(30e6 * porsi),
      asetLain: r(10e6 * porsi),
      utangUsaha: r(penjA * 0.58 * 0.07),
      utangPajak: r((revA * 0.005) / 12),
      utangGaji: r((revA * 0.1) / 12),
      bebanAkrual: r((revA * 0.02) / 12),
      diterimaDimuka: r(revA * 0.005),
      utangPendekLain: r(40e6 * porsi),
      utangBank,
      utangPanjangLain: r(60e6 * porsi),
      modal: r(600e6 * porsi),
      cadangan: r(50e6 * porsi),
      saldoLaba,
    };
    // Kas sebagai penyeimbang supaya aset = liabilitas + ekuitas
    const lainnya = sum(n, [...NERACA.asetLancar, ...NERACA.asetTidakLancar].filter((p) => p.key !== "kas"));
    const sisi = sum(n, [...NERACA.liabilitasPendek, ...NERACA.liabilitasPanjang, ...NERACA.ekuitas]);
    n.kas = sisi - lainnya;
    hasil[y] = { neraca: n, lr };
  }
  return hasil;
}

const cacheModel = new Map<string, Record<number, Snapshot>>();
function model(entitas: string) {
  if (!cacheModel.has(entitas)) cacheModel.set(entitas, modelDasar(porsiEntitas(entitas)));
  return cacheModel.get(entitas)!;
}

// ---------- Utilitas ----------

function sum(n: Nilai, pos: PosDef[]) {
  return pos.reduce((s, p) => s + (n[p.key] || 0), 0);
}

function hitungRingkasanLR(lr: Nilai) {
  const totalPendapatan = sum(lr, LABA_RUGI.pendapatan);
  const labaKotor = totalPendapatan - (lr.hpp || 0);
  const totalBebanUsaha = sum(lr, LABA_RUGI.bebanUsaha);
  const labaUsaha = labaKotor - totalBebanUsaha;
  const labaSebelumPajak = labaUsaha + (lr.pendapatanLain || 0) - (lr.bebanLain || 0);
  const labaBersih = labaSebelumPajak - (lr.pajak || 0);
  return { totalPendapatan, labaKotor, totalBebanUsaha, labaUsaha, labaSebelumPajak, labaBersih };
}

function ringkas(n: Nilai, lr: Nilai): Ringkasan {
  const totalAsetLancar = sum(n, NERACA.asetLancar);
  const totalAsetTidakLancar = sum(n, NERACA.asetTidakLancar);
  const totalLiabilitasPendek = sum(n, NERACA.liabilitasPendek);
  const totalLiabilitasPanjang = sum(n, NERACA.liabilitasPanjang);
  return {
    totalAsetLancar,
    totalAsetTidakLancar,
    totalAset: totalAsetLancar + totalAsetTidakLancar,
    totalLiabilitasPendek,
    totalLiabilitasPanjang,
    totalLiabilitas: totalLiabilitasPendek + totalLiabilitasPanjang,
    totalEkuitas: sum(n, NERACA.ekuitas),
    ...hitungRingkasanLR(lr),
  };
}

function cariPos(code: string, pos: PosDef[]) {
  // prefiks terpanjang yang cocok menang
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

// Posting jurnal: neraca kumulatif s.d. akhir tahun, laba rugi hanya tahun itu.
function posting(
  snap: Snapshot,
  tahun: number,
  entries: JournalEntry[],
  accounts: Account[],
): Snapshot {
  const neraca = { ...snap.neraca };
  const lr = { ...snap.lr };
  const byId = new Map(accounts.map((a) => [a.id, a]));

  for (const e of entries) {
    if (e.contoh) continue;
    const y = Number((e.date || "").slice(0, 4));
    if (!y || y > tahun) continue;
    for (const l of e.lines) {
      const acc = byId.get(l.accountId);
      if (!acc || !(l.amount > 0)) continue;
      const debit = l.side === "debit";
      if (acc.type === "asset" || acc.type === "liability" || acc.type === "equity") {
        const p = cariPos(acc.code, ALL_NERACA);
        if (!p) continue;
        const naik = acc.type === "asset" ? debit : !debit;
        neraca[p.key] = (neraca[p.key] || 0) + (naik ? l.amount : -l.amount);
      } else {
        const p = cariPos(acc.code, ALL_LR);
        if (!p) continue;
        const naik = acc.type === "revenue" ? !debit : debit;
        const delta = naik ? l.amount : -l.amount;
        // pengaruh ke laba: pendapatan menambah, beban mengurangi
        const keLaba = acc.type === "revenue" ? delta : -delta;
        neraca.saldoLaba = (neraca.saldoLaba || 0) + keLaba;
        if (y === tahun) lr[p.key] = (lr[p.key] || 0) + delta;
      }
    }
  }
  return { neraca, lr };
}

function susunArusKas(n: Nilai, prev: Nilai, lr: Nilai): ArusKas {
  const d = (k: string) => (n[k] || 0) - (prev[k] || 0);
  const laba = hitungRingkasanLR(lr).labaBersih;
  const prive = (prev.saldoLaba || 0) + laba - (n.saldoLaba || 0);

  const operasi = [
    { label: "Laba bersih", nilai: laba },
    { label: "Penyusutan aset tetap", nilai: -d("akumPenyusutan") },
    { label: "(Kenaikan) penurunan piutang usaha", nilai: -(d("piutang") + d("penyisihan")) },
    { label: "(Kenaikan) penurunan persediaan", nilai: -d("persediaan") },
    { label: "(Kenaikan) penurunan aset lancar lain", nilai: -(d("dibayarDimuka") + d("asetLancarLain")) },
    { label: "Kenaikan (penurunan) utang usaha", nilai: d("utangUsaha") },
    {
      label: "Kenaikan (penurunan) utang pajak dan beban akrual",
      nilai: d("utangPajak") + d("utangGaji") + d("bebanAkrual") + d("diterimaDimuka"),
    },
  ];
  const investasi = [
    { label: "Perolehan aset tetap", nilai: -d("asetTetap") },
    { label: "Penempatan investasi", nilai: -d("investasi") },
    { label: "Perolehan aset tak berwujud dan aset lain", nilai: -(d("asetTakBerwujud") + d("asetLain")) },
  ];
  const pendanaan = [
    { label: "Penerimaan (pembayaran) utang bank", nilai: d("utangBank") },
    { label: "Penerimaan (pembayaran) utang lainnya", nilai: d("utangPanjangLain") + d("utangPendekLain") },
    { label: "Setoran modal dan cadangan", nilai: d("modal") + d("cadangan") },
    { label: "Pengambilan prive / pembagian laba", nilai: -prive },
  ];
  const t = (xs: { nilai: number }[]) => xs.reduce((s, x) => s + x.nilai, 0);
  const totalOperasi = t(operasi);
  const totalInvestasi = t(investasi);
  const totalPendanaan = t(pendanaan);
  return {
    operasi,
    investasi,
    pendanaan,
    totalOperasi,
    totalInvestasi,
    totalPendanaan,
    kenaikanKas: totalOperasi + totalInvestasi + totalPendanaan,
    kasAwal: prev.kas || 0,
    kasAkhir: n.kas || 0,
  };
}

// Pola musiman penjualan (Lebaran & akhir tahun lebih tinggi)
const MUSIM = [0.074, 0.07, 0.08, 0.095, 0.083, 0.078, 0.08, 0.082, 0.08, 0.084, 0.088, 0.106];

function susunBulanan(tahun: number, lr: Nilai, entries: JournalEntry[], accounts: Account[], bulanMaks: number): Bulanan[] {
  const rk = hitungRingkasanLR(lr);
  const totalBeban = rk.totalPendapatan + (lr.pendapatanLain || 0) - rk.labaBersih;
  const bobot = MUSIM.slice(0, bulanMaks);
  const totalBobot = bobot.reduce((s, x) => s + x, 0);
  const byId = new Map(accounts.map((a) => [a.id, a]));

  // jurnal per bulan yang memengaruhi pendapatan/beban
  const tambahan = Array.from({ length: bulanMaks }, () => ({ p: 0, b: 0 }));
  for (const e of entries) {
    if (e.contoh || Number(e.date?.slice(0, 4)) !== tahun) continue;
    const m = Number(e.date.slice(5, 7)) - 1;
    if (m < 0 || m >= bulanMaks) continue;
    for (const l of e.lines) {
      const a = byId.get(l.accountId);
      if (!a) continue;
      if (a.type === "revenue") tambahan[m].p += l.side === "credit" ? l.amount : -l.amount;
      if (a.type === "expense") tambahan[m].b += l.side === "debit" ? l.amount : -l.amount;
    }
  }
  const basisPendapatan = rk.totalPendapatan - tambahan.reduce((s, x) => s + x.p, 0);
  const basisBeban = totalBeban - tambahan.reduce((s, x) => s + x.b, 0);

  return bobot.map((w, i) => {
    // beban lebih rata dibanding pendapatan
    const wb = (w + 1 / 12) / 2 / ((totalBobot + bulanMaks / 12) / 2);
    const pendapatan = r((basisPendapatan * w) / totalBobot) + tambahan[i].p;
    const beban = r(basisBeban * wb) + tambahan[i].b;
    return {
      bulan: NAMA_BULAN[i],
      pendapatan,
      beban,
      laba: pendapatan - beban,
      kasMasuk: r(pendapatan * 0.94),
      kasKeluar: r(beban * 0.9),
    };
  });
}

// ---------- API utama ----------

export function hitungLaporan(
  entitas: string,
  tahun: number,
  entries: JournalEntry[],
  accounts: Account[],
): Laporan {
  const m = model(entitas);
  const cur = posting(m[tahun], tahun, entries, accounts);
  const lalu = posting(m[tahun - 1], tahun - 1, entries, accounts);
  const lalu2 = m[tahun - 2] ? posting(m[tahun - 2], tahun - 2, entries, accounts) : lalu;

  const arusKas = susunArusKas(cur.neraca, lalu.neraca, cur.lr);
  const arusKasLalu = susunArusKas(lalu.neraca, lalu2.neraca, lalu.lr);
  const labaBersih = hitungRingkasanLR(cur.lr).labaBersih;
  const prive = (lalu.neraca.saldoLaba || 0) + labaBersih - (cur.neraca.saldoLaba || 0);

  const ekuitas: PerubahanEkuitas = {
    modalAwal: lalu.neraca.modal || 0,
    setoranModal: (cur.neraca.modal || 0) - (lalu.neraca.modal || 0),
    modalAkhir: cur.neraca.modal || 0,
    cadanganAwal: lalu.neraca.cadangan || 0,
    cadanganAkhir: cur.neraca.cadangan || 0,
    saldoLabaAwal: lalu.neraca.saldoLaba || 0,
    labaBersih,
    prive,
    saldoLabaAkhir: cur.neraca.saldoLaba || 0,
    totalAwal: sum(lalu.neraca, NERACA.ekuitas),
    totalAkhir: sum(cur.neraca, NERACA.ekuitas),
  };

  const berjalan = tahun === TAHUN_BERJALAN;
  const bulanMaks = berjalan ? BULAN_BERJALAN : 12;

  return {
    tahun,
    entitas: labelEntitas(entitas),
    berjalan,
    bulanBerjalan: bulanMaks,
    neraca: cur.neraca,
    neracaLalu: lalu.neraca,
    lr: cur.lr,
    lrLalu: lalu.lr,
    ringkasan: ringkas(cur.neraca, cur.lr),
    ringkasanLalu: ringkas(lalu.neraca, lalu.lr),
    arusKas,
    arusKasLalu,
    ekuitas,
    bulanan: susunBulanan(tahun, cur.lr, entries, accounts, bulanMaks),
  };
}

// ---------- Laporan untuk rentang tanggal bebas ----------
//
// Model dasar bersifat tahunan. Untuk rentang tanggal:
// - laba rugi tahunan dibagi ke tiap hari mengikuti bobot musiman (MUSIM), lalu dijumlahkan;
// - neraca pada suatu tanggal diinterpolasi antara posisi akhir tahun lalu dan akhir tahun itu
//   (interpolasi linear dua neraca seimbang tetap seimbang);
// - jurnal pengguna diposting sesuai tanggalnya.
// Rentang 1 Januari s.d. 31 Desember (atau s.d. hari ini) menghasilkan angka yang sama dengan hitungLaporan.

const HARI_MS = 86_400_000;
export const HARI_INI = iso(new Date(Date.UTC(TAHUN_BERJALAN, SEKARANG.getMonth(), SEKARANG.getDate())));
export const TANGGAL_MIN = `${TAHUN_TERSEDIA[0]}-01-01`;

function keTanggal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function geserHari(s: string, n: number) {
  return iso(new Date(keTanggal(s).getTime() + n * HARI_MS));
}
function geserTahun(s: string, n: number) {
  const d = keTanggal(s);
  const y = d.getUTCFullYear() + n;
  const hariMaks = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(y, d.getUTCMonth(), Math.min(d.getUTCDate(), hariMaks))));
}
function selisihHari(a: string, b: string) {
  return Math.round((keTanggal(b).getTime() - keTanggal(a).getTime()) / HARI_MS);
}
const hariDalamBulan = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

type ModeBobot = "musim" | "rata";

// Bobot kumulatif sejak 1 Januari s.d. akhir tanggal s (0..1 untuk setahun penuh)
function bobotKumulatif(s: string, mode: ModeBobot) {
  const d = keTanggal(s);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const tgl = d.getUTCDate();
  if (mode === "rata") {
    const awal = Date.UTC(y, 0, 1);
    const hariTahun = (Date.UTC(y + 1, 0, 1) - awal) / HARI_MS;
    return ((d.getTime() - awal) / HARI_MS + 1) / hariTahun;
  }
  let w = 0;
  for (let i = 0; i < m; i++) w += MUSIM[i];
  return w + (MUSIM[m] * tgl) / hariDalamBulan(y, m);
}

// Titik potret model per tahun: akhir tahun, atau hari ini untuk tahun berjalan
function bobotPotret(y: number, mode: ModeBobot) {
  return y === TAHUN_BERJALAN ? bobotKumulatif(HARI_INI, mode) : 1;
}

// Laba rugi model (tanpa jurnal) untuk rentang [a, b]
function lrModel(m: Record<number, Snapshot>, a: string, b: string, mode: ModeBobot): Nilai {
  const hasil: Nilai = {};
  const ya = Number(a.slice(0, 4));
  const yb = Number(b.slice(0, 4));
  for (let y = ya; y <= yb; y++) {
    const snap = m[y];
    if (!snap) continue;
    const s = y === ya ? a : `${y}-01-01`;
    const e = y === yb ? b : `${y}-12-31`;
    const sebelum = s.endsWith("-01-01") ? 0 : bobotKumulatif(geserHari(s, -1), mode);
    const porsi = (bobotKumulatif(e, mode) - sebelum) / bobotPotret(y, mode);
    for (const [k, v] of Object.entries(snap.lr)) hasil[k] = (hasil[k] || 0) + v * porsi;
  }
  for (const k of Object.keys(hasil)) hasil[k] = r(hasil[k]);
  return hasil;
}

// Neraca model (tanpa jurnal) pada akhir tanggal s
function neracaModel(m: Record<number, Snapshot>, s: string): Nilai {
  const y = Number(s.slice(0, 4));
  const kini = m[y] ?? m[TAHUN_BERJALAN];
  const lalu = m[y - 1] ?? kini;
  const t = Math.min(1, bobotKumulatif(s, "musim") / bobotPotret(y, "musim"));
  const hasil: Nilai = {};
  for (const k of new Set([...Object.keys(lalu.neraca), ...Object.keys(kini.neraca)])) {
    const a = lalu.neraca[k] || 0;
    hasil[k] = a + ((kini.neraca[k] || 0) - a) * t;
  }
  return hasil;
}

// Posting jurnal: neraca memuat semua jurnal s.d. `posisi`, laba rugi hanya jurnal di [dari, sampai]
function postingRentang(neraca: Nilai, lr: Nilai, posisi: string, dari: string, sampai: string, entries: JournalEntry[], accounts: Account[]) {
  const n = { ...neraca };
  const l = { ...lr };
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const e of entries) {
    if (e.contoh || !e.date || e.date > posisi) continue;
    const dalam = e.date >= dari && e.date <= sampai;
    for (const ln of e.lines) {
      const acc = byId.get(ln.accountId);
      if (!acc || !(ln.amount > 0)) continue;
      const debit = ln.side === "debit";
      if (acc.type === "asset" || acc.type === "liability" || acc.type === "equity") {
        const p = cariPos(acc.code, ALL_NERACA);
        if (!p) continue;
        const naik = acc.type === "asset" ? debit : !debit;
        n[p.key] = (n[p.key] || 0) + (naik ? ln.amount : -ln.amount);
      } else {
        const p = cariPos(acc.code, ALL_LR);
        if (!p) continue;
        const naik = acc.type === "revenue" ? !debit : debit;
        const delta = naik ? ln.amount : -ln.amount;
        n.saldoLaba = (n.saldoLaba || 0) + (acc.type === "revenue" ? delta : -delta);
        if (dalam) l[p.key] = (l[p.key] || 0) + delta;
      }
    }
  }
  return { neraca: n, lr: l };
}

const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function formatTanggal(s: string, panjang = false) {
  const d = keTanggal(s);
  return `${d.getUTCDate()} ${(panjang ? BULAN_PANJANG : NAMA_BULAN)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// "1 Jan – 19 Okt 2026", atau "2025" bila setahun penuh
function labelRentang(dari: string, sampai: string, singkat: boolean) {
  if (dari.endsWith("-01-01") && sampai.endsWith("-12-31") && dari.slice(0, 4) === sampai.slice(0, 4)) return dari.slice(0, 4);
  const a = formatTanggal(dari, !singkat);
  const b = formatTanggal(sampai, !singkat);
  return dari.slice(0, 4) === sampai.slice(0, 4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}

// Kelompok waktu untuk grafik: harian (≤ 31 hari), bulanan (≤ 2 tahun), atau kuartalan
function susunKelompok(dari: string, sampai: string) {
  const hari = selisihHari(dari, sampai) + 1;
  const kelompok: { a: string; b: string; label: string }[] = [];
  if (hari <= 31) {
    for (let s = dari; s <= sampai; s = geserHari(s, 1)) {
      const d = keTanggal(s);
      kelompok.push({ a: s, b: s, label: `${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth()]}` });
    }
    return kelompok;
  }
  const lintasTahun = dari.slice(0, 4) !== sampai.slice(0, 4);
  const langkah = hari <= 731 ? 1 : 3;
  const d = keTanggal(dari);
  let y = d.getUTCFullYear();
  let m = langkah === 3 ? Math.floor(d.getUTCMonth() / 3) * 3 : d.getUTCMonth();
  for (;;) {
    const awal = iso(new Date(Date.UTC(y, m, 1)));
    if (awal > sampai) break;
    const akhir = iso(new Date(Date.UTC(y, m + langkah, 0)));
    const label =
      langkah === 3 ? `K${m / 3 + 1} ${String(y).slice(2)}` : lintasTahun ? `${NAMA_BULAN[m]} ${String(y).slice(2)}` : NAMA_BULAN[m];
    kelompok.push({ a: awal < dari ? dari : awal, b: akhir > sampai ? sampai : akhir, label });
    m += langkah;
    if (m > 11) {
      m -= 12;
      y++;
    }
  }
  return kelompok;
}

function susunBulananRentang(
  m: Record<number, Snapshot>,
  dari: string,
  sampai: string,
  entries: JournalEntry[],
  accounts: Account[],
): Bulanan[] {
  const kelompok = susunKelompok(dari, sampai);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const totalBeban = (x: Nilai) => {
    const rk = hitungRingkasanLR(x);
    return rk.totalPendapatan + (x.pendapatanLain || 0) - rk.labaBersih;
  };
  // beban model lebih rata dibanding pendapatan: campuran bobot musiman dan rata
  const bebanModelRentang = totalBeban(lrModel(m, dari, sampai, "musim"));
  const mentah = kelompok.map((k) => (totalBeban(lrModel(m, k.a, k.b, "musim")) + totalBeban(lrModel(m, k.a, k.b, "rata"))) / 2);
  const totalMentah = mentah.reduce((s, x) => s + x, 0) || 1;

  return kelompok.map((k, i) => {
    let p = hitungRingkasanLR(lrModel(m, k.a, k.b, "musim")).totalPendapatan;
    let b = (mentah[i] / totalMentah) * bebanModelRentang;
    for (const e of entries) {
      if (e.contoh || !e.date || e.date < k.a || e.date > k.b) continue;
      for (const l of e.lines) {
        const a = byId.get(l.accountId);
        if (a?.type === "revenue") p += l.side === "credit" ? l.amount : -l.amount;
        if (a?.type === "expense") b += l.side === "debit" ? l.amount : -l.amount;
      }
    }
    const pendapatan = r(p);
    const beban = r(b);
    return { bulan: k.label, pendapatan, beban, laba: pendapatan - beban, kasMasuk: r(pendapatan * 0.94), kasKeluar: r(beban * 0.9) };
  });
}

export function hitungLaporanRentang(
  entitas: string,
  dariInput: string,
  sampaiInput: string,
  entries: JournalEntry[],
  accounts: Account[],
): Laporan {
  const m = model(entitas);
  // batasi ke data yang tersedia dan jangan melewati hari ini
  let sampai = sampaiInput > HARI_INI ? HARI_INI : sampaiInput;
  let dari = dariInput < TANGGAL_MIN ? TANGGAL_MIN : dariInput;
  if (dari > sampai) [dari, sampai] = [sampai, dari];
  const dariLalu = geserTahun(dari, -1);
  const sampaiLalu = geserTahun(sampai, -1);

  const hitung = (a: string, b: string) => {
    const awal = geserHari(a, -1);
    const kini = postingRentang(neracaModel(m, b), lrModel(m, a, b, "musim"), b, a, b, entries, accounts);
    const sebelum = postingRentang(neracaModel(m, awal), {}, awal, a, b, entries, accounts).neraca;
    for (const k of Object.keys(kini.neraca)) kini.neraca[k] = r(kini.neraca[k]);
    for (const k of Object.keys(sebelum)) sebelum[k] = r(sebelum[k]);
    // pembulatan bisa menggeser keseimbangan beberapa ribu rupiah: kas sebagai penyeimbang
    for (const n of [kini.neraca, sebelum]) {
      const lain = sum(n, [...NERACA.asetLancar, ...NERACA.asetTidakLancar].filter((p) => p.key !== "kas"));
      n.kas = sum(n, [...NERACA.liabilitasPendek, ...NERACA.liabilitasPanjang, ...NERACA.ekuitas]) - lain;
    }
    return { ...kini, awal: sebelum };
  };

  const cur = hitung(dari, sampai);
  const lalu = hitung(dariLalu, sampaiLalu);
  const labaBersih = hitungRingkasanLR(cur.lr).labaBersih;

  const ekuitas: PerubahanEkuitas = {
    modalAwal: cur.awal.modal || 0,
    setoranModal: (cur.neraca.modal || 0) - (cur.awal.modal || 0),
    modalAkhir: cur.neraca.modal || 0,
    cadanganAwal: cur.awal.cadangan || 0,
    cadanganAkhir: cur.neraca.cadangan || 0,
    saldoLabaAwal: cur.awal.saldoLaba || 0,
    labaBersih,
    prive: (cur.awal.saldoLaba || 0) + labaBersih - (cur.neraca.saldoLaba || 0),
    saldoLabaAkhir: cur.neraca.saldoLaba || 0,
    totalAwal: sum(cur.awal, NERACA.ekuitas),
    totalAkhir: sum(cur.neraca, NERACA.ekuitas),
  };

  return {
    tahun: Number(sampai.slice(0, 4)),
    entitas: labelEntitas(entitas),
    berjalan: false,
    bulanBerjalan: 12, // pembanding sudah periode yang sama tahun lalu, tidak perlu disetahunkan
    neraca: cur.neraca,
    neracaLalu: lalu.neraca,
    lr: cur.lr,
    lrLalu: lalu.lr,
    ringkasan: ringkas(cur.neraca, cur.lr),
    ringkasanLalu: ringkas(lalu.neraca, lalu.lr),
    arusKas: susunArusKas(cur.neraca, cur.awal, cur.lr),
    arusKasLalu: susunArusKas(lalu.neraca, lalu.awal, lalu.lr),
    ekuitas,
    bulanan: susunBulananRentang(m, dari, sampai, entries, accounts),
    periode: {
      dari,
      sampai,
      hari: selisihHari(dari, sampai) + 1,
      label: labelRentang(dari, sampai, false),
      kolomPeriode: [labelRentang(dari, sampai, true), labelRentang(dariLalu, sampaiLalu, true)],
      kolomPosisi: [formatTanggal(sampai), formatTanggal(sampaiLalu)],
    },
  };
}

export function formatRp(v: number) {
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(Rp ${s})` : `Rp ${s}`;
}

export function formatRpSingkat(v: number) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}Rp ${(a / 1e9).toFixed(2).replace(".", ",")} M`;
  if (a >= 1e6) return `${sign}Rp ${(a / 1e6).toFixed(1).replace(".", ",")} jt`;
  if (a >= 1e3) return `${sign}Rp ${(a / 1e3).toFixed(0)} rb`;
  return `${sign}Rp ${a}`;
}

export function labelPeriode(lap: Pick<Laporan, "tahun" | "berjalan" | "bulanBerjalan" | "periode">) {
  if (lap.periode) return lap.periode.label;
  return lap.berjalan
    ? `1 Januari – ${NAMA_BULAN[lap.bulanBerjalan - 1]} ${lap.tahun} (berjalan)`
    : `1 Januari – 31 Desember ${lap.tahun}`;
}
