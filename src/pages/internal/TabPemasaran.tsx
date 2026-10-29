import { useMemo, useState } from "react";
import { RefreshCw, Star, MessageCircle, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import BrandIcon, { type Brand } from "../../components/BrandIcon";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useToast } from "../../context/ToastContext";
import { ULASAN_BARU, ulasanAwal, type Platform, type Sentimen, type Topik, type Ulasan } from "../../data/internal";

// warna grafik per platform memakai tone navy; logo platform tetap warna aslinya
const PLATFORM: Record<Platform, { warna: string; chip: string; brand: Brand }> = {
  Instagram: { warna: "#012a3d", chip: "bg-pink-50 text-pink-700 ring-pink-200", brand: "instagram" },
  TikTok: { warna: "#2f6b8f", chip: "bg-gray-100 text-gray-800 ring-gray-300", brand: "tiktok" },
  Shopee: { warna: "#5487ab", chip: "bg-orange-50 text-orange-700 ring-orange-200", brand: "shopee" },
  Tokopedia: { warna: "#9cb2c1", chip: "bg-green-50 text-green-700 ring-green-200", brand: "tokopedia" },
};
const SENTIMEN: Record<Sentimen, { label: string; warna: string }> = {
  positif: { label: "Positif", warna: "#2f6b8f" },
  netral: { label: "Netral", warna: "#c6d8e4" },
  negatif: { label: "Negatif", warna: "#012a3d" },
};
const TOPIK: Topik[] = ["Rasa / Kualitas", "Harga", "Pengiriman", "Pelayanan", "Kemasan"];

export default function TabPemasaran() {
  const { toast } = useToast();
  const [ulasan, setUlasan] = useState<Ulasan[]>(ulasanAwal);
  const [filter, setFilter] = useState<Platform | "Semua">("Semua");
  const [memuat, setMemuat] = useState(false);
  const [terakhir, setTerakhir] = useState(() => new Date());
  const [sisaBaru, setSisaBaru] = useState(ULASAN_BARU);

  const data = filter === "Semua" ? ulasan : ulasan.filter((u) => u.platform === filter);

  const statistik = useMemo(() => {
    const n = data.length || 1;
    const rata = data.reduce((s, u) => s + u.rating, 0) / n;
    const sentimen = (Object.keys(SENTIMEN) as Sentimen[]).map((k) => ({
      name: SENTIMEN[k].label,
      key: k,
      value: data.filter((u) => u.sentimen === k).length,
    }));
    const topik = TOPIK.map((t) => ({
      topik: t,
      positif: data.filter((u) => u.topik.includes(t) && u.sentimen === "positif").length,
      negatif: data.filter((u) => u.topik.includes(t) && u.sentimen === "negatif").length,
    }));
    const perPlatform = (Object.keys(PLATFORM) as Platform[]).map((p) => {
      const xs = ulasan.filter((u) => u.platform === p);
      return { platform: p, jumlah: xs.length, rata: xs.length ? xs.reduce((s, u) => s + u.rating, 0) / xs.length : 0 };
    });
    return { rata, sentimen, topik, perPlatform, nps: ((sentimen[0].value - sentimen[2].value) / n) * 100 };
  }, [data, ulasan]);

  // Insight berbasis aturan (tanpa AI)
  const insight = useMemo(() => {
    const out: { judul: string; teks: string; tone: "baik" | "buruk" | "info" }[] = [];
    const keluhan = [...statistik.topik].sort((a, b) => b.negatif - a.negatif)[0];
    if (keluhan && keluhan.negatif > 0) {
      const platformKeluhan = (Object.keys(PLATFORM) as Platform[])
        .map((p) => ({ p, n: ulasan.filter((u) => u.platform === p && u.sentimen === "negatif" && u.topik.includes(keluhan.topik)).length }))
        .sort((a, b) => b.n - a.n)[0];
      out.push({
        judul: `Keluhan terbanyak: ${keluhan.topik}`,
        teks: `${keluhan.negatif} ulasan negatif menyinggung ${keluhan.topik.toLowerCase()}, paling banyak di ${platformKeluhan.p}. ${
          keluhan.topik === "Pengiriman"
            ? "Pertimbangkan ganti ekspedisi atau tampilkan estimasi waktu kirim lebih jelas."
            : keluhan.topik === "Pelayanan"
              ? "Pasang balasan otomatis dan targetkan respon chat di bawah 1 jam."
              : keluhan.topik === "Harga"
                ? "Komunikasikan alasan kenaikan harga atau tawarkan paket hemat."
                : "Periksa ulang standar kualitas dan kemasan sebelum dikirim."
        }`,
        tone: "buruk",
      });
    }
    const pujian = [...statistik.topik].sort((a, b) => b.positif - a.positif)[0];
    if (pujian && pujian.positif > 0) {
      out.push({
        judul: `Keunggulan utama: ${pujian.topik}`,
        teks: `${pujian.positif} ulasan positif memuji ${pujian.topik.toLowerCase()}. Jadikan pesan utama di caption dan iklan.`,
        tone: "baik",
      });
    }
    const terbaik = [...statistik.perPlatform].filter((p) => p.jumlah > 0).sort((a, b) => b.rata - a.rata)[0];
    const terburuk = [...statistik.perPlatform].filter((p) => p.jumlah > 0).sort((a, b) => a.rata - b.rata)[0];
    if (terbaik && terburuk && terbaik.platform !== terburuk.platform) {
      out.push({
        judul: "Perbandingan kanal",
        teks: `Rating tertinggi di ${terbaik.platform} (${terbaik.rata.toFixed(1)}), terendah di ${terburuk.platform} (${terburuk.rata.toFixed(
          1,
        )}). Fokuskan perbaikan layanan di ${terburuk.platform}.`,
        tone: "info",
      });
    }
    const sosmed = ulasan.filter((u) => u.platform === "TikTok" || u.platform === "Instagram").length;
    out.push({
      judul: "Peluang konten",
      teks: `${sosmed} sebutan datang dari Instagram dan TikTok. Ajak pelanggan yang puas membuat konten ulang (repost) untuk menambah jangkauan organik.`,
      tone: "info",
    });
    return out;
  }, [statistik, ulasan]);

  const ambilUlasan = () => {
    setMemuat(true);
    setTimeout(() => {
      if (sisaBaru.length === 0) {
        toast("Belum ada ulasan baru", "info");
      } else {
        const ambil = sisaBaru.slice(0, 2).map((u, i) => ({
          ...u,
          id: `baru-${Date.now()}-${i}`,
          tanggal: new Date().toISOString().slice(0, 10),
        }));
        setUlasan((p) => [...ambil, ...p]);
        setSisaBaru((p) => p.slice(2));
        toast(`${ambil.length} ulasan baru diambil`);
      }
      setTerakhir(new Date());
      setMemuat(false);
    }, 1200);
  };

  const toneCls = {
    baik: "border-emerald-200 bg-emerald-50/60",
    buruk: "border-red-200 bg-red-50/60",
    info: "border-blue-200 bg-blue-50/60",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["Semua", ...Object.keys(PLATFORM)] as (Platform | "Semua")[]).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                filter === p ? "bg-primary text-white ring-primary" : p === "Semua" ? "bg-white ring-gray-200" : PLATFORM[p as Platform].chip
              }`}
            >
              {p !== "Semua" && (
                <span className={filter === p ? "rounded bg-white p-0.5" : ""}>
                  <BrandIcon brand={PLATFORM[p as Platform].brand} size={14} />
                </span>
              )}
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Diperbarui {terakhir.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
          <button
            onClick={ambilUlasan}
            disabled={memuat}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${memuat ? "animate-spin" : ""}`} />
            {memuat ? "Mengambil..." : "Ambil Ulasan Terbaru"}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total ulasan", String(data.length), MessageCircle],
          ["Rating rata-rata", `${statistik.rata.toFixed(1)} / 5`, Star],
          ["Sentimen positif", `${Math.round((statistik.sentimen[0].value / (data.length || 1)) * 100)}%`, ThumbsUp],
          ["Sentimen negatif", `${Math.round((statistik.sentimen[2].value / (data.length || 1)) * 100)}%`, ThumbsDown],
        ].map(([k, v, Icon], i) => {
          const I = Icon as typeof Star;
          return (
            <div key={k as string} className={`card-gradient ${["grad-navy", "grad-ocean", "grad-indigo", "grad-steel"][i]} p-4`}>
              <div className="relative flex items-center justify-between">
                <p className="text-xs text-white/75">{k as string}</p>
                <I className="w-4 h-4 text-white/80" />
              </div>
              <p className="relative mt-1 text-xl font-bold">{v as string}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="card-elegant lg:col-span-4 p-5">
          <h3 className="font-semibold text-gray-900">Sebaran Sentimen</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statistik.sentimen} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {statistik.sentimen.map((s) => (
                    <Cell key={s.key} fill={SENTIMEN[s.key].warna} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-elegant lg:col-span-8 p-5">
          <h3 className="font-semibold text-gray-900">Topik yang Paling Sering Dibahas</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistik.topik}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                <XAxis dataKey="topik" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="positif" name="Positif" fill="#2f6b8f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negatif" name="Negatif" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card-elegant p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Insight dari Ulasan</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insight.map((x) => (
            <div key={x.judul} className={`rounded-xl border p-4 ${toneCls[x.tone]}`}>
              <p className="font-semibold text-gray-900 text-sm">{x.judul}</p>
              <p className="text-sm text-gray-700 mt-1">{x.teks}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {statistik.perPlatform.map((p) => (
            <div key={p.platform} className="rounded-xl border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: PLATFORM[p.platform].warna }}>
                <BrandIcon brand={PLATFORM[p.platform].brand} size={16} /> {p.platform}
              </p>
              <p className="text-lg font-bold text-gray-900">{p.jumlah ? p.rata.toFixed(1) : "—"}</p>
              <p className="text-[11px] text-gray-500">{p.jumlah} ulasan</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card-elegant p-6">
        <h3 className="text-lg font-semibold mb-4">Ulasan Terbaru</h3>
        <ul className="divide-y">
          {memuat &&
            Array.from({ length: 2 }, (_, i) => (
              <li key={`muat-${i}`} className="py-3 flex gap-3" aria-hidden>
                <span className="shimmer w-24 h-6 rounded-full" />
                <span className="flex-1 space-y-2">
                  <span className="block shimmer h-4 w-1/3" />
                  <span className="block shimmer h-4 w-3/4" />
                </span>
              </li>
            ))}
          {data.map((u) => (
            <li key={u.id} className="py-3 flex gap-3">
              <span className={`shrink-0 h-fit w-24 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${PLATFORM[u.platform].chip}`}>
                <BrandIcon brand={PLATFORM[u.platform].brand} size={14} /> {u.platform}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{u.pengguna}</span>
                  <span className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < u.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(u.tanggal).toLocaleDateString("id-ID")}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{u.teks}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: SENTIMEN[u.sentimen].warna }}>
                    {SENTIMEN[u.sentimen].label}
                  </span>
                  {u.topik.map((t) => (
                    <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-gray-400">
          Data ulasan pada mode demo adalah contoh. Integrasi pengambilan data (scraping/API resmi platform) dapat disambungkan di tahap berikutnya.
        </p>
      </section>
    </div>
  );
}
