import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Check } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { SECTOR_OPTIONS, useBusinessSector, type BusinessSector } from "../context/BusinessSectorContext";
import { PLANS, PLAN_LABEL, type Plan } from "../config/access";
import { useEfekKursor } from "../hooks/useEfekKursor";
import { bisa3D, BatasGalat3D } from "../components/three/dukungan";

// three.js dimuat terpisah agar tidak memperberat bundel utama
const LogoCatalys3D = lazy(() => import("../components/three/LogoCatalys3D"));

// Akun demo pemilik usaha: email dan kata sandi terisi otomatis, tidak bisa diubah.
// Pengguna selalu masuk ke akun induk; akun cabang dibuka lewat menu pindah akun.
const KATA_SANDI_DEMO = "catalysdemo";
const EMAIL_DEMO = "pemilik@catalys.id";

export default function Login() {
  const navigate = useNavigate();
  useEfekKursor();
  const { sector, setSector } = useBusinessSector();
  const { login, plan: planTersimpan } = useAccount();
  const [plan, setPlanPilihan] = useState<Plan>(planTersimpan);
  const email = EMAIL_DEMO;

  const masuk = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, plan);
    navigate("/dashboard");
  };

  const [pakai3D] = useState(bisa3D);
  const logoStatis = (
    <div className="relative flex flex-col items-center">
      <span className="logo-halo" aria-hidden />
      <img
        src="/logo-full.png"
        alt="Catalys - Smarter data. Stronger growth."
        className="logo-entrance relative w-40 sm:w-52 lg:w-72 [@media(max-height:700px)]:w-36"
      />
    </div>
  );

  const label = "text-sm font-medium text-text";
  const terkunci = "h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-9 text-sm text-gray-600 cursor-not-allowed focus:outline-none";

  return (
    // Tepat satu layar (100vw × 100dvh) tanpa scroll: dua kolom di layar lebar, satu kolom ringkas di HP
    <div className="login-bg relative flex h-[100dvh] w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="login-blob login-blob-a" />
      <div className="login-blob login-blob-b" />
      <div className="relative grid w-full max-w-5xl items-center gap-3 sm:gap-5 lg:grid-cols-2 lg:gap-12">
        {/* Kolom branding */}
        <div className="flex flex-col items-center">
          {pakai3D ? (
            <BatasGalat3D cadangan={logoStatis}>
              <Suspense fallback={<div className="h-32 w-48 sm:h-44 sm:w-64 lg:h-72 lg:w-96" />}>
                <div className="relative flex flex-col items-center">
                  <div
                    className="h-32 w-48 sm:h-44 sm:w-64 lg:h-72 lg:w-96 [@media(max-height:700px)]:h-28 [@media(max-height:700px)]:w-44"
                    role="img"
                    aria-label="Lambang Catalys"
                  >
                    <LogoCatalys3D />
                  </div>
                  <div className="login-item -mt-1 text-center" style={{ animationDelay: "0.6s" }}>
                    <p className="pl-[0.45em] text-2xl font-light tracking-[0.45em] text-primary sm:text-3xl lg:text-5xl">CATALYS</p>
                    <p className="mt-1 text-[9px] font-semibold tracking-[0.28em] text-[#012a3d] sm:text-[10px] lg:text-xs">
                      SMARTER DATA. STRONGER GROWTH.
                    </p>
                  </div>
                </div>
              </Suspense>
            </BatasGalat3D>
          ) : (
            logoStatis
          )}
          <p className="login-item mt-5 hidden max-w-sm text-center text-sm text-gray-600 lg:block" style={{ animationDelay: "0.75s" }}>
            Catat transaksi, susun laporan SAK EMKM, dan kembangkan usaha dari satu toko hingga banyak cabang.
          </p>
        </div>

        {/* Kolom formulir */}
        <form
          onSubmit={masuk}
          className="login-item card-elegant mx-auto flex w-full max-w-md flex-col gap-3.5 p-5 sm:gap-4 sm:p-6"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="rounded-xl bg-primary/5 px-3.5 py-2.5 text-sm text-gray-600 [@media(max-height:700px)]:hidden">
            <p className="font-semibold text-primary">Masuk sebagai pemilik usaha</p>
            <p className="mt-0.5 text-xs">Akun induk. Setelah membuka cabang, pindah akun lewat menu di pojok kanan atas.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={label}>Sektor bisnis</span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as BusinessSector)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              {SECTOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Paket langganan</span>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setPlanPilihan(p.key)}
                  aria-pressed={plan === p.key}
                  className={`relative rounded-xl border-2 px-2.5 py-2 text-left transition-all ${
                    plan === p.key ? "border-primary bg-white shadow-md" : "border-gray-200 bg-white/70 hover:border-gray-300"
                  }`}
                >
                  {plan === p.key && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />}
                  <span className="block text-sm font-semibold text-primary">{PLAN_LABEL[p.key]}</span>
                  <span className="block text-[11px] leading-tight text-gray-500">{p.harga.replace(" / bulan", "/bln")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Email</span>
              <span className="relative">
                <input name="email" type="email" value={email} readOnly aria-readonly className={terkunci} />
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Kata sandi</span>
              <span className="relative">
                <input name="password" type="password" value={KATA_SANDI_DEMO} readOnly aria-readonly className={terkunci} />
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </span>
            </label>
          </div>
          <p className="-mt-1.5 text-xs text-gray-500 [@media(max-height:700px)]:hidden">Akun demo, email dan kata sandi sudah terisi otomatis.</p>

          <button className="btn-gradient h-11 rounded-xl text-base font-bold">Masuk</button>
        </form>
      </div>
    </div>
  );
}
