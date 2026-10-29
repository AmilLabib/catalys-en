import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Store, Check, ChevronDown, Plus, User2, LogOut, Lock } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useAkses } from "../context/AksesContext";
import { useToast } from "../context/ToastContext";
import { PLAN_LABEL } from "../config/access";

// Dropdown pojok kanan atas: pindah antara akun Induk dan akun tiap cabang,
// membuka cabang baru (khusus induk), profil, dan keluar.
export default function PilihAkun() {
  const { profile, role, cabang, plan, cabangList, punyaCabang, pindahAkun } = useAccount();
  const { bukaDialogCabang } = useAkses();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const inisial = profile.nama
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pindah = (akun: string) => {
    setBuka(false);
    if ((akun === "induk" && role === "induk") || akun === cabang) return;
    pindahAkun(akun);
    toast(`Sekarang di akun ${akun === "induk" ? "Induk" : akun}`, "info");
  };

  const namaAkun = role === "induk" ? (punyaCabang ? "Akun Induk" : profile.namaUsaha) : cabang;
  const item = (aktif: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      aktif ? "bg-primary/5 text-primary font-semibold" : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div ref={ref} className="relative" data-tour="pilih-akun">
      <button
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="menu"
        aria-expanded={buka}
        className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-1.5 pr-3 hover:bg-gray-200 transition-colors"
      >
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${role === "induk" ? "bg-primary text-white" : "chip-gradient"}`}>
          {role === "induk" ? inisial : <Store className="w-3.5 h-3.5" />}
        </span>
        <span className="hidden md:block leading-tight text-left">
          <span className="block text-xs font-semibold text-gray-800 max-w-[10rem] truncate">{namaAkun}</span>
          <span className="block text-[11px] text-gray-500">
            {role === "induk" ? (punyaCabang ? "Kantor pusat" : "Pemilik") : "Akun cabang"} · {PLAN_LABEL[plan]}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${buka ? "rotate-180" : ""}`} />
      </button>

      {buka && (
        <div role="menu" className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{profile.nama}</p>
            <p className="text-xs text-gray-500 truncate">{profile.email}</p>
          </div>

          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pindah akun</p>
          <button role="menuitem" onClick={() => pindah("induk")} className={item(role === "induk")}>
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block truncate">{punyaCabang ? "Akun Induk" : profile.namaUsaha}</span>
              <span className="block text-[11px] font-normal text-gray-500">{punyaCabang ? "Kantor pusat · semua cabang" : "Usaha tanpa cabang"}</span>
            </span>
            {role === "induk" && <Check className="w-4 h-4" />}
          </button>
          {cabangList.map((c) => (
            <button key={c.nama} role="menuitem" onClick={() => pindah(c.nama)} className={item(cabang === c.nama)}>
              <Store className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate">{c.nama}</span>
                <span className="block text-[11px] font-normal text-gray-500">{c.kota}</span>
              </span>
              {cabang === c.nama && <Check className="w-4 h-4" />}
            </button>
          ))}

          {role === "induk" ? (
            <button
              role="menuitem"
              onClick={() => {
                setBuka(false);
                bukaDialogCabang();
              }}
              className="mt-1 w-full flex items-center gap-3 rounded-lg border border-dashed border-[#9cb2c1] px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" /> Buka Cabang Baru
            </button>
          ) : (
            <p className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
              <Lock className="w-3.5 h-3.5 shrink-0" /> Cabang baru hanya bisa dibuka dari akun Induk
            </p>
          )}

          <div className="my-2 h-px bg-gray-100" />
          <button
            role="menuitem"
            onClick={() => {
              setBuka(false);
              navigate("/profil");
            }}
            className={item(false)}
          >
            <User2 className="w-4 h-4" /> Profil & langganan
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setBuka(false);
              navigate("/");
            }}
            className={item(false)}
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
