import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ClaudeChatBubble from "../components/ClaudeChatBubble";
import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, MotionConfig } from "motion/react";
import TourGuide from "../components/TourGuide";
import { useEfekKursor } from "../hooks/useEfekKursor";
import { AksesProvider } from "../context/AksesContext";
import { useAccount } from "../context/AccountContext";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { akun } = useAccount();
  useEfekKursor();

  return (
    // reducedMotion="user": animasi motion otomatis diredam bila pengguna memilih "kurangi gerakan"
    <MotionConfig reducedMotion="user">
      <AksesProvider>
      <div className="min-h-screen flex relative">
        {/* Latar mesh gradient bergerak pelan */}
        <div className="latar-mesh" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMobileMenu={() => setMobileOpen(true)} />
          <main className="px-4 md:px-8 py-6 max-w-[90rem] w-full mx-auto relative">
            {/* transisi halaman: setiap ganti rute, konten masuk dengan fade + geser halus */}
            <motion.div
              // halaman dipasang ulang saat pindah akun agar pilihan/filter akun lama tidak terbawa
              key={`${pathname}::${akun}`}
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>

        <ClaudeChatBubble />
        <TourGuide />
      </div>
      </AksesProvider>
    </MotionConfig>
  );
}
