import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Home,
  BarChart2,
  Menu,
  X,
  Factory,
  AlertTriangle,
  Trophy,
  ShieldCheck,
  LogOut,
  User2,
  ShoppingCart,
  BookOpen,
  MessagesSquare,
  Lock,
  Tag,
} from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useAkses } from "../context/AksesContext";
import { FEATURES, type FeatureKey } from "../config/access";

type Props = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const GROUPS: { title: string; items: { key: FeatureKey; icon: typeof Home }[] }[] = [
  {
    title: "Ringkasan",
    items: [{ key: "beranda", icon: Home }],
  },
  {
    title: "Operasional",
    items: [
      { key: "kasir", icon: ShoppingCart },
      { key: "hargaCerdas", icon: Tag },
      { key: "manajemenInternal", icon: Factory },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { key: "baganAkun", icon: BookOpen },
      { key: "laporanKeuangan", icon: BarChart2 },
      { key: "audit", icon: AlertTriangle },
    ],
  },
  {
    title: "Pertumbuhan",
    items: [
      { key: "konsultasi", icon: MessagesSquare },
      { key: "umkmBerkembang", icon: Trophy },
      { key: "permodalan", icon: ShieldCheck },
    ],
  },
];

export default function Sidebar({ mobileOpen = false, onClose }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { alasanTerkunci } = useAccount();
  const { tampilkanAkses } = useAkses();

  function item(key: FeatureKey, Icon: typeof Home, compact: boolean, indikator: string) {
    const def = FEATURES[key];
    const active = pathname === def.path;
    const kunci = alasanTerkunci(key);
    const base = `group relative flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
      compact ? "justify-center" : "justify-start"
    }`;
    const label = (
      <span
        className={`relative transition-all duration-300 ease-in-out origin-left truncate ${
          compact
            ? "opacity-0 translate-x-[-6px] w-0 overflow-hidden"
            : "opacity-100 translate-x-0"
        }`}
      >
        {def.label}
      </span>
    );

    // fitur di luar akun/paket tetap tampil normal; klik memunculkan popup penjelasan
    if (kunci) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => tampilkanAkses(key)}
          title={kunci.pesan}
          className={`${base} w-full text-white/75 hover:bg-white/10 hover:text-white`}
        >
          <Icon className="relative w-5 h-5 flex-shrink-0" />
          {label}
          {compact ? (
            <Lock className="absolute top-1 right-1 w-3 h-3 text-white/60" />
          ) : (
            <Lock className="w-3.5 h-3.5 ml-auto text-white/50" />
          )}
        </button>
      );
    }

    return (
      <Link
        key={key}
        to={def.path}
        className={`${base} ${active ? "text-primary font-semibold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
      >
        {/* latar menu aktif bergeser halus antar menu (shared layout animation) */}
        {active && (
          <motion.span
            layoutId={indikator}
            className="indikator-aktif-terang rounded-lg"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <Icon className="relative w-5 h-5 flex-shrink-0" />
        {label}
      </Link>
    );
  }

  function nav(compact: boolean, indikator: string) {
    return GROUPS.map((g) => {
      // semua menu tetap tampil; yang di luar peran/paket tampil abu-abu
      const visible = g.items;
      return (
        <div key={g.title}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2 px-1 ${
              compact ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100"
            }`}
          >
            {g.title}
          </p>
          <div className="space-y-1">
            {visible.map((i) => item(i.key, i.icon, compact, indikator))}
          </div>
        </div>
      );
    });
  }

  function bottom(compact: boolean) {
    const profilActive = pathname === "/profil";
    return (
      <div className="mt-4 pt-4 border-t border-white/15 space-y-1">
        <Link
          to="/profil"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
            profilActive ? "bg-white text-primary font-semibold shadow-md" : "text-white/75 hover:bg-white/10 hover:text-white"
          } ${compact ? "justify-center" : ""}`}
        >
          <User2 className="w-4 h-4" />
          {!compact && <span>Profil</span>}
        </Link>
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-rose-300 hover:text-rose-200 ${
            compact ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!compact && <span>Keluar</span>}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className={`sidebar-root sidebar-gelap hidden md:flex flex-col h-screen sticky top-0 px-4 py-4 transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <button
            className="flex items-center gap-2"
            onClick={() => setCollapsed((s) => !s)}
          >
            <img
              src="/logo-white.png"
              alt="logo"
              className={`transition-all ${collapsed ? "w-8" : "w-9"}`}
            />
            <span
              className={`text-sm font-semibold text-white tracking-wide transition-all origin-left ${
                collapsed ? "opacity-0 scale-95 w-0" : "opacity-100 scale-100"
              }`}
            >
              Catalys
            </span>
          </button>

          <button
            onClick={() => setCollapsed((s) => !s)}
            aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
            className="p-1.5 rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>


        <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto -mr-2 pr-1">
          {nav(collapsed, "aktif-desktop")}
        </nav>

        {bottom(collapsed)}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="sidebar-gelap absolute left-0 top-0 h-full w-72 p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <img src="/logo-white.png" alt="logo" className="w-10" />
              <button onClick={onClose} className="p-1 rounded text-white/80 hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto -mr-2 pr-1" onClick={onClose}>
              {nav(false, "aktif-mobile")}
            </nav>
            <div onClick={onClose}>{bottom(false)}</div>
          </div>
        </div>
      )}
    </>
  );
}
