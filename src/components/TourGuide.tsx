import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, PartyPopper } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import type { FeatureKey } from "../config/access";
import Lapisan from "../components/Lapisan";

// v2: tur disesuaikan dengan alur induk–cabang, pindah akun, notifikasi, dan laporan baru
const TOUR_KEY = "tour_shown_v2";

type KondisiAkun = { role: "induk" | "cabang"; punyaCabang: boolean };

type Step = {
  id: string;
  title: string;
  body: string | ((k: KondisiAkun) => string);
  selector?: string;
  path?: string;
  feature?: FeatureKey; // langkah hanya muncul bila fitur bisa dipakai akun aktif
  tampil?: (k: KondisiAkun) => boolean;
};

const ALL_STEPS: Step[] = [
  {
    id: "sidebar",
    title: "Navigasi Utama",
    body: "Semua modul ada di sidebar ini. Menu bergembok tetap bisa diklik: akan muncul penjelasan apakah fitur itu khusus akun Induk, akun Cabang, atau paket tertentu.",
    selector: ".sidebar-root",
    path: "/dashboard",
  },
  {
    id: "pilih-akun",
    title: "Akun & Cabang",
    body: (k) =>
      k.role === "cabang"
        ? "Anda sedang di akun cabang. Lewat menu ini Anda bisa kembali ke akun Induk atau pindah ke cabang lain."
        : k.punyaCabang
          ? "Pindah antara akun Induk (kantor pusat) dan akun tiap cabang dari menu ini. Cabang baru juga dibuka dari sini."
          : "Usaha Anda belum punya cabang, jadi semua fitur terbuka di akun ini. Buka cabang pertama dari menu ini kapan saja.",
    selector: "[data-tour='pilih-akun']",
    path: "/dashboard",
  },
  {
    id: "notifikasi",
    title: "Notifikasi",
    body: "Stok menipis, jadwal konsultasi, kuota yang hampir habis, hingga ulasan pelanggan muncul di sini. Klik untuk langsung membuka halamannya.",
    selector: "[data-tour='notifikasi']",
    path: "/dashboard",
  },
  {
    id: "beranda-kpi",
    title: "Ringkasan Performa",
    body: "Pendapatan, laba bersih, aset, dan kas tahun berjalan dibandingkan dengan tahun lalu.",
    selector: "[data-tour='beranda-kpi']",
    path: "/dashboard",
  },
  {
    id: "buka-cabang",
    title: "Siap Membuka Cabang?",
    body: "Saat cabang pertama dibuka, toko ini otomatis menjadi Cabang Utama beserta seluruh datanya, dan akun Induk menjadi kantor pusat.",
    selector: "[data-tour='buka-cabang']",
    path: "/dashboard",
    tampil: (k) => k.role === "induk" && !k.punyaCabang,
  },
  {
    id: "peta-cabang",
    title: "Peta Sebaran Cabang",
    body: "Tinggi pilar menunjukkan porsi pendapatan tiap cabang. Klik pilar atau kartu cabang untuk melihat rinciannya.",
    selector: "[data-tour='peta-cabang']",
    path: "/dashboard",
    tampil: (k) => k.role === "induk" && k.punyaCabang,
  },
  {
    id: "kasir-search",
    title: "Kasir POS",
    body: "Cari produk lalu klik untuk menambahkannya ke keranjang. Penjualan otomatis mengurangi stok dan tercatat sebagai jurnal.",
    selector: "input[placeholder='Cari produk...']",
    path: "/kasir",
    feature: "kasir",
  },
  {
    id: "pencatatan",
    title: "Pencatatan Transaksi",
    body: "Scan struk penjualan atau pembelian, atau input jurnal manual dengan templat transaksi umum. Semuanya langsung masuk ke laporan.",
    selector: "[data-tour='pencatatan']",
    path: "/financial",
    feature: "laporanKeuangan",
  },
  {
    id: "pengaturan-laporan",
    title: "Periode & Ekspor",
    body: (k) =>
      `Pilih rentang tanggal laporan${k.role === "induk" && k.punyaCabang ? " dan entitasnya (konsolidasi atau per cabang)" : ""}, lalu ekspor ke Excel atau PDF.`,
    selector: "[data-tour='pengaturan-laporan']",
    path: "/financial",
    feature: "laporanKeuangan",
  },
  {
    id: "tab-laporan",
    title: "Laporan SAK EMKM",
    body: "Beralih antara Neraca, Laba Rugi, Perubahan Ekuitas, Arus Kas, dan Catatan atas Laporan Keuangan, lengkap dengan pembanding periode lalu.",
    selector: "#tab-laporan",
    path: "/financial",
    feature: "laporanKeuangan",
  },
  {
    id: "grafik",
    title: "Analisis Grafik",
    body: "Delapan grafik untuk membaca tren laba, komposisi beban dan aset, struktur pendanaan, serta arus kas.",
    selector: "[data-tour='grafik']",
    path: "/financial",
    feature: "laporanKeuangan",
  },
  {
    id: "peta-supplier",
    title: "Persediaan & Supplier Terdekat",
    body: "Pantau stok bahan baku dan temukan supplier di sekitar toko. Setelah belanja, scan struk pembelian agar stok bertambah otomatis.",
    selector: "[data-tour='peta-supplier']",
    path: "/internal-management?tab=inventaris",
    feature: "manajemenInternal",
  },
  {
    id: "sdm",
    title: "Sumber Daya Manusia",
    body: "Saring karyawan per unit kerja, klik seseorang untuk mengatur KPI dan gajinya, lalu cairkan gaji per orang.",
    selector: "[data-tour='sdm']",
    path: "/internal-management?tab=penggajian",
    feature: "manajemenInternal",
    tampil: (k) => k.role === "induk",
  },
  {
    id: "audit",
    title: "Audit Berbasis Data",
    body: "Sistem membaca laporan, persediaan, karyawan, dan ulasan untuk menemukan risiko beserta rekomendasinya.",
    selector: "#audit-ringkasan",
    path: "/data-driven",
    feature: "audit",
  },
];

export default function TourGuide() {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // dinaikkan untuk menghitung ulang posisi sorotan (setelah scroll/resize/elemen muncul)
  const [, setTick] = useState(0);
  const navigate = useNavigate();
  const { canUse, role, punyaCabang } = useAccount();
  const kondisi: KondisiAkun = { role, punyaCabang };
  // Langkah tur hanya untuk fitur yang bisa diakses dan relevan bagi akun saat ini
  const STEPS = ALL_STEPS.filter((s) => (!s.feature || canUse(s.feature)) && (!s.tampil || s.tampil(kondisi)));

  useEffect(() => {
    try {
      const shown = localStorage.getItem(TOUR_KEY);
      if (!shown) {
        setVisible(true);
        setShowWelcome(true);
      }
    } catch {
      setVisible(true);
      setShowWelcome(true);
    }
  }, []);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  const next = () => setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStepIndex((s) => Math.max(s - 1, 0));

  const simpanJanganTampil = () => {
    if (!dontShowAgain) return;
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // abaikan
    }
  };

  const closeAll = () => {
    setVisible(false);
    setShowFinished(false);
  };
  const finish = () => {
    simpanJanganTampil();
    setShowFinished(true);
  };
  const skip = () => {
    simpanJanganTampil();
    setVisible(false);
  };

  // pindah halaman, tunggu elemen target muncul (halaman bisa dimuat lazy), lalu gulir ke sana
  useEffect(() => {
    if (!visible || showWelcome || showFinished || !step) return;
    if (step.path) navigate(step.path);
    const sel = step.selector;
    if (!sel) return;
    let coba = 0;
    const id = setInterval(() => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el || ++coba > 20) {
        clearInterval(id);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setTick((t) => t + 1), 450);
      }
    }, 150);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, visible, showWelcome, showFinished]);

  // sorotan mengikuti elemen saat halaman digulir atau ukuran jendela berubah
  useEffect(() => {
    if (!visible || showWelcome || showFinished) return;
    const segarkan = () => setTick((t) => t + 1);
    window.addEventListener("scroll", segarkan, true);
    window.addEventListener("resize", segarkan);
    return () => {
      window.removeEventListener("scroll", segarkan, true);
      window.removeEventListener("resize", segarkan);
    };
  }, [visible, showWelcome, showFinished]);

  if (!visible || !step) return null;

  const pilihanJanganTampil = (
    <label className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={dontShowAgain}
        onChange={(e) => setDontShowAgain(e.target.checked)}
        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
      />
      Jangan tampilkan lagi
    </label>
  );

  if (showWelcome) {
    return (
      <Lapisan className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
        <div className="absolute inset-0 bg-black/40" />
        <div className="bg-white rounded-2xl p-6 shadow-xl z-10 max-w-sm w-full mx-4 relative">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 chip-gradient rounded-2xl flex items-center justify-center">
              <Rocket className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-primary">Selamat Datang di Catalys</h3>
          <p className="text-gray-600 mb-5 text-center text-sm">
            Tur singkat {STEPS.length} langkah untuk mengenal fitur utama
            {role === "cabang" ? " akun cabang Anda" : punyaCabang ? " akun Induk dan cabang Anda" : " usaha Anda"}.
          </p>
          <div className="flex gap-3">
            <button onClick={skip} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Lewati
            </button>
            <button
              onClick={() => {
                simpanJanganTampil();
                setStepIndex(0);
                setShowWelcome(false);
              }}
              className="flex-1 px-4 py-2 rounded-xl btn-gradient font-medium"
            >
              Mulai Tur
            </button>
          </div>
          {pilihanJanganTampil}
        </div>
      </Lapisan>
    );
  }

  if (showFinished) {
    return (
      <Lapisan className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
        <div className="absolute inset-0 bg-black/40" />
        <div className="bg-white rounded-2xl p-6 shadow-xl z-10 max-w-sm w-full mx-4 relative">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 chip-gradient rounded-2xl flex items-center justify-center">
              <PartyPopper className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-primary">Tur Selesai</h3>
          <p className="text-gray-600 mb-6 text-center text-sm">
            {role === "induk" && !punyaCabang
              ? "Mulai catat transaksi pertama Anda, lalu buka cabang ketika usaha siap berkembang."
              : "Selamat mengelola usaha. Pindah akun kapan saja lewat menu di pojok kanan atas."}
          </p>
          <button onClick={closeAll} className="w-full px-4 py-3 rounded-xl btn-gradient font-medium">
            Mulai Gunakan Aplikasi
          </button>
        </div>
      </Lapisan>
    );
  }

  // posisi sorotan elemen target
  let rect: DOMRect | null = null;
  if (step.selector) {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) rect = el.getBoundingClientRect();
  }

  // posisi kartu langkah: di bawah target bila target di setengah atas layar, sebaliknya di atas
  let modalStyle: React.CSSProperties = {
    top: typeof window !== "undefined" ? window.innerHeight - 220 : 0,
    left: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    transform: "translate(-50%, 0)",
  };
  if (rect && typeof window !== "undefined") {
    const modalHeight = 230;
    const atas = rect.top < window.innerHeight / 2;
    let top = atas ? rect.bottom + 24 : rect.top - modalHeight;
    // batasi agar tidak keluar layar (terutama untuk elemen setinggi layar seperti sidebar)
    top = Math.max(top, 24);
    top = Math.min(top, window.innerHeight - modalHeight - 24);
    // jaga kartu tetap di dalam layar, berapa pun lebar layarnya (lebar kartu = min(92%, 520px))
    const setengah = Math.min(window.innerWidth * 0.92, 520) / 2;
    let left = rect.left + rect.width / 2;
    left = Math.max(left, setengah + 8);
    left = Math.min(left, window.innerWidth - setengah - 8);
    modalStyle = { top, left, transform: "translate(-50%, 0)" };
  }

  const isi = typeof step.body === "function" ? step.body(kondisi) : step.body;

  return (
    <Lapisan className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden">
      {!rect && <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />}
      {rect && (
        <div
          className="absolute border-2 border-white rounded-xl pointer-events-none transition-all duration-500 ease-in-out"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(1, 26, 38, 0.55)",
          }}
        />
      )}
      <div className="absolute w-[min(92%,520px)] pointer-events-auto transition-all duration-500 ease-in-out" style={modalStyle}>
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5487ab]">
                Langkah {stepIndex + 1} dari {STEPS.length}
              </p>
              <h4 className="mt-0.5 text-lg font-bold text-primary">{step.title}</h4>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{isi}</p>
            </div>
            <button onClick={skip} className="shrink-0 text-sm text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-md">
              Lewati
            </button>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            {/* titik kemajuan */}
            <div className="hidden sm:flex gap-1.5">
              {STEPS.map((s, i) => (
                <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-[#c6d8e4]"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={prev}
                disabled={stepIndex === 0}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => (stepIndex === STEPS.length - 1 ? finish() : next())}
                className="px-4 py-2 text-sm font-medium rounded-xl btn-gradient"
              >
                {stepIndex === STEPS.length - 1 ? "Selesai" : "Berikutnya"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Lapisan>
  );
}
