import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ClaudeChatBubble from "../components/ClaudeChatBubble";
import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, MotionConfig } from "motion/react";
import TourGuide from "../components/TourGuide";
import { useCursorEffect } from "../hooks/useCursorEffect";
import { AccessProvider } from "../context/AccessContext";
import { useAccount } from "../context/AccountContext";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { account } = useAccount();
  useCursorEffect();

  return (
    // reducedMotion="user": motion animations are automatically toned down when the user chooses "reduce motion"
    <MotionConfig reducedMotion="user">
      <AccessProvider>
      <div className="min-h-screen flex relative">
        {/* Slowly moving mesh gradient background */}
        <div className="mesh-bg" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMobileMenu={() => setMobileOpen(true)} />
          <main className="px-4 md:px-8 py-6 max-w-[90rem] w-full mx-auto relative">
            {/* page transition: on every route change, content enters with a fade + gentle slide */}
            <motion.div
              // the page remounts when switching accounts so the old account's selections/filters don't carry over
              key={`${pathname}::${account}`}
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
      </AccessProvider>
    </MotionConfig>
  );
}
