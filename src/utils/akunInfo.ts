// Penjelasan dan contoh pencatatan untuk tiap akun di Bagan Akun.
export function getAccountDetails(code: string, name: string, type: string) {
  let description = "Akun ini merepresentasikan transaksi keuangan terkait kategori yang dipilih.";
  let example = "";

  const nameLower = name.toLowerCase();

  if (code.startsWith("1.1.1")) {
    if (nameLower.includes("bank")) {
      description = "Kas di bank mencatat seluruh saldo uang perusahaan yang disimpan di rekening bank. Digunakan untuk mutasi masuk dan keluar melalui transfer bank atau penarikan cek/giro.";
      example = "Pelanggan melunasi piutang sebesar Rp 5.000.000 melalui transfer bank. \nPencatatan:\n(Debit) Kas di Bank Rp 5.000.000\n(Kredit) Piutang Usaha Rp 5.000.000";
    } else if (nameLower.includes("kecil") || nameLower.includes("petty")) {
      description = "Kas kecil (Petty Cash) adalah sejumlah dana yang dibentuk khusus untuk pengeluaran yang sifatnya rutin dan relatif kecil nominalnya.";
      example = "Karyawan membeli perlengkapan tamu seharga Rp 50.000 menggunakan uang kas kecil. \nPencatatan:\n(Debit) Beban Perlengkapan Rp 50.000\n(Kredit) Kas Kecil Rp 50.000";
    } else if (nameLower.includes("deposito")) {
      description = "Deposito jangka pendek mencatat penempatan dana menganggur pada deposito bank dengan tenor di bawah 3 bulan.";
      example = "Perusahaan menempatkan dana Rp 50.000.000 ke deposito 1 bulan. \nPencatatan:\n(Debit) Deposito Jangka Pendek Rp 50.000.000\n(Kredit) Kas di Bank Rp 50.000.000";
    } else {
      description = "Kas tunai mencatat uang kertas dan uang logam yang tersedia di brankas atau kasir perusahaan untuk keperluan transaksi tunai sehari-hari.";
      example = "Pelanggan membayar tunai Rp 150.000 untuk pembelian barang. \nPencatatan:\n(Debit) Kas Tunai Rp 150.000\n(Kredit) Pendapatan Penjualan Rp 150.000";
    }
  } else if (code.startsWith("1.1.2")) {
    if (nameLower.includes("pegawai")) {
      description = "Piutang kepada pegawai mencatat pinjaman atau kasbon yang diberikan perusahaan kepada karyawannya, yang akan dipotong dari gaji atau dikembalikan secara tunai.";
      example = "Karyawan meminjam kasbon Rp 1.000.000. \nPencatatan:\n(Debit) Piutang kepada Pegawai Rp 1.000.000\n(Kredit) Kas Tunai / Bank Rp 1.000.000";
    } else if (nameLower.includes("simpanan")) {
      description = "Piutang simpanan mencatat kewajiban anggota koperasi untuk menyetor simpanan pokok atau wajib yang belum dibayarkan kepada koperasi.";
      example = "Anggota baru mendaftar namun belum melunasi simpanan pokok Rp 100.000. \nPencatatan:\n(Debit) Piutang Simpanan Pokok Rp 100.000\n(Kredit) Simpanan Pokok Rp 100.000";
    } else {
      description = "Piutang usaha mencatat hak atau tagihan perusahaan kepada pelanggan akibat adanya penjualan barang atau jasa secara kredit.";
      example = "Menjual barang secara kredit Rp 10.000.000 ke Toko A. \nPencatatan:\n(Debit) Piutang Usaha Rp 10.000.000\n(Kredit) Pendapatan Penjualan Rp 10.000.000";
    }
  } else if (code.startsWith("1.1.3")) {
    description = "Penyisihan piutang tak tertagih adalah akun kontra-aset (pengurang piutang) yang digunakan untuk mencatat estimasi nilai piutang yang kemungkinan tidak dapat ditagih.";
    example = "Di akhir tahun, diestimasi ada Rp 500.000 piutang yang mungkin gagal bayar. \nPencatatan:\n(Debit) Beban Penyisihan Piutang Rp 500.000\n(Kredit) Penyisihan Piutang Tak Tertagih Rp 500.000";
  } else if (code.startsWith("1.1.4")) {
    if (nameLower.includes("atk") || nameLower.includes("perlengkapan")) {
      description = "Perlengkapan/ATK mencatat nilai persediaan barang-barang habis pakai yang digunakan untuk operasional kantor (seperti kertas, tinta printer, dll).";
      example = "Membeli ATK Rp 2.000.000 secara tunai untuk stok 6 bulan. \nPencatatan:\n(Debit) Persediaan ATK Rp 2.000.000\n(Kredit) Kas Tunai / Bank Rp 2.000.000";
    } else {
      description = "Persediaan barang dagangan mencatat nilai barang yang dibeli perusahaan dengan tujuan untuk dijual kembali tanpa mengubah bentuk aslinya.";
      example = "Membeli barang dagangan dari supplier secara kredit Rp 5.000.000. \nPencatatan:\n(Debit) Persediaan Barang Dagangan Rp 5.000.000\n(Kredit) Utang Usaha Rp 5.000.000";
    }
  } else if (code.startsWith("1.1.5")) {
    if (nameLower.includes("sewa")) {
      description = "Sewa dibayar dimuka mencatat pembayaran sewa yang telah dilakukan di awal untuk jangka waktu tertentu di masa depan.";
      example = "Membayar sewa ruko 1 tahun Rp 12.000.000 secara transfer. \nPencatatan awal:\n(Debit) Sewa Dibayar Dimuka Rp 12.000.000\n(Kredit) Kas di Bank Rp 12.000.000";
    } else if (nameLower.includes("asuransi")) {
      description = "Asuransi dibayar dimuka mencatat premi asuransi yang dibayarkan untuk melindungi aset perusahaan pada periode mendatang.";
      example = "Membayar premi asuransi 1 tahun sebesar Rp 6.000.000. \nPencatatan:\n(Debit) Asuransi Dibayar Dimuka Rp 6.000.000\n(Kredit) Kas di Bank Rp 6.000.000";
    } else if (nameLower.includes("ppn")) {
      description = "PPN Masukan mencatat Pajak Pertambahan Nilai (PPN) yang telah dibayar oleh perusahaan saat membeli Barang Kena Pajak atau Jasa Kena Pajak.";
      example = "Membeli barang Rp 10.000.000 ditambah PPN 11% secara tunai. \nPencatatan:\n(Debit) Persediaan Rp 10.000.000\n(Debit) PPN Masukan Rp 1.100.000\n(Kredit) Kas di Bank Rp 11.100.000";
    } else {
      description = "Pajak dibayar dimuka mencatat pembayaran pajak di muka yang dapat dikreditkan terhadap pajak terutang di akhir tahun.";
      example = "Menyetor angsuran PPh 25 Rp 500.000 ke kas negara. \nPencatatan:\n(Debit) PPh 25 (Pajak Dibayar Dimuka) Rp 500.000\n(Kredit) Kas di Bank Rp 500.000";
    }
  } else if (code.startsWith("1.1.9")) {
    description = "Rekening Koran (RK) antar unit/pusat mencatat mutasi keuangan antar cabang atau antara pusat dengan cabang dalam satu entitas yang sama.";
    example = "Pusat mentransfer operasional Rp 20.000.000 ke cabang toko. \nPencatatan di Pusat:\n(Debit) RK Unit Toko Rp 20.000.000\n(Kredit) Kas di Bank Pusat Rp 20.000.000";
  } else if (code.startsWith("1.3.1")) {
    description = "Tanah mencatat harga perolehan tanah yang dimiliki perusahaan yang digunakan untuk kegiatan operasional dan tidak disusutkan.";
    example = "Membeli tanah seharga Rp 500.000.000 via transfer. \nPencatatan:\n(Debit) Tanah Rp 500.000.000\n(Kredit) Kas di Bank Rp 500.000.000";
  } else if (code.startsWith("1.3.2")) {
    description = "Gedung dan Bangunan mencatat nilai perolehan bangunan yang dimiliki perusahaan untuk tempat usaha. Nilainya akan disusutkan seiring berjalannya waktu.";
    example = "Membangun gudang senilai Rp 1.000.000.000. \nPencatatan:\n(Debit) Gedung dan Bangunan Rp 1.000.000.000\n(Kredit) Kas di Bank / Utang Rp 1.000.000.000";
  } else if (code.startsWith("1.3.3")) {
    description = "Peralatan dan Meubelair mencatat aset tetap berwujud berupa mesin, komputer, meja, kursi, dan perlengkapan besar lainnya yang umur ekonomisnya lebih dari 1 tahun.";
    example = "Membeli 5 unit komputer Rp 40.000.000 secara tunai. \nPencatatan:\n(Debit) Peralatan dan Meubelair Rp 40.000.000\n(Kredit) Kas di Bank Rp 40.000.000";
  } else if (code.startsWith("1.3.4")) {
    description = "Kendaraan mencatat aset tetap berwujud berupa alat transportasi (mobil, motor, truk) yang digunakan untuk menunjang kegiatan operasional.";
    example = "Membeli mobil operasional seharga Rp 150.000.000. \nPencatatan:\n(Debit) Kendaraan Rp 150.000.000\n(Kredit) Kas di Bank / Utang Rp 150.000.000";
  } else if (code.startsWith("1.3.5")) {
    description = "Akumulasi Penyusutan adalah akun kontra-aset yang menampung total beban penyusutan atas aset tetap dari masa ke masa, sehingga mengurangi nilai buku aset tetap tersebut.";
    example = "Menyusutkan kendaraan pada akhir tahun sebesar Rp 30.000.000. \nPencatatan:\n(Debit) Beban Penyusutan Kendaraan Rp 30.000.000\n(Kredit) Akumulasi Penyusutan Kendaraan Rp 30.000.000";
  } else if (code.startsWith("2.1.1")) {
    description = "Utang Simpanan (Pokok/Wajib/Sukarela) mencatat kewajiban koperasi terhadap anggotanya atas dana simpanan yang disetor.";
    example = "Anggota menyetor simpanan sukarela Rp 5.000.000 tunai. \nPencatatan:\n(Debit) Kas Tunai Rp 5.000.000\n(Kredit) Utang Simpanan Sukarela Rp 5.000.000";
  } else if (code.startsWith("2.1.3")) {
    if (nameLower.includes("usaha")) {
      description = "Utang Usaha / Hutang Dagang mencatat kewajiban perusahaan kepada pemasok (supplier) atas pembelian barang atau jasa secara kredit.";
      example = "Membeli persediaan senilai Rp 15.000.000 secara kredit. \nPencatatan:\n(Debit) Persediaan Barang Rp 15.000.000\n(Kredit) Utang Usaha Rp 15.000.000";
    } else {
      description = "Utang Dana Bergulir mencatat kewajiban atas dana program/bantuan yang harus dikembalikan atau digulirkan kepada pihak lain.";
      example = "Koperasi menerima dana bergulir dari pemerintah sebesar Rp 100.000.000. \nPencatatan:\n(Debit) Kas di Bank Rp 100.000.000\n(Kredit) Utang Dana Bergulir Rp 100.000.000";
    }
  } else if (code.startsWith("2.1.4")) {
    if (nameLower.includes("ppn")) {
      description = "PPN Keluaran mencatat Pajak Pertambahan Nilai yang dipungut perusahaan dari pembeli saat melakukan penjualan Barang/Jasa Kena Pajak.";
      example = "Menjual barang tunai Rp 20.000.000 ditambah PPN 11% (Rp 2.200.000). \nPencatatan:\n(Debit) Kas Tunai Rp 22.200.000\n(Kredit) Pendapatan Penjualan Rp 20.000.000\n(Kredit) PPN Keluaran Rp 2.200.000";
    } else {
      description = "Utang Pajak (PPh) mencatat kewajiban pajak penghasilan yang telah dipotong namun belum disetorkan ke kas negara.";
      example = "Memotong PPh 21 dari gaji karyawan sebesar Rp 2.000.000. \nPencatatan:\n(Debit) Beban Gaji Rp 2.000.000\n(Kredit) Utang Pajak PPh 21 Rp 2.000.000";
    }
  } else if (code.startsWith("2.1.5")) {
    description = "Utang Gaji dan Tunjangan mencatat kewajiban perusahaan atas gaji karyawan yang sudah menjadi hak namun belum dibayarkan.";
    example = "Di akhir bulan, diakui beban gaji terutang Rp 50.000.000 yang belum dibayar. \nPencatatan:\n(Debit) Beban Gaji Rp 50.000.000\n(Kredit) Utang Gaji dan Tunjangan Rp 50.000.000";
  } else if (code.startsWith("2.2.")) {
    description = "Utang Jangka Panjang mencatat kewajiban perusahaan kepada pihak ketiga atau bank yang jatuh temponya lebih dari satu tahun.";
    example = "Mendapat pencairan pinjaman modal dari bank Rp 500.000.000. \nPencatatan:\n(Debit) Kas di Bank Rp 500.000.000\n(Kredit) Utang Jangka Panjang (Bank) Rp 500.000.000";
  } else if (code.startsWith("3.")) {
    if (nameLower.includes("sisa hasil usaha") || nameLower.includes("shu")) {
      description = "Ikhtisar Laba Rugi / Sisa Hasil Usaha mencatat laba atau rugi bersih yang dihasilkan dari operasional selama satu periode.";
      example = "Tutup buku dengan laba bersih Rp 100.000.000. Jurnal penutup memindahkan saldo laba: \n(Debit) Ikhtisar Laba Rugi Rp 100.000.000\n(Kredit) SHU Belum Dibagikan Rp 100.000.000";
    } else {
      description = "Ekuitas / Modal mencatat hak residual pemilik (atau anggota koperasi) atas aset perusahaan setelah dikurangi semua kewajiban.";
      example = "Pemilik menyetor dana tunai Rp 50.000.000 sebagai modal usaha. \nPencatatan:\n(Debit) Kas Tunai Rp 50.000.000\n(Kredit) Ekuitas/Modal Rp 50.000.000";
    }
  } else if (code.startsWith("4.")) {
    if (nameLower.includes("jasa")) {
      description = "Pendapatan Jasa mencatat pemasukan yang diperoleh perusahaan dari penyediaan jasa atau layanan kepada pelanggan.";
      example = "Menerima bayaran atas jasa layanan kesehatan klinik Rp 300.000 secara tunai. \nPencatatan:\n(Debit) Kas Tunai Rp 300.000\n(Kredit) Pendapatan Jasa Rp 300.000";
    } else {
      description = "Pendapatan Penjualan mencatat omset atau pemasukan kotor dari hasil penjualan barang dagangan atau produk jadi kepada pelanggan.";
      example = "Menjual 100 produk pakaian dengan total Rp 15.000.000 secara tunai. \nPencatatan:\n(Debit) Kas Tunai Rp 15.000.000\n(Kredit) Pendapatan Penjualan Rp 15.000.000";
    }
  } else if (code.startsWith("5.")) {
    description = "Harga Pokok Penjualan (HPP) mencatat total biaya langsung yang dikeluarkan untuk memperoleh atau memproduksi barang yang telah terjual pada periode berjalan.";
    example = "Barang yang terjual di atas memiliki modal awal (harga beli) Rp 10.000.000. \nPencatatan HPP:\n(Debit) Harga Pokok Penjualan Rp 10.000.000\n(Kredit) Persediaan Barang Dagangan Rp 10.000.000";
  } else if (code.startsWith("6.")) {
    if (nameLower.includes("gaji") || nameLower.includes("honor") || nameLower.includes("insentif")) {
      description = "Beban Pegawai mencatat seluruh biaya kompensasi (gaji, tunjangan, lembur) yang diberikan kepada karyawan.";
      example = "Membayar gaji pokok karyawan Rp 45.000.000 via transfer bank. \nPencatatan:\n(Debit) Beban Gaji Rp 45.000.000\n(Kredit) Kas di Bank Rp 45.000.000";
    } else if (nameLower.includes("penyusutan") || nameLower.includes("amortisasi")) {
      description = "Beban Penyusutan/Amortisasi mencatat alokasi sistematis atas harga perolehan aset tetap berwujud selama umur manfaat ekonomisnya.";
      example = "Mencatat penyusutan bulanan mobil operasional sebesar Rp 2.500.000. \nPencatatan:\n(Debit) Beban Penyusutan Kendaraan Rp 2.500.000\n(Kredit) Akumulasi Penyusutan Kendaraan Rp 2.500.000";
    } else if (nameLower.includes("sewa")) {
      description = "Beban Sewa mencatat pengakuan biaya atas pemakaian aset sewaan pada periode berjalan.";
      example = "Mengakui pemakaian ruko untuk bulan ini sebesar Rp 1.000.000. \nPencatatan:\n(Debit) Beban Sewa Rp 1.000.000\n(Kredit) Sewa Dibayar Dimuka Rp 1.000.000";
    } else if (nameLower.includes("iklan") || nameLower.includes("promosi")) {
      description = "Beban Pemasaran mencatat biaya-biaya yang dikeluarkan khusus untuk kegiatan marketing guna meningkatkan penjualan.";
      example = "Membayar agensi untuk iklan digital Rp 5.000.000. \nPencatatan:\n(Debit) Beban Iklan Rp 5.000.000\n(Kredit) Kas di Bank Rp 5.000.000";
    } else {
      description = "Beban Operasional/Administrasi mencatat biaya-biaya sehari-hari untuk menjalankan kegiatan usaha (listrik, telepon, dsb).";
      example = "Membayar tagihan listrik PLN sebesar Rp 1.500.000 tunai. \nPencatatan:\n(Debit) Beban Listrik Rp 1.500.000\n(Kredit) Kas Tunai Rp 1.500.000";
    }
  } else if (code.startsWith("9.")) {
    if (code.startsWith("9.1")) {
      description = "Pendapatan Luar Usaha mencatat pemasukan dari kegiatan di luar operasional utama perusahaan, seperti bunga bank atau penjualan aset.";
      example = "Menerima jasa giro/bunga bank bulanan sebesar Rp 150.000. \nPencatatan:\n(Debit) Kas di Bank Rp 150.000\n(Kredit) Pendapatan Bunga Rp 150.000";
    } else {
      description = "Beban Luar Usaha mencatat pengeluaran di luar operasional utama, seperti biaya administrasi bank atau denda pajak.";
      example = "Bank memotong saldo rekening untuk biaya admin bulanan sebesar Rp 25.000. \nPencatatan:\n(Debit) Beban Administrasi Bank Rp 25.000\n(Kredit) Kas di Bank Rp 25.000";
    }
  } else {
    if (type === "asset") {
      description = "Akun Aset mencatat harta atau sumber daya ekonomi yang dikuasai perusahaan.";
      example = "Membeli aset senilai Rp 500.000 secara tunai. \nPencatatan:\n(Debit) Aset Terkait Rp 500.000\n(Kredit) Kas Tunai Rp 500.000";
    } else if (type === "liability") {
      description = "Akun Liabilitas mencatat kewajiban atau utang masa kini perusahaan.";
      example = "Meminjam dana operasional Rp 10.000.000. \nPencatatan:\n(Debit) Kas Tunai/Bank Rp 10.000.000\n(Kredit) Liabilitas (Utang) Rp 10.000.000";
    } else if (type === "equity") {
      description = "Akun Ekuitas mencatat modal pemilik atau sisa hak atas aset setelah dikurangi seluruh liabilitas.";
      example = "Menyetor tambahan modal tunai sebesar Rp 20.000.000. \nPencatatan:\n(Debit) Kas Tunai Rp 20.000.000\n(Kredit) Ekuitas/Modal Rp 20.000.000";
    } else if (type === "revenue") {
      description = "Akun Pendapatan mencatat kenaikan manfaat ekonomi (pemasukan) selama satu periode.";
      example = "Menerima pembayaran atas transaksi sebesar Rp 2.000.000. \nPencatatan:\n(Debit) Kas Tunai/Bank Rp 2.000.000\n(Kredit) Pendapatan Rp 2.000.000";
    } else if (type === "expense") {
      description = "Akun Beban mencatat penurunan manfaat ekonomi (pengeluaran) untuk kegiatan operasional.";
      example = "Membayar pengeluaran operasional sebesar Rp 300.000. \nPencatatan:\n(Debit) Beban Terkait Rp 300.000\n(Kredit) Kas Tunai/Bank Rp 300.000";
    }
  }

  return { description, example };
}
