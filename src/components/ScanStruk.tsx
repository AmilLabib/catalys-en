import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ScanLine,
  Lock,
  Camera,
  ShoppingBag,
  PackagePlus,
  ListChecks,
  FileCheck2,
  Upload,
  Check,
  Circle,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Tag,
} from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { useJournal, type JournalEntry } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { useInventory } from "../context/InventoryContext";
import { useBahanBaku } from "../context/BahanBakuContext";
import QuotaBadge from "./QuotaBadge";
import { formatRp } from "../data/laporan";
import { lockedMessage, pesanKuotaHabis } from "../config/access";
import Lapisan from "../components/Lapisan";
import IlustrasiStruk from "./IlustrasiStruk";

// Satu baris struk. Untuk struk pembelian, baris yang cocok dengan bahan baku
// (bahanId) menambah stok persediaan sebanyak `qty`.
type ItemStruk = { name: string; price: number; discount: number; qty: number; bahanId: string };

// Handle agar komponen lain bisa langsung membuka kamera scan (mis. setelah belanja di supplier)
export type ScanStrukHandle = { buka: (jenis: "penjualan" | "pembelian") => void };

// Sisi terpanjang foto dibatasi agar request ringan dan token gambar Gemini hemat
const MAKS_SISI = 1280;

// Tahapan yang ditampilkan selama analisis; aktifnya ditentukan dari persentase progres
const LANGKAH = ["Mengunggah foto", "AI membaca struk", "Mencocokkan barang"];
const langkahDari = (p: number) => (p < 18 ? 0 : p < 65 ? 1 : 2);

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Tahap = "idle" | "proses" | "berhasil" | "gagal";

const ScanStruk = forwardRef<ScanStrukHandle, { hanyaPembelian?: boolean; className?: string }>(function ScanStruk(
  { hanyaPembelian = false, className = "" },
  ref,
) {
  const { canUse, quotaLimit, quotaRemaining, pakaiKuota, role, plan } = useAccount();
  const { toast } = useToast();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { products } = useInventory();
  const { bahan, tambahStok, cocokkanBahan, getBahan } = useBahanBaku();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [kameraAktif, setKameraAktif] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [errorKamera, setErrorKamera] = useState<string | null>(null);
  const [modalKamera, setModalKamera] = useState(false);
  const [jenis, setJenis] = useState<"penjualan" | "pembelian" | null>(null);
  const [tahap, setTahap] = useState<Tahap>("idle");
  const [progres, setProgres] = useState(0);
  const [pesanGagal, setPesanGagal] = useState("");
  const [jumlahTerbaca, setJumlahTerbaca] = useState(0);
  // naik tiap modal ditutup, agar hasil analisis yang telat tidak membuka konfirmasi
  const sesiRef = useRef(0);
  const kurangGerak = useReducedMotion();
  const [data, setData] = useState<ItemStruk[] | null>(null);
  const [diskonStruk, setDiskonStruk] = useState<number>(0);

  const tersedia = (quotaLimit("scanStruk") ?? 1) > 0 && canUse("laporanKeuangan");
  const sisa = quotaRemaining("scanStruk");

  const matikanKamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setKameraAktif(false);
  };

  useEffect(() => () => matikanKamera(), []);

  // Progres semu: mendekati 92% selama menunggu, baru penuh saat hasil datang
  useEffect(() => {
    if (tahap !== "proses") return;
    const t = setInterval(() => setProgres((p) => p + (92 - p) * 0.05), 120);
    return () => clearInterval(t);
  }, [tahap]);

  const nyalakanKamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setKameraAktif(true);
      setErrorKamera(null);
    } catch (err: any) {
      setErrorKamera(
        err?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan akses kamera di browser, atau lanjutkan dengan struk contoh."
          : "Kamera tidak dapat diakses. Anda tetap bisa memakai struk contoh.",
      );
    }
  };

  const buka = (j: "penjualan" | "pembelian") => {
    if (sisa === 0) return toast(pesanKuotaHabis("scanStruk", plan), "peringatan");
    setJenis(j);
    setFoto(null);
    setModalKamera(true);
    nyalakanKamera();
  };

  useImperativeHandle(ref, () => ({
    buka: (j) => {
      if (!tersedia) return toast(`Scan struk ${lockedMessage("pro").toLowerCase()}.`, "info");
      buka(j);
    },
  }));

  const tutup = () => {
    sesiRef.current++;
    setModalKamera(false);
    matikanKamera();
    setFoto(null);
    setTahap("idle");
  };

  const kecilkan = (src: CanvasImageSource, w: number, h: number) => {
    const c = canvasRef.current;
    if (!c) return null;
    const s = Math.min(1, MAKS_SISI / Math.max(w, h));
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  };

  const ambilFoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setFoto(kecilkan(v, v.videoWidth, v.videoHeight));
  };

  const pilihFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setFoto(kecilkan(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      toast("File gambar tidak dapat dibaca.", "peringatan");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Struk contoh untuk demo tanpa foto (atau saat kamera tidak tersedia)
  const dataContoh = (): { items: ItemStruk[]; receiptDiscount: number } => {
    if (jenis === "penjualan") {
      return {
        items: products.slice(0, 3).map((p, i) => ({
          name: p.name,
          price: p.sellingPrice * (i + 1),
          discount: i === 0 ? 5_000 : 0,
          qty: i + 1,
          bahanId: "",
        })),
        receiptDiscount: 5_000,
      };
    }
    // struk belanja: bahan yang paling menipis + satu barang non-persediaan
    const butuh = [...bahan].sort((a, b) => a.stok / (a.stokMin || 1) - b.stok / (b.stokMin || 1)).slice(0, 3);
    return {
      items: [
        ...butuh.map((b, i) => {
          const qty = Math.max(1, Math.round(b.stokMin));
          const price = Math.round((qty * b.harga * 1.02) / 100) * 100;
          return {
            name: b.nama,
            qty,
            price,
            discount: i === 1 ? Math.round(price * 0.1) : 0,
            bahanId: b.id,
          };
        }),
        { name: "Kertas struk thermal", qty: 2, price: 34_000, discount: 0, bahanId: "" },
      ],
      receiptDiscount: 4_000,
    };
  };

  const bacaStruk = async (): Promise<{ items: ItemStruk[]; receiptDiscount: number }> => {
    if (!foto) {
      await jeda(1600);
      return dataContoh();
    }
    // katalog membantu Gemini menyamakan nama barang di struk dengan data toko
    const katalog = jenis === "pembelian" ? bahan.map((b) => b.nama) : products.map((p) => p.name);
    const res = await fetch("/api/scan-struk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto, jenis, katalog }),
    });
    const hasil = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(hasil.items)) throw new Error(hasil.error || "Server API tidak merespons. Jalankan ulang npm run dev.");
    const items: { name: string; qty: number; price: number; discount?: number }[] = hasil.items;
    if (!items.length) throw new Error("Tidak ada barang terbaca. Foto ulang lebih dekat dan terang.");
    const mapped = items.map((i) => {
      const b =
        jenis === "pembelian" ? (bahan.find((x) => x.nama.toLowerCase() === i.name.toLowerCase()) ?? cocokkanBahan(i.name)) : undefined;
      return {
        name: i.name,
        qty: Number(i.qty) || 1,
        price: Number(i.price) || 0,
        discount: Number(i.discount) || 0,
        bahanId: b?.id ?? "",
      };
    });
    return {
      items: mapped,
      receiptDiscount: Number(hasil.receiptDiscount) || 0,
    };
  };

  const analisis = async () => {
    if (sisa === 0) return toast(pesanKuotaHabis("scanStruk", plan), "peringatan");
    const sesi = sesiRef.current;
    setProgres(0);
    setPesanGagal("");
    setTahap("proses");
    try {
      const hasil = await bacaStruk();
      if (sesi !== sesiRef.current) return;
      // kuota baru dipotong setelah struk berhasil terbaca
      pakaiKuota("scanStruk");
      setJumlahTerbaca(hasil.items.length);
      setProgres(100);
      setTahap("berhasil");
      // beri waktu animasi centang sebelum pindah ke konfirmasi
      await jeda(1300);
      if (sesi !== sesiRef.current) return;
      setData(hasil.items);
      setDiskonStruk(hasil.receiptDiscount);
      tutup();
    } catch (err) {
      if (sesi !== sesiRef.current) return;
      setPesanGagal((err instanceof Error && err.message) || "Gagal menganalisis struk.");
      setTahap("gagal");
    }
  };

  const simpan = () => {
    if (!data || !jenis) return;
    const subtotal = data.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const diskonItem = data.reduce((s, i) => s + (Number(i.discount) || 0), 0);
    const totalDiskon = diskonItem + (Number(diskonStruk) || 0);
    const total = Math.max(0, subtotal - totalDiskon);

    if (total <= 0 && subtotal <= 0) return toast("Total struk harus lebih dari 0.", "peringatan");
    const byCode = (code: string) => accounts.find((a) => a.code === code)?.id;
    const kas = byCode("1.1.1.01");
    const hari = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const baru: JournalEntry[] = [];
    const ketDiskon = totalDiskon > 0 ? ` (Diskon: ${formatRp(totalDiskon)})` : "";

    if (jenis === "penjualan") {
      const pend = byCode("4.2.1.01");
      const hpp = byCode("5.1.1.01");
      const persediaan = byCode("1.1.4.01");
      if (!kas || !pend) return toast("Akun kas/pendapatan tidak ditemukan di Bagan Akun.", "peringatan");
      baru.push({
        id: `${now}-jual`,
        date: hari,
        description: `Scan struk penjualan${ketDiskon}`,
        lines: [
          { id: `${now}-1`, side: "debit", accountId: kas, amount: total },
          { id: `${now}-2`, side: "credit", accountId: pend, amount: total },
        ],
      });
      // HPP dari data inventaris; bila produk tidak ditemukan pakai estimasi 60% harga bersih
      const pokok = data.reduce((s, i) => {
        const p = products.find((x) => x.name.toLowerCase() === i.name.toLowerCase());
        const netItem = Math.max(0, (Number(i.price) || 0) - (Number(i.discount) || 0));
        return s + (p ? p.unitCost * (i.qty || 1) : Math.round(netItem * 0.6));
      }, 0);
      if (hpp && persediaan && pokok > 0) {
        baru.push({
          id: `${now}-hpp`,
          date: hari,
          description: "HPP dari scan struk penjualan",
          lines: [
            { id: `${now}-3`, side: "debit", accountId: hpp, amount: pokok },
            { id: `${now}-4`, side: "credit", accountId: persediaan, amount: pokok },
          ],
        });
      }
    } else {
      const persediaan = byCode("1.1.4.01");
      const perlengkapan = byCode("1.1.4.03");
      if (!kas || !persediaan || !perlengkapan) return toast("Akun kas/persediaan tidak ditemukan di Bagan Akun.", "peringatan");

      // Hitung harga bersih tiap barang setelah diskon item & alokasi diskon struk secara proporsional
      const subtotalNetItem = Math.max(1, subtotal - diskonItem);
      const rasioNet = Math.max(0, total / subtotalNetItem);

      const hitungHargaBersih = (i: ItemStruk) => {
        const netPerItem = Math.max(0, (Number(i.price) || 0) - (Number(i.discount) || 0));
        return Math.round(netPerItem * rasioNet);
      };

      const keBahan = data.filter((i) => i.bahanId && i.qty > 0);
      const nilaiBahan = keBahan.reduce((s, i) => s + hitungHargaBersih(i), 0);
      const nilaiLain = Math.max(0, total - nilaiBahan);
      const lines: JournalEntry["lines"] = [];
      if (nilaiBahan > 0) lines.push({ id: `${now}-5`, side: "debit", accountId: persediaan, amount: nilaiBahan });
      if (nilaiLain > 0) lines.push({ id: `${now}-6`, side: "debit", accountId: perlengkapan, amount: nilaiLain });
      lines.push({ id: `${now}-7`, side: "credit", accountId: kas, amount: total });
      baru.push({ id: `${now}-beli`, date: hari, description: `Scan struk pembelian${ketDiskon}`, lines });
      keBahan.forEach((i) => tambahStok(i.bahanId, i.qty, hitungHargaBersih(i)));
      if (keBahan.length) toast(`Stok ${keBahan.length} bahan baku bertambah`, "info");
    }
    setEntries([...baru, ...entries]);
    setData(null);
    setDiskonStruk(0);
    toast("Struk tercatat sebagai jurnal");
  };

  const ubahItem = (i: number, p: Partial<ItemStruk>) => setData((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className={`card-elegant p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{hanyaPembelian ? "Scan Struk Pembelian" : "Scan Struk"}</h3>
            <p className="text-xs text-gray-500">
              {hanyaPembelian
                ? "Foto struk belanja, stok bahan baku bertambah otomatis."
                : "Foto struk belanja atau penjualan, jurnal tercatat otomatis."}
            </p>
          </div>
        </div>
        {tersedia && <QuotaBadge kuota="scanStruk" />}
      </div>

      {tersedia && !hanyaPembelian ? (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <button
              onClick={() => buka("penjualan")}
              disabled={sisa === 0}
              className="btn-gradient group rounded-2xl p-4 text-left flex flex-col justify-between gap-2 disabled:opacity-50"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <IlustrasiStruk jenis="penjualan" gelap />
              </span>
              <span>
                <span className="block text-base font-bold">Struk Penjualan</span>
                <span className="block text-xs text-white/75 mt-0.5">Pendapatan dan HPP tercatat, stok produk berkurang.</span>
              </span>
            </button>
            <button
              onClick={() => buka("pembelian")}
              disabled={sisa === 0}
              className="group rounded-2xl border-2 border-primary/80 bg-white p-4 text-left flex flex-col justify-between gap-2 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 shrink-0 rounded-xl chip-gradient flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </span>
                <IlustrasiStruk jenis="pembelian" />
              </span>
              <span>
                <span className="block text-base font-bold">Struk Pembelian</span>
                <span className="block text-xs text-gray-500 mt-0.5">Stok bahan baku bertambah, pembelian tercatat.</span>
              </span>
            </button>
          </div>
          {/* alur singkat cara kerja scan struk */}
          <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
            {[
              { Icon: Camera, t: "Foto struk" },
              { Icon: ListChecks, t: "Periksa isinya" },
              { Icon: FileCheck2, t: "Jurnal otomatis" },
            ].map(({ Icon, t }, i) => (
              <li key={t} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-primary">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>
                  <span className="font-semibold text-gray-700">{i + 1}.</span> {t}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : tersedia ? (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {!hanyaPembelian && (
            <button onClick={() => buka("penjualan")} disabled={sisa === 0} className="flex-1 rounded-xl btn-gradient px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              Struk Penjualan
            </button>
          )}
          <button
            onClick={() => buka("pembelian")}
            disabled={sisa === 0}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
              hanyaPembelian ? "btn-gradient" : "border-2 border-primary text-primary"
            }`}
          >
            Struk Pembelian
          </button>
        </div>
      ) : (
        <Link
          to={role === "induk" ? "/profil?tab=paket" : "#"}
          className="mt-4 flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-500"
        >
          <Lock className="w-4 h-4 shrink-0" /> {lockedMessage("pro")}
          {role === "cabang" && ". Minta akun Induk untuk upgrade."}
        </Link>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {modalKamera && (
        <Lapisan className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Scan Struk {jenis === "penjualan" ? "Penjualan" : "Pembelian"}</h3>
              <button onClick={tutup} className="text-sm text-gray-500 hover:text-gray-800">
                Tutup
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <motion.div
                animate={tahap === "gagal" ? { x: [0, -12, 12, -8, 8, -3, 0] } : { x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-black rounded-lg overflow-hidden aspect-[3/4] sm:aspect-video relative flex items-center justify-center"
              >
                {foto && <img src={foto} alt="Hasil foto struk" className="w-full h-full object-contain" />}
                {/* video tetap terpasang agar stream kamera tidak hilang saat "Ulangi" */}
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${foto ? "hidden" : ""}`} />
                {errorKamera && !foto && tahap === "idle" && (
                  <div className="absolute inset-x-4 top-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{errorKamera}</div>
                )}

                <AnimatePresence>
                  {tahap === "proses" && (
                    <motion.div key="proses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/30">
                      {/* sudut bingkai pemindai */}
                      {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
                        <motion.span
                          key={c}
                          className={`absolute w-7 h-7 rounded-sm border-cyan-300 ${c}`}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        />
                      ))}
                      {!kurangGerak && (
                        <motion.div
                          className="absolute inset-x-4 h-0.5 rounded-full bg-cyan-300 shadow-[0_0_16px_5px_rgba(103,232,249,0.55)]"
                          animate={{ top: ["6%", "94%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        />
                      )}
                    </motion.div>
                  )}

                  {tahap === "berhasil" && (
                    <motion.div
                      key="berhasil"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white"
                    >
                      <span className="relative flex items-center justify-center">
                        <motion.span
                          className="absolute w-20 h-20 rounded-full bg-emerald-400"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 1.9, opacity: 0 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                        <motion.span
                          className="relative w-20 h-20 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 320, damping: 16 }}
                        >
                          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.4 }} />
                          </svg>
                        </motion.span>
                      </span>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 font-semibold">
                        Struk berhasil terbaca!
                      </motion.p>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-xs text-white/80">
                        {jumlahTerbaca} barang ditemukan
                      </motion.p>
                    </motion.div>
                  )}

                  {tahap === "gagal" && (
                    <motion.div
                      key="gagal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white"
                    >
                      <motion.span
                        className="w-20 h-20 rounded-full bg-red-500 shadow-lg flex items-center justify-center"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                          <motion.path d="M7 7l10 10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.25 }} />
                          <motion.path d="M17 7L7 17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.25 }} />
                        </svg>
                      </motion.span>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 font-semibold">
                        Struk gagal dianalisis
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {(tahap === "proses" || tahap === "berhasil") && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span>{tahap === "berhasil" ? "Selesai" : `${LANGKAH[langkahDari(progres)]}...`}</span>
                    <span className="tabular-nums">{Math.round(progres)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${tahap === "berhasil" ? "bg-emerald-500" : "bg-primary"}`}
                      animate={{ width: `${progres}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                  </div>
                  <ol className="grid grid-cols-3 gap-2 text-[11px]">
                    {LANGKAH.map((t, i) => {
                      const aktif = langkahDari(progres);
                      const selesai = tahap === "berhasil" || i < aktif;
                      return (
                        <li
                          key={t}
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
                            selesai ? "bg-emerald-50 text-emerald-700" : i === aktif ? "bg-white text-gray-800 ring-1 ring-gray-200" : "text-gray-400"
                          }`}
                        >
                          {selesai ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : i === aktif ? (
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {t}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {tahap === "gagal" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-sm">Struk tidak dapat dibaca</p>
                      <p className="mt-0.5">{pesanGagal}</p>
                      <p className="mt-1 text-red-500">Token scan tidak terpakai.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setFoto(null);
                        setTahap("idle");
                      }}
                      className="rounded-full border bg-white px-4 py-2 text-sm"
                    >
                      Foto Ulang
                    </button>
                    <button onClick={analisis} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white">
                      <RotateCcw className="w-4 h-4" /> Coba Lagi
                    </button>
                  </div>
                </motion.div>
              )}

              {tahap === "idle" && (
              <>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!foto && (
                  <button
                    onClick={ambilFoto}
                    disabled={!kameraAktif}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> Ambil Foto
                  </button>
                )}
                {!foto && (
                  <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm">
                    <Upload className="w-4 h-4" /> Unggah Foto
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={pilihFile} className="hidden" />
                {foto && (
                  <button onClick={() => setFoto(null)} className="rounded-full border bg-white px-4 py-2 text-sm">
                    Ulangi
                  </button>
                )}
                <button onClick={analisis} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white">
                  {foto ? "Analisis Struk" : "Pakai Struk Contoh"}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-500">Setiap analisis memakai 1 token scan struk.</p>
              </>
              )}
            </div>
          </div>
        </Lapisan>
      )}

      {data && (() => {
        const subtotalKotor = data.reduce((s, i) => s + (Number(i.price) || 0), 0);
        const totalDiskonItem = data.reduce((s, i) => s + (Number(i.discount) || 0), 0);
        const totalDiskon = totalDiskonItem + (Number(diskonStruk) || 0);
        const totalBersih = Math.max(0, subtotalKotor - totalDiskon);

        return (
          <Lapisan className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Konfirmasi Isi Struk {jenis === "pembelian" ? "Pembelian" : "Penjualan"}</h3>
                  <p className="text-xs text-gray-500">Periksa detail barang, diskon, dan total sebelum dicatat ke jurnal.</p>
                </div>
                <button
                  onClick={() => {
                    setData(null);
                    setDiskonStruk(0);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Batal
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {jenis === "pembelian" && (
                  <p className="text-xs text-gray-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                    💡 Baris yang dicocokkan ke bahan baku akan menambah stok persediaan. Harga perolehan stok otomatis disesuaikan secara proporsional dengan harga setelah diskon.
                  </p>
                )}

                {data.map((item, i) => {
                  const b = item.bahanId ? getBahan(item.bahanId) : undefined;
                  const itemNet = Math.max(0, (item.price || 0) - (item.discount || 0));
                  return (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 shadow-xs hover:border-gray-300 transition-colors">
                      <div className="flex gap-2 items-center">
                        <input
                          value={item.name}
                          onChange={(e) => {
                            const cocok = jenis === "pembelian" ? cocokkanBahan(e.target.value) : undefined;
                            ubahItem(i, { name: e.target.value, ...(cocok && !item.bahanId ? { bahanId: cocok.id } : {}) });
                          }}
                          className="border rounded-lg px-3 py-1.5 flex-1 text-sm font-medium focus:ring-1 focus:ring-primary"
                          placeholder="Nama barang"
                        />
                        {jenis === "pembelian" && (
                          <select
                            value={item.bahanId}
                            onChange={(e) => ubahItem(i, { bahanId: e.target.value })}
                            className="border rounded-lg px-2 py-1.5 text-xs text-gray-700 max-w-[140px] sm:max-w-[170px]"
                          >
                            <option value="">Bukan bahan baku</option>
                            {bahan.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.nama}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => setData(data.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          aria-label="Hapus"
                          title="Hapus baris"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Qty:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={(e) => ubahItem(i, { qty: Number(e.target.value) })}
                            className="border rounded-md px-2 py-1 w-16 text-right font-medium"
                          />
                          <span className="text-gray-500">{b?.satuan ?? "pcs"}</span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Harga:</span>
                            <input
                              type="number"
                              min={0}
                              value={item.price}
                              onChange={(e) => ubahItem(i, { price: Number(e.target.value) })}
                              className="border rounded-md px-2 py-1 w-24 text-right font-medium"
                              placeholder="0"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-amber-600 font-medium" title="Potongan harga khusus barang ini">
                              Disc:
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={item.discount || ""}
                              onChange={(e) => ubahItem(i, { discount: Math.max(0, Number(e.target.value)) })}
                              className={`border rounded-md px-2 py-1 w-20 text-right ${
                                (item.discount || 0) > 0 ? "border-amber-300 bg-amber-50 text-amber-700 font-semibold" : "text-gray-700"
                              }`}
                              placeholder="0"
                            />
                          </div>

                          <div className="text-right pl-1 min-w-[70px]">
                            <span className="text-[10px] block text-gray-400 leading-tight">Net</span>
                            <span className="font-semibold text-gray-800">{formatRp(itemNet)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setData([...data, { name: "", price: 0, discount: 0, qty: 1, bahanId: "" }])}
                  className="text-sm font-medium text-primary hover:underline py-1 inline-flex items-center gap-1"
                >
                  + Tambah barang
                </button>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal ({data.length} barang)</span>
                    <span className="tabular-nums font-medium">{formatRp(subtotalKotor)}</span>
                  </div>

                  {totalDiskonItem > 0 && (
                    <div className="flex justify-between text-xs text-amber-600">
                      <span>Total Diskon Item</span>
                      <span className="tabular-nums font-medium">-{formatRp(totalDiskonItem)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Diskon Struk / Voucher Belanja</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-700 text-xs">- Rp</span>
                      <input
                        type="number"
                        min={0}
                        value={diskonStruk || ""}
                        onChange={(e) => setDiskonStruk(Math.max(0, Number(e.target.value)))}
                        className="border border-amber-300 rounded-lg px-2 py-1 w-28 text-right text-xs font-bold text-amber-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-baseline font-bold">
                    <div>
                      <span className="text-sm text-gray-900">Total Akhir</span>
                      {totalDiskon > 0 && (
                        <span className="block text-[11px] font-normal text-emerald-600">
                          Hemat {formatRp(totalDiskon)}
                        </span>
                      )}
                    </div>
                    <span className="text-lg text-primary tabular-nums">{formatRp(totalBersih)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {totalDiskon > 0 ? `Total diskon: ${formatRp(totalDiskon)}` : "Tanpa diskon"}
                </span>
                <button onClick={simpan} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm">
                  Catat sebagai Jurnal
                </button>
              </div>
            </div>
          </Lapisan>
        );
      })()}
    </div>
  );
});

export default ScanStruk;
