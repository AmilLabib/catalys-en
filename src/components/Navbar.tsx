import { usePageTitleContext } from "../context/PageTitleContext";
import { Menu, Search } from "lucide-react";
import PilihAkun from "./PilihAkun";
import Notifikasi from "./Notifikasi";

type Props = {
  onMobileMenu?: () => void;
};

export default function Navbar({ onMobileMenu }: Props) {
  const { title: pageTitle } = usePageTitleContext();

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-[0_1px_0_rgba(1,42,61,0.06)]">
      <div className="max-w-[90rem] mx-auto px-3 md:px-8 py-3 flex items-center gap-2 sm:gap-4 relative">
        {/* Tombol menu mobile */}
        <div className="md:hidden">
          <button
            onClick={onMobileMenu}
            aria-label="Buka menu"
            className="p-2 rounded hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Judul halaman + pencarian */}
        <div className="flex-1 flex items-center justify-start gap-4 min-w-0">
          <div className="min-w-0 flex-1 sm:flex-none sm:shrink-0 sm:max-w-[45vw]">
            <h1 className="px-1 sm:px-8 text-sm sm:text-base md:text-lg font-extrabold text-primary leading-tight truncate">
              {pageTitle}
            </h1>
          </div>
          {/* pencarian disembunyikan di layar kecil agar judul & kontrol tidak berdesakan */}
          <div className="hidden sm:block w-full max-w-xl relative min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari laporan, pelanggan, atau wawasan..."
              className="w-full pl-9 pr-3 py-2 rounded-full bg-gray-100 border border-transparent focus:border-primary/40 focus:bg-white focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Kontrol kanan */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Notifikasi />


          <PilihAkun />
        </div>
      </div>
    </header>
  );
}
