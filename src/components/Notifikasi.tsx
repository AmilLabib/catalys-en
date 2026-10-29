import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Boxes,
  CalendarClock,
  ScanLine,
  Store,
  MessageSquare,
  Wallet,
  Landmark,
  TrendingUp,
  CheckCheck,
  MoreHorizontal,
  BellOff,
  type LucideIcon,
} from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useBahanBaku } from "../context/BahanBakuContext";
import { statusStok } from "../data/bahanBaku";

// Panel notifikasi ala media sosial: dikelompokkan "Baru" dan "Sebelumnya",
// bisa difilter belum dibaca, klik membuka halaman terkait dan menandai sudah dibaca.

type Notif = {
  id: string;
  ikon: LucideIcon;
  avatar?: string; // foto; bila kosong pakai ikon
  judul: React.ReactNode;
  menit: number; // berapa menit yang lalu
  tujuan: string;
};

const KUNCI_DIBACA = "catalys_notif_dibaca_v1";

function waktuLalu(menit: number) {
  if (menit < 1) return "Baru saja";
  if (menit < 60) return `${menit} mnt`;
  if (menit < 60 * 24) return `${Math.floor(menit / 60)} j`;
  if (menit < 60 * 24 * 7) return `${Math.floor(menit / 1440)} h`;
  return `${Math.floor(menit / 10080)} mgg`;
}

export default function Notifikasi() {
  const navigate = useNavigate();
  const { role, cabang, cabangList, sesi, quotaRemaining, quotaPeriode, akun } = useAccount();
  const { bahan } = useBahanBaku();
  const [buka, setBuka] = useState(false);
  const [hanyaBelum, setHanyaBelum] = useState(false);
  const [dibaca, setDibaca] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KUNCI_DIBACA) ?? "[]");
    } catch {
      return [];
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_DIBACA, JSON.stringify(dibaca));
    } catch {
      // abaikan
    }
  }, [dibaca]);

  // tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setBuka(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("mousedown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  const daftar = useMemo<Notif[]>(() => {
    const n: Notif[] = [];

    // stok bahan baku yang menipis / habis
    const menipis = bahan.filter((b) => statusStok(b) !== "aman");
    menipis.slice(0, 2).forEach((b, i) =>
      n.push({
        id: `stok-${b.id}-${statusStok(b)}`,
        ikon: Boxes,
        judul: (
          <>
            Stok <b>{b.nama}</b> {statusStok(b) === "habis" ? "sudah habis" : "hampir habis"}. Beli dari supplier terdekat sebelum jam ramai.
          </>
        ),
        menit: 6 + i * 17,
        tujuan: "/internal-management?tab=inventaris",
      }),
    );

    // sesi konsultasi terjadwal
    sesi
      .filter((s) => s.status === "Terjadwal")
      .slice(0, 1)
      .forEach((s) =>
        n.push({
          id: `sesi-${s.id}`,
          ikon: CalendarClock,
          judul: (
            <>
              Sesi konsultasi dengan <b>{s.pakar}</b> tentang <b>{s.topik}</b> dijadwalkan {s.tanggal} pukul {s.jam}.
            </>
          ),
          menit: 42,
          tujuan: "/konsultasi",
        }),
      );

    // kuota scan struk
    const sisaScan = quotaRemaining("scanStruk");
    const periodeScan = quotaPeriode("scanStruk");
    if (sisaScan !== null && sisaScan > 0 && sisaScan <= 2)
      n.push({
        id: `kuota-scan-${akun}-${periodeScan}-${sisaScan <= 1 ? "kritis" : "rendah"}`,
        ikon: ScanLine,
        judul: (
          <>
            Token scan struk {periodeScan === "harian" ? "hari ini " : ""}tinggal <b>{sisaScan}</b>. {role === "induk" ? "Upgrade paket untuk menambah kuota." : "Hubungi akun Induk untuk upgrade."}
          </>
        ),
        menit: 95,
        tujuan: "/financial",
      });

    // cabang yang baru dibuka (akun induk)
    if (role === "induk")
      cabangList
        .filter((c) => c.nama !== "Cabang Utama")
        .slice(-2)
        .forEach((c, i) =>
          n.push({
            id: `cabang-${c.nama}`,
            ikon: Store,
            judul: (
              <>
                <b>{c.nama}</b> di {c.kota} sudah aktif. Pindah akun lewat menu kanan atas untuk mulai mengelolanya.
              </>
            ),
            menit: 180 + i * 60,
            tujuan: "/dashboard",
          }),
        );

    // contoh notifikasi operasional
    n.push(
      {
        id: "ulasan-negatif-1",
        ikon: MessageSquare,
        avatar: "https://randomuser.me/api/portraits/women/68.jpg",
        judul: (
          <>
            <b>Nadia Putri</b> memberi ulasan bintang 2 di Shopee: "Pengiriman agak lama, tapi rasanya enak." Balas sebelum 24 jam.
          </>
        ),
        menit: 60 * 5,
        tujuan: "/internal-management?tab=pemasaran",
      },
      {
        id: "insight-penjualan",
        ikon: TrendingUp,
        judul: (
          <>
            Penjualan {role === "cabang" ? <b>{cabang}</b> : "minggu ini"} naik <b>12%</b> dibanding minggu lalu. Lihat insight lengkapnya.
          </>
        ),
        menit: 60 * 26,
        tujuan: "/financial",
      },
      {
        id: "gaji-akhir-bulan",
        ikon: Wallet,
        judul: (
          <>
            Pengingat: gaji karyawan bulan ini belum semuanya <b>dicairkan</b>. Cairkan per orang di menu Sumber Daya.
          </>
        ),
        menit: 60 * 30,
        tujuan: "/internal-management?tab=penggajian",
      },
      {
        id: "cicilan-modal",
        ikon: Landmark,
        judul: (
          <>
            Cicilan pinjaman <b>KUR Mikro</b> jatuh tempo dalam 5 hari. Bayar tepat waktu untuk menjaga skor kredit.
          </>
        ),
        menit: 60 * 24 * 3,
        tujuan: "/permodalan",
      },
    );

    return n.sort((a, b) => a.menit - b.menit);
  }, [bahan, sesi, quotaRemaining, quotaPeriode, akun, role, cabang, cabangList]);

  const belumDibaca = daftar.filter((x) => !dibaca.includes(x.id));
  const tampil = hanyaBelum ? belumDibaca : daftar;
  const baru = tampil.filter((x) => x.menit < 60 * 24);
  const lama = tampil.filter((x) => x.menit >= 60 * 24);

  const bukaNotif = (x: Notif) => {
    setDibaca((d) => (d.includes(x.id) ? d : [...d, x.id]));
    setBuka(false);
    navigate(x.tujuan);
  };

  const kelompok = (judul: string, isi: Notif[]) =>
    isi.length > 0 && (
      <div>
        <p className="px-4 pt-3 pb-1 text-sm font-semibold text-gray-900">{judul}</p>
        <ul>
          {isi.map((x) => {
            const belum = !dibaca.includes(x.id);
            const Ikon = x.ikon;
            return (
              <li key={x.id}>
                <button onClick={() => bukaNotif(x)} className="group w-full flex items-start gap-3 rounded-xl mx-1 px-3 py-2.5 text-left hover:bg-gray-50" style={{ width: "calc(100% - 0.5rem)" }}>
                  <span className="relative shrink-0">
                    {x.avatar ? (
                      <img src={x.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="w-12 h-12 rounded-full grad-navy flex items-center justify-center text-white">
                        <Ikon className="w-5 h-5" />
                      </span>
                    )}
                    {/* lencana kecil di sudut avatar */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#2f6b8f] ring-2 ring-white flex items-center justify-center text-white">
                      <Ikon className="w-3 h-3" />
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] leading-snug ${belum ? "text-gray-900" : "text-gray-500"}`}>{x.judul}</span>
                    <span className={`block mt-0.5 text-xs ${belum ? "font-semibold text-[#2f6b8f]" : "text-gray-400"}`}>{waktuLalu(x.menit)}</span>
                  </span>
                  {belum && <span className="mt-4 w-2.5 h-2.5 shrink-0 rounded-full bg-[#2f6b8f]" aria-label="Belum dibaca" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div ref={ref} className="relative" data-tour="notifikasi">
      <button
        onClick={() => setBuka((b) => !b)}
        aria-label={`Notifikasi, ${belumDibaca.length} belum dibaca`}
        aria-expanded={buka}
        className={`relative p-2 rounded-full transition-colors ${buka ? "bg-primary/10 text-primary" : "hover:bg-gray-100 text-gray-600"}`}
      >
        <Bell className={`w-5 h-5 ${belumDibaca.length ? "lonceng-goyang" : ""}`} />
        {belumDibaca.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {belumDibaca.length > 9 ? "9+" : belumDibaca.length}
          </span>
        )}
      </button>

      {buka && (
        // di HP panel selebar layar (lonceng bukan elemen paling kanan), di desktop menempel ke lonceng
        <div className="notif-panel fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[22rem] rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-xl font-bold text-gray-900">Notifikasi</h3>
            <button
              onClick={() => setDibaca(daftar.map((x) => x.id))}
              title="Tandai semua sudah dibaca"
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
            >
              {belumDibaca.length ? <CheckCheck className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex gap-2 px-4 pt-2">
            {[
              ["Semua", false],
              ["Belum dibaca", true],
            ].map(([l, v]) => (
              <button
                key={String(l)}
                onClick={() => setHanyaBelum(v as boolean)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  hanyaBelum === v ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l}
                {v && belumDibaca.length > 0 && <span className="ml-1 text-xs">({belumDibaca.length})</span>}
              </button>
            ))}
          </div>

          <div className="notif-scroll max-h-[min(28rem,65vh)] overflow-y-auto pb-2">
            {kelompok("Baru", baru)}
            {kelompok("Sebelumnya", lama)}
            {tampil.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-gray-500">
                <BellOff className="w-8 h-8 text-gray-300" />
                Semua notifikasi sudah dibaca.
              </div>
            )}
          </div>

          {belumDibaca.length > 0 && (
            <button
              onClick={() => setDibaca(daftar.map((x) => x.id))}
              className="w-full border-t border-gray-100 py-2.5 text-sm font-semibold text-primary hover:bg-gray-50"
            >
              Tandai semua sudah dibaca
            </button>
          )}
        </div>
      )}
    </div>
  );
}
