import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Star, Video, MapPin, XCircle, ShoppingBag, CheckCircle2, Clock } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import QuotaBadge from "../components/QuotaBadge";
import { PAKET_SESI } from "../config/access";
import { rayakan } from "../utils/efek";

const PAKAR = [
  { nama: "Dewi Kartika, S.E., Ak.", bidang: "Keuangan & Pajak UMKM", pengalaman: "9 tahun", rating: 4.9, inisial: "DK" },
  { nama: "Raka Pratama, M.M.", bidang: "Pemasaran Digital", pengalaman: "7 tahun", rating: 4.8, inisial: "RP" },
  { nama: "Sinta Maharani, S.H.", bidang: "Legalitas & Perizinan", pengalaman: "6 tahun", rating: 4.7, inisial: "SM" },
  { nama: "Bayu Nugroho, M.B.A.", bidang: "Operasional & Permodalan", pengalaman: "11 tahun", rating: 4.9, inisial: "BN" },
];

const TOPIK = [
  "Keuangan & Pajak",
  "Temuan Audit",
  "Pemasaran Digital",
  "Operasional & SDM",
  "Permodalan",
  "Legalitas & Perizinan",
];

const JAM = ["09:00", "10:30", "13:00", "15:00", "19:00"];

function besok() {
  const d = new Date(Date.now() + 86_400_000);
  return d.toISOString().slice(0, 10);
}

function formatTanggal(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Konsultasi() {
  usePageTitle("Konsultasi");
  const [params] = useSearchParams();
  const { sesi, jadwalkanSesi, batalkanSesi, beliSesiTambahan, quotaRemaining } = useAccount();
  const { toast } = useToast();

  const [form, setForm] = useState({
    pakar: PAKAR[0].nama,
    topik: params.get("topik") && TOPIK.includes(params.get("topik")!) ? params.get("topik")! : TOPIK[0],
    tanggal: besok(),
    jam: JAM[1],
    mode: "Online" as "Online" | "Tatap Muka",
    catatan: params.get("catatan") ?? "",
  });
  const sisa = quotaRemaining("konsultasi") ?? 0;

  const terjadwal = sesi
    .filter((s) => s.status === "Terjadwal")
    .sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
  const riwayat = sesi.filter((s) => s.status !== "Terjadwal");

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.tanggal < besok()) return toast("Pilih tanggal mulai besok.", "peringatan");
    const bentrok = terjadwal.some((s) => s.tanggal === form.tanggal && s.jam === form.jam);
    if (bentrok) return toast("Anda sudah punya sesi di jam tersebut.", "peringatan");
    const ok = jadwalkanSesi({
      pakar: form.pakar,
      topik: form.topik,
      tanggal: form.tanggal,
      jam: form.jam,
      mode: form.mode,
      catatan: form.catatan.trim(),
    });
    if (!ok) return toast("Kuota konsultasi habis. Beli sesi tambahan untuk menjadwalkan lagi.", "peringatan");
    toast(`Sesi dengan ${form.pakar.split(",")[0]} dijadwalkan`);
    rayakan();
    setForm((f) => ({ ...f, catatan: "" }));
  };

  const input = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary">Konsultasi dengan Pakar</h2>
          <p className="text-sm text-gray-500">Jadwalkan sesi 60 menit bersama pendamping UMKM Catalys.</p>
        </div>
        <QuotaBadge kuota="konsultasi" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form jadwal */}
        <form onSubmit={kirim} className="card-elegant lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Jadwalkan Sesi</h3>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pilih pakar</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAKAR.map((p) => (
                <button
                  type="button"
                  key={p.nama}
                  onClick={() => setForm((f) => ({ ...f, pakar: p.nama }))}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                    form.pakar === p.nama ? "border-primary bg-primary/[0.03]" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#012a3d] to-[#2f6b8f] text-white text-sm font-bold flex items-center justify-center">
                    {p.inisial}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{p.nama}</span>
                    <span className="block text-xs text-gray-500">{p.bidang}</span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {p.rating} · {p.pengalaman}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Topik</span>
              <select className={input} value={form.topik} onChange={(e) => setForm((f) => ({ ...f, topik: e.target.value }))}>
                {TOPIK.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Tanggal</span>
              <input
                type="date"
                min={besok()}
                className={input}
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Jam (WIB)</p>
            <div className="flex flex-wrap gap-2">
              {JAM.map((j) => (
                <button
                  type="button"
                  key={j}
                  onClick={() => setForm((f) => ({ ...f, jam: j }))}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    form.jam === j ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Metode</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Online", Video, "Video call"],
                  ["Tatap Muka", MapPin, "Di kantor mitra terdekat"],
                ] as const
              ).map(([m, Icon, desc]) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, mode: m }))}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left ${
                    form.mode === m ? "border-primary bg-primary/[0.03]" : "border-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">{m}</span>
                    <span className="block text-[11px] text-gray-500">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Catatan untuk pakar (opsional)</span>
            <textarea
              rows={3}
              className={input}
              value={form.catatan}
              placeholder="Ceritakan singkat masalah yang ingin dibahas"
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <QuotaBadge kuota="konsultasi" />
            <button
              disabled={sisa === 0}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              Jadwalkan Sesi
            </button>
          </div>
        </form>

        {/* Kolom kanan */}
        <div className="lg:col-span-5 space-y-6">
          <section className="card-elegant p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Sesi Mendatang</h3>
            {terjadwal.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada sesi terjadwal.</p>
            ) : (
              <ul className="space-y-3">
                {terjadwal.map((s) => (
                  <li key={s.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.topik}</p>
                        <p className="text-xs text-gray-500">{s.pakar}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{s.mode}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5" /> {formatTanggal(s.tanggal)}, {s.jam} WIB
                    </p>
                    {s.catatan && <p className="mt-1 text-xs text-gray-500 italic">"{s.catatan}"</p>}
                    <button
                      onClick={() => {
                        if (confirm("Batalkan sesi ini? Kuota akan dikembalikan.")) {
                          batalkanSesi(s.id);
                          toast("Sesi dibatalkan, kuota dikembalikan", "info");
                        }
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Batalkan
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {riwayat.length > 0 && (
              <p className="mt-4 text-xs text-gray-400">{riwayat.length} sesi dibatalkan.</p>
            )}
          </section>

          <section className="rounded-2xl p-6 text-white bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h3 className="font-semibold">Beli Sesi Tambahan</h3>
            </div>
            <p className="mt-2 text-sm text-white/80">
              Paket {PAKET_SESI.jumlah} sesi konsultasi bisnis, bisa dibeli di semua paket langganan, dengan tindak lanjut lewat email.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-white/90">
              {[`${PAKET_SESI.jumlah}x sesi konsultasi`, "Prioritas jadwal", "Ringkasan sesi via email"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xl font-extrabold">
                {PAKET_SESI.harga} <span className="text-xs font-medium text-white/70">/ {PAKET_SESI.jumlah} sesi</span>
              </p>
              <button
                onClick={() => {
                  beliSesiTambahan(PAKET_SESI.jumlah);
                  toast(`${PAKET_SESI.jumlah} sesi tambahan berhasil ditambahkan (mode demo)`);
                }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-white/90"
              >
                Beli Sekarang
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
