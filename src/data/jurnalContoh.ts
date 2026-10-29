// Jurnal contoh sejak awal tahun (berjalan − 3) sampai hari ini.
//
// Jurnal ini adalah RINCIAN dari angka model laporan (hitungLaporan), bukan
// tambahan: tiap entri diberi tanda `contoh: true` dan dilewati saat posting
// supaya pendapatan/beban tidak terhitung dua kali. Total pendapatan, HPP, dan
// beban per tahun sama dengan angka di Laporan Laba Rugi.
import type { Account } from "../context/ChartOfAccountsContext";
import type { JournalEntry } from "../context/JournalContext";
import { hitungLaporan, TAHUN_BERJALAN, type Nilai } from "./laporan";

const TANPA: JournalEntry[] = [];

function acak(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Pecah nilai total menjadi n bagian acak yang jumlahnya tetap sama
function pecah(total: number, n: number, seed: number) {
  const bobot = Array.from({ length: n }, (_, i) => 0.6 + acak(seed + i));
  const jml = bobot.reduce((s, x) => s + x, 0);
  const bagian = bobot.map((b) => Math.round(((total * b) / jml) / 1000) * 1000);
  bagian[n - 1] += total - bagian.reduce((s, x) => s + x, 0);
  return bagian;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buatJurnalContoh(entitas: string, accounts: Account[]): JournalEntry[] {
  const id = (code: string) => accounts.find((a) => a.code === code)?.id;
  const A = {
    kas: id("1.1.1.01"),
    bank: id("1.1.1.02") ?? id("1.1.1.01"),
    piutang: id("1.1.2.01"),
    persediaan: id("1.1.4.01"),
    akum: id("1.3.5.02"),
    penyisihan: id("1.1.3.01"),
    penjualan: id("4.2.1.01"),
    jasa: id("4.2.9.01") ?? id("4.2.1.01"),
    hpp: id("5.1.1.01"),
    gaji: id("6.1.1.01"),
    perlengkapan: id("6.1.2.01"),
    pemeliharaan: id("6.1.3.01"),
    listrik: id("6.1.4.01"),
    sewa: id("6.1.5.01"),
    keamanan: id("6.1.6.01"),
    bebanPenyisihan: id("6.1.7.01"),
    penyusutan: id("6.1.8.03"),
    admin: id("6.1.9.99"),
    iklan: id("6.2.2.01"),
    pendapatanLain: id("9.1.1.01"),
    bunga: id("9.2.2.01"),
    pajak: id("9.3.1.07"),
  };
  if (Object.values(A).some((v) => !v)) return TANPA;

  const hasil: JournalEntry[] = [];
  const hariIni = new Date().toISOString().slice(0, 10);
  let n = 0;
  const catat = (date: string, description: string, baris: [string | undefined, "debit" | "credit", number][]) => {
    // transaksi bulan berjalan yang tanggalnya belum lewat dicatat per hari ini
    if (date > hariIni) date = hariIni;
    if (baris.some(([, , v]) => v <= 0)) return;
    const k = n++;
    hasil.push({
      id: `contoh-${entitas}-${k}`,
      date,
      description,
      contoh: true,
      lines: baris.map(([accountId, side, amount], i) => ({ id: `c${k}-${i}`, side, accountId: accountId!, amount })),
    });
  };

  for (let tahun = TAHUN_BERJALAN - 3; tahun <= TAHUN_BERJALAN; tahun++) {
    const lap = hitungLaporan(entitas, tahun, TANPA, accounts);
    const lr: Nilai = lap.lr;
    const bulan = lap.bulanBerjalan;
    const totalPendapatan = (lr.penjualan || 0) + (lr.jasa || 0);
    const porsiJasa = totalPendapatan ? (lr.jasa || 0) / totalPendapatan : 0;
    // beban dibagi rata per bulan, sisa pembulatan masuk ke bulan terakhir
    const perBulan = (v: number, m: number) => {
      const dasar = Math.round(v / bulan / 1000) * 1000;
      return m === bulan - 1 ? v - dasar * (bulan - 1) : dasar;
    };
    // pendapatan & HPP dipecah sesuai pola musiman pada lap.bulanan
    const totalBulanan = lap.bulanan.reduce((s, b) => s + b.pendapatan, 0) || 1;

    for (let m = 0; m < bulan; m++) {
      // bulan berjalan: tanggal 1–28 diskalakan ke 1–hari ini supaya tidak menumpuk di hari ini
      const bulanIni = `${tahun}-${pad(m + 1)}` === hariIni.slice(0, 7);
      const tglHariIni = Number(hariIni.slice(8, 10));
      const tgl = (d: number) => {
        const hari = bulanIni ? Math.max(1, Math.ceil((Math.min(d, 28) * tglHariIni) / 28)) : Math.min(d, 28);
        return `${tahun}-${pad(m + 1)}-${pad(hari)}`;
      };
      const seed = tahun * 100 + m;
      const pendapatanBulan = Math.round((totalPendapatan * (lap.bulanan[m].pendapatan / totalBulanan)) / 1000) * 1000;
      const jasaBulan = Math.round((pendapatanBulan * porsiJasa) / 1000) * 1000;
      const jualBulan = pendapatanBulan - jasaBulan;
      const hppBulan = Math.round(((lr.hpp || 0) * (lap.bulanan[m].pendapatan / totalBulanan)) / 1000) * 1000;

      // penjualan: 6 transaksi per bulan, sebagian kredit (piutang)
      const jual = pecah(jualBulan, 6, seed);
      const pokok = pecah(hppBulan, 6, seed + 50);
      jual.forEach((v, i) => {
        const hari = 2 + i * 5 + Math.floor(acak(seed + i * 3) * 3);
        const kredit = i % 3 === 2;
        catat(tgl(hari), kredit ? "Penjualan kredit ke reseller" : "Penjualan tunai harian", [
          [kredit ? A.piutang : A.kas, "debit", v],
          [A.penjualan, "credit", v],
        ]);
        catat(tgl(hari), "Pencatatan HPP penjualan", [
          [A.hpp, "debit", pokok[i]],
          [A.persediaan, "credit", pokok[i]],
        ]);
      });
      catat(tgl(18), "Pendapatan jasa (pesanan khusus)", [
        [A.bank, "debit", jasaBulan],
        [A.jasa, "credit", jasaBulan],
      ]);
      // pembelian persediaan untuk mengganti yang terjual
      catat(tgl(4), "Pembelian bahan baku dan persediaan", [
        [A.persediaan, "debit", hppBulan],
        [A.bank, "credit", hppBulan],
      ]);

      const beban: [keyof typeof A, number, number, string][] = [
        ["gaji", lr.bebanGaji || 0, 25, "Pembayaran gaji karyawan"],
        ["sewa", lr.bebanSewa || 0, 1, "Pembayaran sewa tempat usaha"],
        ["listrik", lr.bebanUtilitas || 0, 10, "Pembayaran listrik, air, dan internet"],
        ["iklan", lr.bebanPemasaran || 0, 7, "Biaya iklan media sosial"],
        ["admin", lr.bebanAdmin || 0, 15, "Biaya administrasi dan umum"],
        ["perlengkapan", lr.bebanPerlengkapan || 0, 12, "Pembelian perlengkapan dan ATK"],
        ["pemeliharaan", lr.bebanPemeliharaan || 0, 20, "Perbaikan dan pemeliharaan alat"],
        ["keamanan", lr.bebanKeamanan || 0, 5, "Iuran keamanan dan kebersihan"],
      ];
      for (const [akun, total, hari, ket] of beban) {
        catat(tgl(hari), ket, [
          [A[akun], "debit", perBulan(total, m)],
          [A.kas, "credit", perBulan(total, m)],
        ]);
      }
      catat(tgl(28), "Penyusutan aset tetap bulanan", [
        [A.penyusutan, "debit", perBulan(lr.bebanPenyusutan || 0, m)],
        [A.akum, "credit", perBulan(lr.bebanPenyusutan || 0, m)],
      ]);
      catat(tgl(28), "Penyisihan piutang tak tertagih", [
        [A.bebanPenyisihan, "debit", perBulan(lr.bebanPenyisihan || 0, m)],
        [A.penyisihan, "credit", perBulan(lr.bebanPenyisihan || 0, m)],
      ]);
      catat(tgl(26), "Bunga bank diterima", [
        [A.bank, "debit", perBulan(lr.pendapatanLain || 0, m)],
        [A.pendapatanLain, "credit", perBulan(lr.pendapatanLain || 0, m)],
      ]);
      catat(tgl(27), "Pembayaran bunga pinjaman bank", [
        [A.bunga, "debit", perBulan(lr.bebanLain || 0, m)],
        [A.bank, "credit", perBulan(lr.bebanLain || 0, m)],
      ]);
      catat(tgl(15), "Setor PPh final 0,5% atas omzet", [
        [A.pajak, "debit", perBulan(lr.pajak || 0, m)],
        [A.bank, "credit", perBulan(lr.pajak || 0, m)],
      ]);
    }
  }
  return hasil.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
