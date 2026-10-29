import React, { createContext, useContext, useEffect, useState } from "react";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "distribution";

export type StatementTarget = {
  kind: "bs" | "is" | "equity";
  field: string;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  target: StatementTarget;
  description?: string; // explanation of what transactions are included
};

const STORAGE_KEY = "chartOfAccounts_v1";

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "1_1_1_01_kas_tunai",
    code: "1.1.1.01",
    name: "Kas Tunai",
    type: "asset",
    target: { kind: "bs", field: "kas_tunai" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_02_kas_di_bank_bri",
    code: "1.1.1.02",
    name: "Kas di Bank BRI",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_bri" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_03_kas_di_bank_mandiri",
    code: "1.1.1.03",
    name: "Kas di Bank Mandiri",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_mandiri" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_04_kas_di_bank_bni",
    code: "1.1.1.04",
    name: "Kas di Bank BNI",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_bni" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_05_kas_di_bank_btn",
    code: "1.1.1.05",
    name: "Kas di Bank BTN",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_btn" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_06_kas_di_bank_bpd",
    code: "1.1.1.06",
    name: "Kas di Bank BPD",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_bpd" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_07_kas_di_bank_bsi",
    code: "1.1.1.07",
    name: "Kas di Bank BSI",
    type: "asset",
    target: { kind: "bs", field: "kas_di_bank_bsi" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_10_kas_kecil_petty_cash",
    code: "1.1.1.10",
    name: "Kas Kecil (Petty Cash)",
    type: "asset",
    target: { kind: "bs", field: "kas_kecil_petty_cash" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_11_deposito_3_bulan",
    code: "1.1.1.11",
    name: "Deposito (< 3 bulan)",
    type: "asset",
    target: { kind: "bs", field: "deposito_3_bulan" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_01_piutang_usaha",
    code: "1.1.2.01",
    name: "Piutang Usaha",
    type: "asset",
    target: { kind: "bs", field: "piutang_usaha" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_02_piutang_kepada_pegawai",
    code: "1.1.2.02",
    name: "Piutang kepada Pegawai",
    type: "asset",
    target: { kind: "bs", field: "piutang_kepada_pegawai" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_03_piutang_simpanan_pokok_anggota",
    code: "1.1.2.03",
    name: "Piutang Simpanan Pokok Anggota",
    type: "asset",
    target: { kind: "bs", field: "piutang_simpanan_pokok_anggota" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_04_piutang_simpanan_wajib_anggota",
    code: "1.1.2.04",
    name: "Piutang Simpanan Wajib Anggota",
    type: "asset",
    target: { kind: "bs", field: "piutang_simpanan_wajib_anggota" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_05_piutang_anggota",
    code: "1.1.2.05",
    name: "Piutang Anggota",
    type: "asset",
    target: { kind: "bs", field: "piutang_anggota" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_3_01_penyisihan_piutang_usaha_tak_tertagih",
    code: "1.1.3.01",
    name: "Penyisihan Piutang Usaha Tak Tertagih",
    type: "asset",
    target: { kind: "bs", field: "penyisihan_piutang_usaha_tak_tertagih" },
    description: "Normal: Kredit",
  },
  {
    id: "1_1_3_02_penyisihan_piutang_kepada_pegawai_tak_tertagih",
    code: "1.1.3.02",
    name: "Penyisihan Piutang kepada Pegawai Tak Tertagih",
    type: "asset",
    target: {
      kind: "bs",
      field: "penyisihan_piutang_kepada_pegawai_tak_tertagih",
    },
    description: "Normal: Kredit",
  },
  {
    id: "1_1_3_03_penyisihan_piutang_simpanan_pokok_anggota_tak_tertagih",
    code: "1.1.3.03",
    name: "Penyisihan Piutang Simpanan Pokok Anggota Tak Tertagih",
    type: "asset",
    target: {
      kind: "bs",
      field: "penyisihan_piutang_simpanan_pokok_anggota_tak_tertagih",
    },
    description: "Normal: Kredit",
  },
  {
    id: "1_1_3_04_penyisihan_piutang_simpanan_wajib_anggota_tak_tertagih",
    code: "1.1.3.04",
    name: "Penyisihan Piutang Simpanan Wajib Anggota Tak Tertagih",
    type: "asset",
    target: {
      kind: "bs",
      field: "penyisihan_piutang_simpanan_wajib_anggota_tak_tertagih",
    },
    description: "Normal: Kredit",
  },
  {
    id: "1_1_4_01_persediaan_barang_dagangan",
    code: "1.1.4.01",
    name: "Persediaan Barang Dagangan",
    type: "asset",
    target: { kind: "bs", field: "persediaan_barang_dagangan" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_4_02_persediaan_atk",
    code: "1.1.4.02",
    name: "Persediaan ATK",
    type: "asset",
    target: { kind: "bs", field: "persediaan_atk" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_4_03_perlengkapan",
    code: "1.1.4.03",
    name: "Perlengkapan",
    type: "asset",
    target: { kind: "bs", field: "perlengkapan" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_01_sewa_dibayar_dimuka",
    code: "1.1.5.01",
    name: "Sewa Dibayar Dimuka",
    type: "asset",
    target: { kind: "bs", field: "sewa_dibayar_dimuka" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_02_asuransi_dibayar_dimuka",
    code: "1.1.5.02",
    name: "Asuransi Dibayar Dimuka",
    type: "asset",
    target: { kind: "bs", field: "asuransi_dibayar_dimuka" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_03_pph_25",
    code: "1.1.5.03",
    name: "PPh 25",
    type: "asset",
    target: { kind: "bs", field: "pph_25" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_04_ppn_masukan",
    code: "1.1.5.04",
    name: "PPN Masukan",
    type: "asset",
    target: { kind: "bs", field: "ppn_masukan" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_8_99_aset_lancar_lainnya",
    code: "1.1.8.99",
    name: "Aset Lancar Lainnya",
    type: "asset",
    target: { kind: "bs", field: "aset_lancar_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_01_rk_pusat",
    code: "1.1.9.01",
    name: "RK Pusat",
    type: "asset",
    target: { kind: "bs", field: "rk_pusat" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_02_rk_unit_toko",
    code: "1.1.9.02",
    name: "RK Unit Toko",
    type: "asset",
    target: { kind: "bs", field: "rk_unit_toko" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_03_rk_pusat_unit_apotek",
    code: "1.1.9.03",
    name: "RK Pusat Unit Apotek",
    type: "asset",
    target: { kind: "bs", field: "rk_pusat_unit_apotek" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_04_rk_unit_simpan_pinjam",
    code: "1.1.9.04",
    name: "RK Unit Simpan Pinjam",
    type: "asset",
    target: { kind: "bs", field: "rk_unit_simpan_pinjam" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_05_rk_unit_klinik",
    code: "1.1.9.05",
    name: "RK Unit Klinik",
    type: "asset",
    target: { kind: "bs", field: "rk_unit_klinik" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_06_rk_unit_gudang",
    code: "1.1.9.06",
    name: "RK Unit Gudang",
    type: "asset",
    target: { kind: "bs", field: "rk_unit_gudang" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_07_rk_unit_logistik",
    code: "1.1.9.07",
    name: "RK Unit Logistik",
    type: "asset",
    target: { kind: "bs", field: "rk_unit_logistik" },
    description: "Normal: Debit",
  },
  {
    id: "1_2_1_01_investasi_dalam_deposito",
    code: "1.2.1.01",
    name: "Investasi dalam Deposito",
    type: "asset",
    target: { kind: "bs", field: "investasi_dalam_deposito" },
    description: "Normal: Debit",
  },
  {
    id: "1_2_1_99_investasi_lainnya",
    code: "1.2.1.99",
    name: "Investasi Lainnya",
    type: "asset",
    target: { kind: "bs", field: "investasi_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_1_01_tanah",
    code: "1.3.1.01",
    name: "Tanah",
    type: "asset",
    target: { kind: "bs", field: "tanah" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_2_01_gedung_dan_bangunan",
    code: "1.3.2.01",
    name: "Gedung dan Bangunan",
    type: "asset",
    target: { kind: "bs", field: "gedung_dan_bangunan" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_3_01_peralatan_dan_meubelair",
    code: "1.3.3.01",
    name: "Peralatan dan Meubelair",
    type: "asset",
    target: { kind: "bs", field: "peralatan_dan_meubelair" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_4_01_kendaraan",
    code: "1.3.4.01",
    name: "Kendaraan",
    type: "asset",
    target: { kind: "bs", field: "kendaraan" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_01_akumulasi_penyusutan_gedung_dan_bangunan",
    code: "1.3.5.01",
    name: "Akumulasi Penyusutan Gedung dan Bangunan",
    type: "asset",
    target: { kind: "bs", field: "akumulasi_penyusutan_gedung_dan_bangunan" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_02_akumulasi_penyusutan_peralatan_dan_meubelair",
    code: "1.3.5.02",
    name: "Akumulasi Penyusutan Peralatan dan Meubelair",
    type: "asset",
    target: {
      kind: "bs",
      field: "akumulasi_penyusutan_peralatan_dan_meubelair",
    },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_03_akumulasi_penyusutan_kendaraan",
    code: "1.3.5.03",
    name: "Akumulasi Penyusutan Kendaraan",
    type: "asset",
    target: { kind: "bs", field: "akumulasi_penyusutan_kendaraan" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_9_99_aset_tetap_lainnya",
    code: "1.3.9.99",
    name: "Aset Tetap Lainnya",
    type: "asset",
    target: { kind: "bs", field: "aset_tetap_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "1_4_1_01_software",
    code: "1.4.1.01",
    name: "Software",
    type: "asset",
    target: { kind: "bs", field: "software" },
    description: "Normal: Debit",
  },
  {
    id: "1_4_2_01_amortisasi_aset_tidak_berwujud",
    code: "1.4.2.01",
    name: "Amortisasi Aset Tidak Berwujud",
    type: "asset",
    target: { kind: "bs", field: "amortisasi_aset_tidak_berwujud" },
    description: "Normal: Debit",
  },
  {
    id: "1_5_1_01_investasi_jangka_panjang",
    code: "1.5.1.01",
    name: "Investasi Jangka Panjang",
    type: "asset",
    target: { kind: "bs", field: "investasi_jangka_panjang" },
    description: "Normal: Debit",
  },
  {
    id: "1_9_1_99_aset_lain_lain",
    code: "1.9.1.99",
    name: "Aset Lain-lain lainnya",
    type: "asset",
    target: { kind: "bs", field: "aset_lain_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "2_1_1_01_utang_simpanan_pokok",
    code: "2.1.1.01",
    name: "Utang Simpanan Pokok",
    type: "liability",
    target: { kind: "bs", field: "utang_simpanan_pokok" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_1_02_utang_simpanan_wajib",
    code: "2.1.1.02",
    name: "Utang Simpanan Wajib",
    type: "liability",
    target: { kind: "bs", field: "utang_simpanan_wajib" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_1_03_utang_simpanan_sukarela",
    code: "2.1.1.03",
    name: "Utang Simpanan Sukarela",
    type: "liability",
    target: { kind: "bs", field: "utang_simpanan_sukarela" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_2_01_utang_shu",
    code: "2.1.2.01",
    name: "Utang SHU",
    type: "liability",
    target: { kind: "bs", field: "utang_shu" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_3_01_utang_usaha",
    code: "2.1.3.01",
    name: "Utang Usaha",
    type: "liability",
    target: { kind: "bs", field: "utang_usaha" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_3_02_utang_dana_bergulir",
    code: "2.1.3.02",
    name: "Utang Dana Bergulir",
    type: "liability",
    target: { kind: "bs", field: "utang_dana_bergulir" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_4_01_ppn_keluaran",
    code: "2.1.4.01",
    name: "PPN Keluaran",
    type: "liability",
    target: { kind: "bs", field: "ppn_keluaran" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_4_02_pph_21",
    code: "2.1.4.02",
    name: "PPh 21",
    type: "liability",
    target: { kind: "bs", field: "pph_21" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_4_03_pph_23",
    code: "2.1.4.03",
    name: "PPh 23",
    type: "liability",
    target: { kind: "bs", field: "pph_23" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_4_04_pph_29",
    code: "2.1.4.04",
    name: "PPh 29",
    type: "liability",
    target: { kind: "bs", field: "pph_29" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_5_01_utang_gaji_dan_tunjangan",
    code: "2.1.5.01",
    name: "Utang Gaji dan Tunjangan",
    type: "liability",
    target: { kind: "bs", field: "utang_gaji_dan_tunjangan" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_6_01_utang_listrik",
    code: "2.1.6.01",
    name: "Utang Listrik",
    type: "liability",
    target: { kind: "bs", field: "utang_listrik" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_6_02_utang_telepon",
    code: "2.1.6.02",
    name: "Utang Telepon",
    type: "liability",
    target: { kind: "bs", field: "utang_telepon" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_6_99_utang_utilitas_lainnya",
    code: "2.1.6.99",
    name: "Utang Utilitas Lainnya",
    type: "liability",
    target: { kind: "bs", field: "utang_utilitas_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_7_01_pendapatan_sewa_diterima_dimuka",
    code: "2.1.7.01",
    name: "Pendapatan Sewa Diterima Dimuka",
    type: "liability",
    target: { kind: "bs", field: "pendapatan_sewa_diterima_dimuka" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_8_01_utang_kepada_pihak_ketiga_pendek",
    code: "2.1.8.01",
    name: "Utang kepada Pihak Ketiga Jk. Pendek",
    type: "liability",
    target: { kind: "bs", field: "utang_kepada_pihak_ketiga_pendek" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_8_99_utang_kepada_pihak_ketiga_pendek_lainnya",
    code: "2.1.8.99",
    name: "Utang kepada Pihak Ketiga Jk. Pendek Lainnya",
    type: "liability",
    target: { kind: "bs", field: "utang_kepada_pihak_ketiga_pendek_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "2_1_9_99_utang_jangka_pendek_lainnya",
    code: "2.1.9.99",
    name: "Utang Jangka Pendek Lainnya",
    type: "liability",
    target: { kind: "bs", field: "utang_jangka_pendek_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "2_2_1_01_utang_kepada_pihak_ketiga_panjang",
    code: "2.2.1.01",
    name: "Utang kepada Pihak Ketiga Jk. Panjang",
    type: "liability",
    target: { kind: "bs", field: "utang_kepada_pihak_ketiga_panjang" },
    description: "Normal: Kredit",
  },
  {
    id: "2_2_2_01_utang_ke_bank",
    code: "2.2.2.01",
    name: "Utang Ke Bank",
    type: "liability",
    target: { kind: "bs", field: "utang_ke_bank" },
    description: "Normal: Kredit",
  },
  {
    id: "2_2_9_99_utang_jangka_panjang_lainnya",
    code: "2.2.9.99",
    name: "Utang Jangka Panjang Lainnya",
    type: "liability",
    target: { kind: "bs", field: "utang_jangka_panjang_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "3_1_1_01_simpanan_pokok",
    code: "3.1.1.01",
    name: "Simpanan Pokok",
    type: "equity",
    target: { kind: "equity", field: "simpanan_pokok" },
    description: "Normal: Kredit",
  },
  {
    id: "3_1_2_01_simpanan_wajib",
    code: "3.1.2.01",
    name: "Simpanan Wajib",
    type: "equity",
    target: { kind: "equity", field: "simpanan_wajib" },
    description: "Normal: Kredit",
  },
  {
    id: "3_1_3_01_simpanan_sukarela",
    code: "3.1.3.01",
    name: "Simpanan Sukarela",
    type: "equity",
    target: { kind: "equity", field: "simpanan_sukarela" },
    description: "Normal: Kredit",
  },
  {
    id: "3_2_1_01_hibah",
    code: "3.2.1.01",
    name: "Hibah",
    type: "equity",
    target: { kind: "equity", field: "hibah" },
    description: "Normal: Kredit",
  },
  {
    id: "3_3_1_01_cadangan",
    code: "3.3.1.01",
    name: "Cadangan",
    type: "equity",
    target: { kind: "equity", field: "cadangan" },
    description: "Normal: Kredit",
  },
  {
    id: "3_4_1_01_sisa_hasil_usaha_belum_dibagikan",
    code: "3.4.1.01",
    name: "Sisa Hasil Usaha Belum Dibagikan",
    type: "equity",
    target: { kind: "equity", field: "sisa_hasil_usaha_belum_dibagikan" },
    description: "Normal: Kredit",
  },
  {
    id: "3_9_1_01_ikhtisar_sisa_hasil_usaha",
    code: "3.9.1.01",
    name: "Ikhtisar Sisa Hasil Usaha",
    type: "equity",
    target: { kind: "equity", field: "ikhtisar_sisa_hasil_usaha" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_1_01_pendapatan_penjualan_barang_dagangan_anggota",
    code: "4.1.1.01",
    name: "Pendapatan Penjualan Barang Dagangan (Anggota)",
    type: "revenue",
    target: {
      kind: "is",
      field: "pendapatan_penjualan_barang_dagangan_anggota",
    },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_1_02_pendapatan_komisi_konsinyasi",
    code: "4.1.1.02",
    name: "Pendapatan Komisi Konsinyasi",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_komisi_konsinyasi" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_2_01_pendapatan_penjualan_barang_jadi_anggota",
    code: "4.1.2.01",
    name: "Pendapatan Penjualan Barang Jadi Anggota",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_penjualan_barang_jadi_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_3_01_pendapatan_jasa_dokter_anggota",
    code: "4.1.3.01",
    name: "Pendapatan Jasa Dokter (Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_dokter_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_3_02_pendapatan_jasa_pinjaman_anggota",
    code: "4.1.3.02",
    name: "Pendapatan Jasa Pinjaman (Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_pinjaman_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_3_03_pendapatan_jasa_sewa_anggota",
    code: "4.1.3.03",
    name: "Pendapatan Jasa Sewa (Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_sewa_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_3_04_pendapatan_jasa_pengiriman_anggota",
    code: "4.1.3.04",
    name: "Pendapatan Jasa Pengiriman (Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_pengiriman_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_1_9_01_pendapatan_pelayanan_anggota_lainnya",
    code: "4.1.9.01",
    name: "Pendapatan Pelayanan Anggota Lainnya",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_pelayanan_anggota_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_1_01_pendapatan_penjualan_barang_dagangan_non_anggota",
    code: "4.2.1.01",
    name: "Pendapatan Penjualan Barang Dagangan (Non-Anggota)",
    type: "revenue",
    target: {
      kind: "is",
      field: "pendapatan_penjualan_barang_dagangan_non_anggota",
    },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_2_01_pendapatan_penjualan_barang_jadi_non_anggota",
    code: "4.2.2.01",
    name: "Pendapatan Penjualan Barang Jadi (Non-Anggota)",
    type: "revenue",
    target: {
      kind: "is",
      field: "pendapatan_penjualan_barang_jadi_non_anggota",
    },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_3_01_pendapatan_jasa_dokter_non_anggota",
    code: "4.2.3.01",
    name: "Pendapatan Jasa Dokter (Non-Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_dokter_non_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_3_02_pendapatan_jasa_pinjaman_non_anggota",
    code: "4.2.3.02",
    name: "Pendapatan Jasa Pinjaman (Non-Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_pinjaman_non_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_3_03_pendapatan_jasa_sewa_non_anggota",
    code: "4.2.3.03",
    name: "Pendapatan Jasa Sewa (Non-Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_sewa_non_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_3_04_pendapatan_jasa_pengiriman_non_anggota",
    code: "4.2.3.04",
    name: "Pendapatan Jasa Pengiriman (Non-Anggota)",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_jasa_pengiriman_non_anggota" },
    description: "Normal: Kredit",
  },
  {
    id: "4_2_9_01_pendapatan_pelayanan_non_anggota_lainnya",
    code: "4.2.9.01",
    name: "Pendapatan Pelayanan Non-Anggota Lainnya",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_pelayanan_non_anggota_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "5_1_1_01_harga_pokok_penjualan_barang_dagangan",
    code: "5.1.1.01",
    name: "Harga Pokok Penjualan Barang Dagangan",
    type: "expense",
    target: { kind: "is", field: "harga_pokok_penjualan_barang_dagangan" },
    description: "Normal: Debit",
  },
  {
    id: "5_1_1_02_harga_pokok_penjualan_barang_jadi",
    code: "5.1.1.02",
    name: "Harga Pokok Penjualan Barang Jadi",
    type: "expense",
    target: { kind: "is", field: "harga_pokok_penjualan_barang_jadi" },
    description: "Normal: Debit",
  },
  {
    id: "5_2_1_01_harga_pokok_produksi",
    code: "5.2.1.01",
    name: "Harga Pokok Produksi",
    type: "expense",
    target: { kind: "is", field: "harga_pokok_produksi" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_01_beban_gaji_dan_tunjangan_pegawai",
    code: "6.1.1.01",
    name: "Beban Gaji dan Tunjangan Pegawai",
    type: "expense",
    target: { kind: "is", field: "beban_gaji_dan_tunjangan_pegawai" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_02_beban_gaji_dan_tunjangan_pengawas",
    code: "6.1.1.02",
    name: "Beban Gaji dan Tunjangan Pengawas",
    type: "expense",
    target: { kind: "is", field: "beban_gaji_dan_tunjangan_pengawas" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_03_beban_honor_lembur",
    code: "6.1.1.03",
    name: "Beban Honor Lembur",
    type: "expense",
    target: { kind: "is", field: "beban_honor_lembur" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_04_beban_insentif_bonus",
    code: "6.1.1.04",
    name: "Beban Insentif (Bonus)",
    type: "expense",
    target: { kind: "is", field: "beban_insentif_bonus" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_05_beban_komisi",
    code: "6.1.1.05",
    name: "Beban Komisi",
    type: "expense",
    target: { kind: "is", field: "beban_komisi" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_06_beban_seragam_pegawai",
    code: "6.1.1.06",
    name: "Beban Seragam Pegawai",
    type: "expense",
    target: { kind: "is", field: "beban_seragam_pegawai" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_07_beban_penguatan_sdm",
    code: "6.1.1.07",
    name: "Beban Penguatan SDM",
    type: "expense",
    target: { kind: "is", field: "beban_penguatan_sdm" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_99_beban_pegawai_lainnya",
    code: "6.1.1.99",
    name: "Beban Pegawai Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_pegawai_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_01_beban_atk",
    code: "6.1.2.01",
    name: "Beban ATK",
    type: "expense",
    target: { kind: "is", field: "beban_atk" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_02_beban_foto_copy",
    code: "6.1.2.02",
    name: "Beban Foto Copy",
    type: "expense",
    target: { kind: "is", field: "beban_foto_copy" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_03_beban_konsumsi_rapat",
    code: "6.1.2.03",
    name: "Beban Konsumsi Rapat",
    type: "expense",
    target: { kind: "is", field: "beban_konsumsi_rapat" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_04_beban_cetak_dan_dekorasi",
    code: "6.1.2.04",
    name: "Beban Cetak dan Dekorasi",
    type: "expense",
    target: { kind: "is", field: "beban_cetak_dan_dekorasi" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_99_beban_perlengkapan_lainnya",
    code: "6.1.2.99",
    name: "Beban Perlengkapan Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_perlengkapan_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_3_01_beban_pemeliharaan_dan_perbaikan",
    code: "6.1.3.01",
    name: "Beban Pemeliharaan dan Perbaikan",
    type: "expense",
    target: { kind: "is", field: "beban_pemeliharaan_dan_perbaikan" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_01_beban_listrik",
    code: "6.1.4.01",
    name: "Beban Listrik",
    type: "expense",
    target: { kind: "is", field: "beban_listrik" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_02_beban_telepon_dan_internet",
    code: "6.1.4.02",
    name: "Beban Telepon dan Internet",
    type: "expense",
    target: { kind: "is", field: "beban_telepon_dan_internet" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_99_beban_utilitas_lainnya",
    code: "6.1.4.99",
    name: "Beban Utilitas Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_utilitas_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_5_01_beban_sewa",
    code: "6.1.5.01",
    name: "Beban Sewa",
    type: "expense",
    target: { kind: "is", field: "beban_sewa" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_5_02_beban_asuransi",
    code: "6.1.5.02",
    name: "Beban Asuransi",
    type: "expense",
    target: { kind: "is", field: "beban_asuransi" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_6_01_beban_keamanan",
    code: "6.1.6.01",
    name: "Beban Keamanan",
    type: "expense",
    target: { kind: "is", field: "beban_keamanan" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_6_02_beban_kebersihan",
    code: "6.1.6.02",
    name: "Beban Kebersihan",
    type: "expense",
    target: { kind: "is", field: "beban_kebersihan" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_7_01_beban_penyisihan_piutang_tak_tertagih",
    code: "6.1.7.01",
    name: "Beban Penyisihan Piutang Tak Tertagih",
    type: "expense",
    target: { kind: "is", field: "beban_penyisihan_piutang_tak_tertagih" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_02_beban_penyusutan_gedung_dan_bangunan",
    code: "6.1.8.02",
    name: "Beban Penyusutan Gedung dan Bangunan",
    type: "expense",
    target: { kind: "is", field: "beban_penyusutan_gedung_dan_bangunan" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_03_beban_penyusutan_peralatan_dan_meubelair",
    code: "6.1.8.03",
    name: "Beban Penyusutan Peralatan dan Meubelair",
    type: "expense",
    target: { kind: "is", field: "beban_penyusutan_peralatan_dan_meubelair" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_04_beban_penyusutan_kendaraan",
    code: "6.1.8.04",
    name: "Beban Penyusutan Kendaraan",
    type: "expense",
    target: { kind: "is", field: "beban_penyusutan_kendaraan" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_05_beban_amortisasi_aset_tak_berwujud",
    code: "6.1.8.05",
    name: "Beban Amortisasi Aset Tak Berwujud",
    type: "expense",
    target: { kind: "is", field: "beban_amortisasi_aset_tak_berwujud" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_01_beban_parkir",
    code: "6.1.9.01",
    name: "Beban Parkir",
    type: "expense",
    target: { kind: "is", field: "beban_parkir" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_02_beban_laundry",
    code: "6.1.9.02",
    name: "Beban Laundry",
    type: "expense",
    target: { kind: "is", field: "beban_laundry" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_03_beban_pendamping",
    code: "6.1.9.03",
    name: "Beban Pendamping",
    type: "expense",
    target: { kind: "is", field: "beban_pendamping" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_04_beban_pengawas",
    code: "6.1.9.04",
    name: "Beban Pengawas",
    type: "expense",
    target: { kind: "is", field: "beban_pengawas" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_05_beban_audit",
    code: "6.1.9.05",
    name: "Beban Audit",
    type: "expense",
    target: { kind: "is", field: "beban_audit" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_06_beban_perjalanan_dinas",
    code: "6.1.9.06",
    name: "Beban Perjalanan Dinas",
    type: "expense",
    target: { kind: "is", field: "beban_perjalanan_dinas" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_07_beban_transportasi",
    code: "6.1.9.07",
    name: "Beban Transportasi",
    type: "expense",
    target: { kind: "is", field: "beban_transportasi" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_08_beban_jamuan_tamu",
    code: "6.1.9.08",
    name: "Beban Jamuan Tamu",
    type: "expense",
    target: { kind: "is", field: "beban_jamuan_tamu" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_99_beban_administrasi_dan_umum_lainnya",
    code: "6.1.9.99",
    name: "Beban Administrasi dan Umum Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_administrasi_dan_umum_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_1_01_beban_gaji_dan_tunjangan_bag_pemasaran",
    code: "6.2.1.01",
    name: "Beban Gaji dan Tunjangan Bag. Pemasaran",
    type: "expense",
    target: { kind: "is", field: "beban_gaji_dan_tunjangan_bag_pemasaran" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_01_beban_iklan",
    code: "6.2.2.01",
    name: "Beban Iklan",
    type: "expense",
    target: { kind: "is", field: "beban_iklan" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_02_beban_promosi",
    code: "6.2.2.02",
    name: "Beban Promosi",
    type: "expense",
    target: { kind: "is", field: "beban_promosi" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_03_beban_dana_sosial",
    code: "6.2.2.03",
    name: "Beban Dana Sosial",
    type: "expense",
    target: { kind: "is", field: "beban_dana_sosial" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_3_99_beban_pemasaran_lainnya",
    code: "6.2.3.99",
    name: "Beban Pemasaran Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_pemasaran_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "9_1_1_01_pendapatan_bunga",
    code: "9.1.1.01",
    name: "Pendapatan Bunga",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_bunga" },
    description: "Normal: Kredit",
  },
  {
    id: "9_1_2_01_pendapatan_sewa",
    code: "9.1.2.01",
    name: "Pendapatan Sewa",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_sewa" },
    description: "Normal: Kredit",
  },
  {
    id: "9_1_3_01_pendapatan_denda",
    code: "9.1.3.01",
    name: "Pendapatan Denda",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_denda" },
    description: "Normal: Kredit",
  },
  {
    id: "9_1_4_01_pendapatan_iklan",
    code: "9.1.4.01",
    name: "Pendapatan Iklan",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_iklan" },
    description: "Normal: Kredit",
  },
  {
    id: "9_1_9_99_pendapatan_lain_lain",
    code: "9.1.9.99",
    name: "Pendapatan Lain-lain lainnya",
    type: "revenue",
    target: { kind: "is", field: "pendapatan_lain_lainnya" },
    description: "Normal: Kredit",
  },
  {
    id: "9_2_1_01_beban_administrasi_bank",
    code: "9.2.1.01",
    name: "Beban Administrasi Bank",
    type: "expense",
    target: { kind: "is", field: "beban_administrasi_bank" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_2_01_beban_bunga",
    code: "9.2.2.01",
    name: "Beban Bunga",
    type: "expense",
    target: { kind: "is", field: "beban_bunga" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_3_01_beban_sewa",
    code: "9.2.3.01",
    name: "Beban Sewa",
    type: "expense",
    target: { kind: "is", field: "beban_sewa_9_2_3_01" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_9_99_beban_lain_lain",
    code: "9.2.9.99",
    name: "Beban Lain-lain lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_lain_lainnya" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_01_beban_pajak_bunga_bank",
    code: "9.3.1.01",
    name: "Beban Pajak Bunga Bank",
    type: "expense",
    target: { kind: "is", field: "beban_pajak_bunga_bank" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_02_beban_pajak_reklame",
    code: "9.3.1.02",
    name: "Beban Pajak Reklame",
    type: "expense",
    target: { kind: "is", field: "beban_pajak_reklame" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_03_beban_pph_21",
    code: "9.3.1.03",
    name: "Beban PPh 21",
    type: "expense",
    target: { kind: "is", field: "beban_pph_21" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_04_beban_pph_23",
    code: "9.3.1.04",
    name: "Beban PPh 23",
    type: "expense",
    target: { kind: "is", field: "beban_pph_23" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_05_beban_pph_25",
    code: "9.3.1.05",
    name: "Beban PPh 25",
    type: "expense",
    target: { kind: "is", field: "beban_pph_25" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_06_beban_pph_29",
    code: "9.3.1.06",
    name: "Beban PPh 29",
    type: "expense",
    target: { kind: "is", field: "beban_pph_29" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_07_beban_pph_final",
    code: "9.3.1.07",
    name: "Beban PPh Final",
    type: "expense",
    target: { kind: "is", field: "beban_pph_final" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_08_beban_pph_koperasi",
    code: "9.3.1.08",
    name: "Beban PPh Koperasi",
    type: "expense",
    target: { kind: "is", field: "beban_pph_koperasi" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_99_beban_pajak_lainnya",
    code: "9.3.1.99",
    name: "Beban Pajak Lainnya",
    type: "expense",
    target: { kind: "is", field: "beban_pajak_lainnya" },
    description: "Normal: Debit",
  },
];

// Names of old/legacy placeholder accounts we want to remove from stored data
const LEGACY_ACCOUNT_NAMES = new Set([
  "Cash",
  "Trade Receivables",
  "Inventories",
  "Other Current Assets",
  "Property, Plant & Equipment (net)",
  "Intangible Assets",
  "Trade Payable",
  "Short-term Borrowings",
  "Other Current Liabilities",
  "Long-term Borrowings",
  "Deferred Tax Liabilities",
  "Share Capital",
  "Revenue",
  "Cost of Goods Sold",
  "Operating Expenses",
  "Interest Expense",
  "Tax Expense",
  "Dividends (Declared/Paid)",
]);

type ContextShape = {
  accounts: Account[];
  addAccount: (a: Omit<Account, "id">) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => Account | undefined;
  deleteAccount: (id: string) => void;
  getAccount: (id?: string) => Account | undefined;
};

const ChartContext = createContext<ContextShape | undefined>(undefined);

export function ChartOfAccountsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let stored = JSON.parse(raw) as Account[];
        if (Array.isArray(stored)) {
          // Remove legacy placeholder accounts that came from older default set
          stored = stored.filter((a) => !LEGACY_ACCOUNT_NAMES.has(a.name));

          // Merge defaults: keep existing user/stored accounts, but add any missing default accounts
          const byCode = new Map<string, Account>();
          for (const a of stored) byCode.set(a.code, a);
          const merged = [...stored];
          for (const def of DEFAULT_ACCOUNTS) {
            if (!byCode.has(def.code)) merged.push(def);
          }
          return merged;
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    return DEFAULT_ACCOUNTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      // ignore
    }
  }, [accounts]);

  const addAccount = (a: Omit<Account, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const acc: Account = { ...a, id };
    setAccounts((s) => [...s, acc]);
    return acc;
  };

  const updateAccount = (id: string, patch: Partial<Account>) => {
    let updated: Account | undefined;
    setAccounts((s) =>
      s.map((acc) => {
        if (acc.id !== id) return acc;
        updated = { ...acc, ...patch };
        return updated!;
      }),
    );
    return updated;
  };

  const deleteAccount = (id: string) => {
    setAccounts((s) => s.filter((a) => a.id !== id));
  };

  const getAccount = (id?: string) => accounts.find((a) => a.id === id);

  return (
    <ChartContext.Provider
      value={{ accounts, addAccount, updateAccount, deleteAccount, getAccount }}
    >
      {children}
    </ChartContext.Provider>
  );
}

export function useChartOfAccounts() {
  const ctx = useContext(ChartContext);
  if (!ctx)
    throw new Error(
      "useChartOfAccounts must be used within ChartOfAccountsProvider",
    );
  return ctx;
}
