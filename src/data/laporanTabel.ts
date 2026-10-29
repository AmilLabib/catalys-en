// Menyusun baris tabel laporan (format SAK EMKM) dari hasil hitungLaporan.
// Dipakai bersama oleh tampilan layar, ekspor Excel, dan ekspor PDF.
import { LABA_RUGI, NERACA, labelPeriode, type Laporan, type PosDef } from "./laporan";

export type TipeBaris = "judul" | "subjudul" | "baris" | "subtotal" | "total";
export type Baris = { label: string; tipe: TipeBaris; nilai?: number; lalu?: number; catatan?: string };

export type Tabel = { key: string; judul: string; kolom: [string, string]; baris: Baris[] };

function pos(defs: PosDef[], cur: Record<string, number>, prev: Record<string, number>, negatif = false): Baris[] {
  return defs
    .map((p) => ({
      label: p.label,
      tipe: "baris" as const,
      nilai: negatif ? -(cur[p.key] || 0) : cur[p.key] || 0,
      lalu: negatif ? -(prev[p.key] || 0) : prev[p.key] || 0,
    }))
    .filter((b) => b.nilai !== 0 || b.lalu !== 0);
}

export function susunTabel(lap: Laporan): Tabel[] {
  const t = lap.tahun;
  const kolomNeraca: [string, string] = lap.periode
    ? lap.periode.kolomPosisi
    : [lap.berjalan ? `Posisi ${t} (berjalan)` : `31 Des ${t}`, `31 Des ${t - 1}`];
  const kolomPeriode: [string, string] = lap.periode
    ? lap.periode.kolomPeriode
    : [lap.berjalan ? `${t} (berjalan)` : String(t), String(t - 1)];
  const n = lap.neraca;
  const p = lap.neracaLalu;
  const R = lap.ringkasan;
  const RL = lap.ringkasanLalu;

  const neraca: Baris[] = [
    { label: "ASET", tipe: "judul" },
    { label: "Aset Lancar", tipe: "subjudul" },
    ...pos(NERACA.asetLancar, n, p),
    { label: "Jumlah Aset Lancar", tipe: "subtotal", nilai: R.totalAsetLancar, lalu: RL.totalAsetLancar },
    { label: "Aset Tidak Lancar", tipe: "subjudul" },
    ...pos(NERACA.asetTidakLancar, n, p),
    { label: "Jumlah Aset Tidak Lancar", tipe: "subtotal", nilai: R.totalAsetTidakLancar, lalu: RL.totalAsetTidakLancar },
    { label: "JUMLAH ASET", tipe: "total", nilai: R.totalAset, lalu: RL.totalAset },
    { label: "LIABILITAS DAN EKUITAS", tipe: "judul" },
    { label: "Liabilitas Jangka Pendek", tipe: "subjudul" },
    ...pos(NERACA.liabilitasPendek, n, p),
    { label: "Jumlah Liabilitas Jangka Pendek", tipe: "subtotal", nilai: R.totalLiabilitasPendek, lalu: RL.totalLiabilitasPendek },
    { label: "Liabilitas Jangka Panjang", tipe: "subjudul" },
    ...pos(NERACA.liabilitasPanjang, n, p),
    { label: "Jumlah Liabilitas Jangka Panjang", tipe: "subtotal", nilai: R.totalLiabilitasPanjang, lalu: RL.totalLiabilitasPanjang },
    { label: "Jumlah Liabilitas", tipe: "subtotal", nilai: R.totalLiabilitas, lalu: RL.totalLiabilitas },
    { label: "Ekuitas", tipe: "subjudul" },
    ...pos(NERACA.ekuitas, n, p),
    { label: "Jumlah Ekuitas", tipe: "subtotal", nilai: R.totalEkuitas, lalu: RL.totalEkuitas },
    {
      label: "JUMLAH LIABILITAS DAN EKUITAS",
      tipe: "total",
      nilai: R.totalLiabilitas + R.totalEkuitas,
      lalu: RL.totalLiabilitas + RL.totalEkuitas,
    },
  ];

  const lr = lap.lr;
  const lrp = lap.lrLalu;
  const labaRugi: Baris[] = [
    { label: "Pendapatan", tipe: "subjudul" },
    ...pos(LABA_RUGI.pendapatan, lr, lrp),
    { label: "Jumlah Pendapatan", tipe: "subtotal", nilai: R.totalPendapatan, lalu: RL.totalPendapatan },
    ...pos(LABA_RUGI.hpp, lr, lrp, true),
    { label: "LABA KOTOR", tipe: "total", nilai: R.labaKotor, lalu: RL.labaKotor },
    { label: "Beban Usaha", tipe: "subjudul" },
    ...pos(LABA_RUGI.bebanUsaha, lr, lrp, true),
    { label: "Jumlah Beban Usaha", tipe: "subtotal", nilai: -R.totalBebanUsaha, lalu: -RL.totalBebanUsaha },
    { label: "LABA USAHA", tipe: "total", nilai: R.labaUsaha, lalu: RL.labaUsaha },
    { label: "Pendapatan (Beban) Lain-lain", tipe: "subjudul" },
    {
      label: LABA_RUGI.lain[0].label,
      tipe: "baris",
      nilai: lr.pendapatanLain || 0,
      lalu: lrp.pendapatanLain || 0,
    },
    {
      label: LABA_RUGI.lain[1].label,
      tipe: "baris",
      nilai: -(lr.bebanLain || 0),
      lalu: -(lrp.bebanLain || 0),
    },
    { label: "LABA SEBELUM PAJAK", tipe: "total", nilai: R.labaSebelumPajak, lalu: RL.labaSebelumPajak },
    ...pos(LABA_RUGI.pajak, lr, lrp, true),
    { label: "LABA BERSIH", tipe: "total", nilai: R.labaBersih, lalu: RL.labaBersih },
  ];

  const ak = lap.arusKas;
  const akl = lap.arusKasLalu;
  const zip = (a: { label: string; nilai: number }[], b: { label: string; nilai: number }[]): Baris[] =>
    a.map((x, i) => ({ label: x.label, tipe: "baris" as const, nilai: x.nilai, lalu: b[i]?.nilai ?? 0 }));
  const arusKas: Baris[] = [
    { label: "Arus Kas dari Aktivitas Operasi", tipe: "subjudul" },
    ...zip(ak.operasi, akl.operasi),
    { label: "Kas Bersih dari Aktivitas Operasi", tipe: "subtotal", nilai: ak.totalOperasi, lalu: akl.totalOperasi },
    { label: "Arus Kas dari Aktivitas Investasi", tipe: "subjudul" },
    ...zip(ak.investasi, akl.investasi),
    { label: "Kas Bersih dari Aktivitas Investasi", tipe: "subtotal", nilai: ak.totalInvestasi, lalu: akl.totalInvestasi },
    { label: "Arus Kas dari Aktivitas Pendanaan", tipe: "subjudul" },
    ...zip(ak.pendanaan, akl.pendanaan),
    { label: "Kas Bersih dari Aktivitas Pendanaan", tipe: "subtotal", nilai: ak.totalPendanaan, lalu: akl.totalPendanaan },
    { label: "KENAIKAN (PENURUNAN) KAS BERSIH", tipe: "total", nilai: ak.kenaikanKas, lalu: akl.kenaikanKas },
    { label: "Kas dan setara kas awal tahun", tipe: "baris", nilai: ak.kasAwal, lalu: akl.kasAwal },
    { label: "KAS DAN SETARA KAS AKHIR TAHUN", tipe: "total", nilai: ak.kasAkhir, lalu: akl.kasAkhir },
  ];

  const e = lap.ekuitas;
  const ekuitas: Baris[] = [
    { label: "Modal Disetor", tipe: "subjudul" },
    { label: "Saldo awal", tipe: "baris", nilai: e.modalAwal },
    { label: "Setoran modal tahun berjalan", tipe: "baris", nilai: e.setoranModal },
    { label: "Saldo akhir modal disetor", tipe: "subtotal", nilai: e.modalAkhir },
    { label: "Cadangan", tipe: "subjudul" },
    { label: "Saldo akhir cadangan", tipe: "subtotal", nilai: e.cadanganAkhir },
    { label: "Saldo Laba", tipe: "subjudul" },
    { label: "Saldo awal", tipe: "baris", nilai: e.saldoLabaAwal },
    { label: "Laba bersih tahun berjalan", tipe: "baris", nilai: e.labaBersih },
    { label: "Prive / pembagian laba", tipe: "baris", nilai: -e.prive },
    { label: "Saldo akhir saldo laba", tipe: "subtotal", nilai: e.saldoLabaAkhir },
    { label: "JUMLAH EKUITAS AWAL TAHUN", tipe: "total", nilai: e.totalAwal },
    { label: "JUMLAH EKUITAS AKHIR TAHUN", tipe: "total", nilai: e.totalAkhir },
  ];

  return [
    { key: "neraca", judul: "Laporan Posisi Keuangan", kolom: kolomNeraca, baris: neraca },
    { key: "labaRugi", judul: "Laporan Laba Rugi", kolom: kolomPeriode, baris: labaRugi },
    { key: "arusKas", judul: "Laporan Arus Kas", kolom: kolomPeriode, baris: arusKas },
    { key: "ekuitas", judul: "Laporan Perubahan Ekuitas", kolom: kolomPeriode, baris: ekuitas },
  ];
}

// Catatan atas Laporan Keuangan (wajib menurut SAK EMKM)
export function susunCalk(lap: Laporan, namaUsaha: string): { judul: string; isi: string[] }[] {
  const rp = (v: number) => "Rp " + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const n = lap.neraca;
  return [
    {
      judul: "1. Umum",
      isi: [
        `${namaUsaha} (${lap.entitas}) adalah usaha mikro, kecil, dan menengah yang menyusun laporan keuangan untuk periode ${labelPeriode(lap)}.`,
      ],
    },
    {
      judul: "2. Ikhtisar Kebijakan Akuntansi Penting",
      isi: [
        "Pernyataan kepatuhan: laporan keuangan disusun sesuai Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM).",
        "Dasar penyusunan: dasar akrual dengan konsep biaya historis, dalam mata uang Rupiah.",
        "Piutang usaha disajikan sebesar jumlah tagihan dikurangi penyisihan piutang tak tertagih.",
        "Persediaan diukur sebesar biaya perolehan (full costing) dengan metode masuk pertama keluar pertama (MPKP).",
        "Aset tetap dicatat sebesar biaya perolehan dan disusutkan dengan metode garis lurus.",
        "Pendapatan diakui ketika barang diserahkan atau jasa selesai diberikan kepada pelanggan.",
        "Pajak penghasilan menggunakan tarif PPh final 0,5% dari omzet sesuai PP 55 Tahun 2022.",
      ],
    },
    {
      judul: "3. Kas dan Setara Kas",
      isi: [`Saldo kas tunai dan rekening bank pada akhir periode sebesar ${rp(n.kas || 0)}.`],
    },
    {
      judul: "4. Piutang Usaha",
      isi: [
        `Piutang usaha bruto ${rp(n.piutang || 0)} dengan penyisihan piutang tak tertagih ${rp(-(n.penyisihan || 0))}.`,
      ],
    },
    {
      judul: "5. Aset Tetap",
      isi: [
        `Harga perolehan ${rp(n.asetTetap || 0)}, akumulasi penyusutan ${rp(-(n.akumPenyusutan || 0))}, nilai buku ${rp(
          (n.asetTetap || 0) + (n.akumPenyusutan || 0),
        )}.`,
      ],
    },
    {
      judul: "6. Utang Bank",
      isi: [`Saldo pinjaman bank pada akhir periode sebesar ${rp(n.utangBank || 0)}.`],
    },
  ];
}
