import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Check } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { SECTOR_OPTIONS, useBusinessSector, type BusinessSector } from "../context/BusinessSectorContext";
import { PLANS, PLAN_LABEL, type Plan } from "../config/access";
import { useCursorEffect } from "../hooks/useCursorEffect";
import { canRender3D, ErrorBoundary3D } from "../components/three/support";

// three.js is loaded separately so it doesn't weigh down the main bundle
const LogoCatalys3D = lazy(() => import("../components/three/LogoCatalys3D"));

// Business owner demo account: email and password are pre-filled and can't be changed.
// Users always sign in to the parent account; branch accounts are opened via the switch-account menu.
const DEMO_PASSWORD = "catalysdemo";
const DEMO_EMAIL = "owner@catalys.id";

export default function Login() {
  const navigate = useNavigate();
  useCursorEffect();
  const { sector, setSector } = useBusinessSector();
  const { login, plan: savedPlan } = useAccount();
  const [plan, setSelectedPlan] = useState<Plan>(savedPlan);
  const email = DEMO_EMAIL;

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, plan);
    navigate("/dashboard");
  };

  const [use3D] = useState(canRender3D);
  const staticLogo = (
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
  const locked = "h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-9 text-sm text-gray-600 cursor-not-allowed focus:outline-none";

  return (
    // Exactly one screen (100vw × 100dvh) with no scroll: two columns on wide screens, one compact column on phones
    <div className="login-bg relative flex h-[100dvh] w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="login-blob login-blob-a" />
      <div className="login-blob login-blob-b" />
      <div className="relative grid w-full max-w-5xl items-center gap-3 sm:gap-5 lg:grid-cols-2 lg:gap-12">
        {/* Branding column */}
        <div className="flex flex-col items-center">
          {use3D ? (
            <ErrorBoundary3D fallback={staticLogo}>
              <Suspense fallback={<div className="h-32 w-48 sm:h-44 sm:w-64 lg:h-72 lg:w-96" />}>
                <div className="relative flex flex-col items-center">
                  <div
                    className="h-32 w-48 sm:h-44 sm:w-64 lg:h-72 lg:w-96 [@media(max-height:700px)]:h-28 [@media(max-height:700px)]:w-44"
                    role="img"
                    aria-label="Catalys emblem"
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
            </ErrorBoundary3D>
          ) : (
            staticLogo
          )}
          <p className="login-item mt-5 hidden max-w-sm text-center text-sm text-gray-600 lg:block" style={{ animationDelay: "0.75s" }}>
            Record transactions, prepare SAK EMKM reports, and grow your business from one store to many branches.
          </p>
        </div>

        {/* Form column */}
        <form
          onSubmit={signIn}
          className="login-item card-elegant mx-auto flex w-full max-w-md flex-col gap-3.5 p-5 sm:gap-4 sm:p-6"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="rounded-xl bg-primary/5 px-3.5 py-2.5 text-sm text-gray-600 [@media(max-height:700px)]:hidden">
            <p className="font-semibold text-primary">Sign in as the business owner</p>
            <p className="mt-0.5 text-xs">Parent account. After opening branches, switch accounts from the menu in the top right corner.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={label}>Business sector</span>
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
            <span className={label}>Subscription plan</span>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setSelectedPlan(p.key)}
                  aria-pressed={plan === p.key}
                  className={`relative rounded-xl border-2 px-2.5 py-2 text-left transition-all ${
                    plan === p.key ? "border-primary bg-white shadow-md" : "border-gray-200 bg-white/70 hover:border-gray-300"
                  }`}
                >
                  {plan === p.key && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />}
                  <span className="block text-sm font-semibold text-primary">{PLAN_LABEL[p.key]}</span>
                  <span className="block text-[11px] leading-tight text-gray-500">{p.price.replace(" / month", "/mo")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Email</span>
              <span className="relative">
                <input name="email" type="email" value={email} readOnly aria-readonly className={locked} />
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Password</span>
              <span className="relative">
                <input name="password" type="password" value={DEMO_PASSWORD} readOnly aria-readonly className={locked} />
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </span>
            </label>
          </div>
          <p className="-mt-1.5 text-xs text-gray-500 [@media(max-height:700px)]:hidden">Demo account, the email and password are filled in automatically.</p>

          <button className="btn-gradient h-11 rounded-xl text-base font-bold">Sign In</button>
        </form>
      </div>
    </div>
  );
}
