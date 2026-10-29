import { useMemo, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Calendar, MapPin, Trophy, BookOpen, ExternalLink, PlayCircle } from "lucide-react";
import PillTabs from "../components/PillTabs";

type Opportunity = {
  id: string;
  title: string;
  category: "Event & Kompetisi" | "Pelatihan Keuangan" | "Pelatihan Ekspor";
  date: string;
  time: string;
  location: string;
  image?: string;
  short: string;
};

const opportunities: Opportunity[] = [
  {
    id: "evt-1",
    title: "Kompetisi Bisnis Nasional 2026",
    category: "Event & Kompetisi",
    date: "2026-11-14",
    time: "09:00 WIB",
    location: "Jakarta (Offline)",
    image: "/kompetisi-1.png",
    short:
      "Ajang kompetisi rencana bisnis skala nasional untuk pelaku UMKM & startup.",
  },
  {
    id: "evt-2",
    title: "Expo UMKM Nusantara",
    category: "Event & Kompetisi",
    date: "2026-12-05",
    time: "10:00 WIB",
    location: "Bandung (Offline)",
    image: "/kompetisi-2.png",
    short:
      "Pameran produk UMKM unggulan. Luaskan jaringan dan cari buyer potensial.",
  },
  {
    id: "fin-1",
    title: "Bedah Laporan Keuangan untuk Pemula",
    category: "Pelatihan Keuangan",
    date: "2026-11-06",
    time: "19:00 WIB",
    location: "Online (Zoom)",
    image: "/keuangan-1.png",
    short:
      "Belajar membuat Laporan Laba Rugi & Neraca dengan pendekatan praktis.",
  },
  {
    id: "fin-2",
    title: "Kelas HPP & Manajemen Cashflow",
    category: "Pelatihan Keuangan",
    date: "2026-11-20",
    time: "19:30 WIB",
    location: "Online (Google Meet)",
    image: "/keuangan-2.png",
    short:
      "Tentukan Harga Pokok Produksi yang tepat dan kelola arus kas harian UMKM.",
  },
  {
    id: "exp-1",
    title: "Menembus Pasar Eropa: Standar Kemasan",
    category: "Pelatihan Ekspor",
    date: "2026-11-12",
    time: "13:00 WIB",
    location: "Jakarta (Offline)",
    image: "/ekspor-1.png",
    short: "Pelajari standar kemasan dan regulasi untuk ekspor ke Uni Eropa.",
  },
  {
    id: "exp-2",
    title: "Mencari Buyer & Dokumen Bea Cukai",
    category: "Pelatihan Ekspor",
    date: "2026-12-03",
    time: "14:00 WIB",
    location: "Online (Webinar)",
    image: "/ekspor-2.png",
    short:
      "Strategi mencari buyer internasional dan kelengkapan dokumen ekspor.",
  },
  {
    id: "evt-3",
    title: "Kompetisi Inovasi Produk 2027",
    category: "Event & Kompetisi",
    date: "2027-01-23",
    time: "09:30 WIB",
    location: "Surabaya (Offline)",
    image: "/kompetisi-3.png",
    short:
      "Adu ide dan prototipe produk UMKM. Juri dari akademisi dan industri.",
  },
  {
    id: "evt-4",
    title: "Pitch Day UMKM Digital",
    category: "Event & Kompetisi",
    date: "2027-02-20",
    time: "13:00 WIB",
    location: "Online (Live Stream)",
    image: "/kompetisi-4.png",
    short: "Sesi pitching untuk UMKM digital di hadapan mentor dan investor.",
  },
  {
    id: "fin-3",
    title: "Fundamental Akuntansi untuk UMKM",
    category: "Pelatihan Keuangan",
    date: "2026-12-11",
    time: "19:00 WIB",
    location: "Online (Zoom)",
    image: "/keuangan-3.png",
    short: "Pahami pencatatan dasar, jurnal, dan laporan keuangan sederhana.",
  },
  {
    id: "fin-4",
    title: "Optimasi Pajak UMKM",
    category: "Pelatihan Keuangan",
    date: "2027-01-15",
    time: "19:30 WIB",
    location: "Online (Webinar)",
    image: "/keuangan-4.png",
    short:
      "Panduan praktis kewajiban pajak UMKM dan cara efisiensi yang legal.",
  },
  {
    id: "exp-3",
    title: "Sertifikasi Halal & Standar Global",
    category: "Pelatihan Ekspor",
    date: "2027-01-28",
    time: "10:00 WIB",
    location: "Jakarta (Offline)",
    image: "/ekspor-3.png",
    short:
      "Langkah memperoleh sertifikasi dan memenuhi standar pasar Timur Tengah.",
  },
  {
    id: "exp-4",
    title: "Logistik Ekspor: Incoterms & Freight",
    category: "Pelatihan Ekspor",
    date: "2027-02-11",
    time: "14:00 WIB",
    location: "Online (Webinar)",
    image: "/ekspor-4.png",
    short:
      "Memahami Incoterms, negosiasi freight, dan kelancaran proses pengiriman.",
  },
];

// Video pembelajaran per kategori (ID video YouTube asli)
const VIDEO: Record<Opportunity["category"], { id: string; judul: string; kanal: string }[]> = {
  "Event & Kompetisi": [
    { id: "BCNVt9maaOg", judul: "Cara Bikin Bisnis Plan Mudah dalam 10 Menit", kanal: "Kelly Patricia" },
    { id: "WQ0CpAKdCAk", judul: "Contoh Pitch Deck Startup yang Bagus", kanal: "BRI Ventures" },
  ],
  "Pelatihan Keuangan": [
    { id: "Gpxd-zSthGg", judul: "Pencatatan Keuangan Usaha Kecil dalam 5 Langkah", kanal: "Kelly Patricia" },
    { id: "03m82d6TUOk", judul: "Cara Mudah Hitung HPP Usaha Kecil", kanal: "Kelly Patricia" },
  ],
  "Pelatihan Ekspor": [
    { id: "R5NqM3hafPo", judul: "Cara Ekspor Barang ke Luar Negeri untuk Pemula", kanal: "Belajar Ekspor Impor" },
    { id: "cln1EOfb9VY", judul: "Baru Mau Ekspor? Tonton Ini Dulu", kanal: "UKM Eksporter Indonesia" },
  ],
};

const tabs = [
  { key: "Event & Kompetisi", label: "Event & Kompetisi", icon: Trophy },
  { key: "Pelatihan Keuangan", label: "Pelatihan Keuangan", icon: BookOpen },
  { key: "Pelatihan Ekspor", label: "Pelatihan Ekspor", icon: ExternalLink },
] as const;

function UmkmBerkembang() {
  usePageTitle("UMKM Berkembang");
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["key"]>("Event & Kompetisi");

  const filtered = useMemo(
    () => opportunities.filter((o) => o.category === activeTab),
    [activeTab],
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-[80rem] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 bg-transparent">
        <p className="text-sm text-gray-600 mb-6 mt-1">
          Kurasi konten pengembangan UMKM: pelatihan, kompetisi, dan peluang
          ekspor dari tim riset internal.
        </p>

        <PillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Video pembelajaran */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-primary">Video Pembelajaran</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VIDEO[activeTab].map((v) => (
              <div key={v.id} className="card-elegant overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0`}
                    title={v.judul}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 line-clamp-2">{v.judul}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.kanal}</p>
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Tonton di YouTube <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <h2 className="text-lg font-semibold text-primary mb-3">Program & Acara</h2>
        {/* Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="card-elegant hover-lift overflow-hidden"
            >
              {/* Poster / Banner */}
              <div className="relative aspect-video bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-gray-400 text-sm">Poster</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-primary line-clamp-2">
                  {item.title}
                </h3>

                {/* Meta */}
                <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-500" />{" "}
                    {new Date(item.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon /> {item.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-500" /> {item.location}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                  {item.short}
                </p>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button className="px-3 py-2 rounded-md bg-primary text-white text-sm transition-colors">
                    Lihat Detail
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm transition-colors hover:bg-gray-50">
                    Daftar Sekarang
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ikon jam kecil
function ClockIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8v5l3 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default UmkmBerkembang;
