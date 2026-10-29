import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Store, Building2, ArrowRight, Crown, CheckCircle2, MapPin } from "lucide-react";
import { useAccount } from "./AccountContext";
import { useToast } from "./ToastContext";
import Modal from "../components/Modal";
import { BRANCH_LIMIT, MAIN_BRANCH, FEATURES, PLAN_LABEL, ROLE_LABEL, type FeatureKey } from "../config/access";
import { REGIONS } from "../utils/pricing";
import { celebrate } from "../utils/effects";

// Feature access popup (role/plan) and the open-new-branch dialog, used throughout the app.

type AccessCtx = {
  showAccess: (f: FeatureKey) => void;
  openBranchDialog: () => void;
};

const ctx = createContext<AccessCtx | undefined>(undefined);

// Explanation of a locked feature along with its follow-up button
export function AccessContent({ feature, onDone }: { feature: FeatureKey; onDone?: () => void }) {
  const { role, plan, branchList, lockReason, switchAccount } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  const lock = lockReason(feature);
  const def = FEATURES[feature];
  if (!lock) return null;

  const switchTo = (account: string, destination = def.path) => {
    switchAccount(account);
    toast(`Now on the ${account === "parent" ? "Parent" : account} account`, "info");
    onDone?.();
    navigate(destination);
  };

  const title =
    lock.kind === "role" ? `${ROLE_LABEL[lock.requiredRole ?? "parent"]} account feature` : `${def.label} isn't included in the ${PLAN_LABEL[plan]} plan`;

  return (
    <div className="text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
        {lock.kind === "role" ? <Lock className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
      </div>
      <h3 className="mt-3 text-lg font-bold text-primary">{title}</h3>

      {lock.kind === "role" && lock.requiredRole === "branch" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {def.label} is only available on Branch accounts, because it's used directly for a store's daily operations. Switch to one of the
            branches to open it.
          </p>
          <div className="mt-4 grid gap-2">
            {branchList.map((c) => (
              <button
                key={c.name}
                onClick={() => switchTo(c.name)}
                className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm hover:border-primary hover:bg-primary/5"
              >
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <Store className="w-4 h-4" /> {c.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {c.city} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {lock.kind === "role" && lock.requiredRole === "parent" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {def.label} is only available on the Parent account, because it covers the whole business. Switch to the Parent account to open it.
          </p>
          <button onClick={() => switchTo("parent")} className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Building2 className="w-4 h-4" /> Switch to Parent account
          </button>
        </>
      )}

      {lock.kind === "plan" && role === "parent" && (
        <>
          <p className="mt-1 text-sm text-gray-600">{lock.message}. Upgrade your subscription to unlock it across the whole business.</p>
          <button
            onClick={() => {
              onDone?.();
              navigate("/profile?tab=plans");
            }}
            className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Crown className="w-4 h-4" /> View & Upgrade Plan
          </button>
        </>
      )}

      {lock.kind === "plan" && role === "branch" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {lock.message}. The subscription is managed by the Parent account, so ask the business owner to upgrade.
          </p>
          <button onClick={() => switchTo("parent", "/profile?tab=plans")} className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Building2 className="w-4 h-4" /> Switch to Parent account
          </button>
        </>
      )}
    </div>
  );
}

function OpenBranchDialog({ onClose }: { onClose: () => void }) {
  const { role, plan, hasBranches, businessCity, remainingBranchSlots, openBranch, switchAccount } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState(REGIONS[0].city);
  const [mainCity, setMainCity] = useState(businessCity);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const remaining = remainingBranchSlots();
  const input = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15";

  if (role !== "parent")
    return <p className="text-sm text-gray-600 text-center">Only the Parent account can open new branches.</p>;

  if (opened)
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto w-12 h-12 text-primary" />
        <h3 className="mt-2 text-lg font-bold text-primary">{opened} opened successfully</h3>
        <p className="mt-1 text-sm text-gray-600">Sample branch data is ready. Switch accounts anytime from the menu in the top right corner.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Stay on Parent
          </button>
          <button
            onClick={() => {
              switchAccount(opened);
              toast(`Now on the ${opened} account`, "info");
              onClose();
              navigate("/dashboard");
            }}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Go to {opened.replace(/ Branch$/, "")}
          </button>
        </div>
      </div>
    );

  if (remaining !== null && remaining <= 0)
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
          <Crown className="w-6 h-6" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-primary">{PLAN_LABEL[plan]} plan branch limit reached</h3>
        <p className="mt-1 text-sm text-gray-600">
          {BRANCH_LIMIT[plan] === 0
            ? "The Free plan doesn't include opening branches."
            : `The ${PLAN_LABEL[plan]} plan allows up to ${(BRANCH_LIMIT[plan] ?? 0) + 1} branches (${MAIN_BRANCH} + ${BRANCH_LIMIT[plan]} new branches).`}{" "}
          Upgrade your plan to add more branches (Pro: up to 3 branches, Business: unlimited).
        </p>
        <button
          onClick={() => {
            onClose();
            navigate("/profile?tab=plans");
          }}
          className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Crown className="w-4 h-4" /> View & Upgrade Plan
        </button>
      </div>
    );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const full = name.trim() ? `${name.trim().replace(/\s+branch$/i, "")} Branch` : "";
    const result = openBranch({ name: full, city, mainCity: hasBranches ? undefined : mainCity });
    if (!result.ok) return setError(result.message ?? "Failed to open branch");
    celebrate();
    setOpened(full);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {!hasBranches && (
        <div className="rounded-xl bg-primary/5 p-3 text-sm text-gray-700">
          <p className="font-semibold text-primary">This is your first branch</p>
          <p className="mt-1">
            Your existing store will automatically become the <b>{MAIN_BRANCH}</b> along with all its data (transactions, stock, employees). The
            Parent account becomes the head office that monitors every branch.
          </p>
          <label className="mt-3 block text-xs text-gray-500">
            {MAIN_BRANCH} location
            <select value={mainCity} onChange={(e) => setMainCity(e.target.value)} className={input}>
              {REGIONS.map((r) => (
                <option key={r.city}>{r.city}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label className="block text-sm font-medium text-gray-700">
        New branch name
        <span className="mt-1 flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/15">
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Bandung Dago"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          />
          <span className="pr-3 text-sm text-gray-400">Branch</span>
        </span>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> City
        </span>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={input}>
          {REGIONS.map((r) => (
            <option key={r.city} value={r.city}>
              {r.city}, {r.province}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm font-medium text-primary">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {remaining === null ? `${PLAN_LABEL[plan]} plan: unlimited branches` : `${PLAN_LABEL[plan]} plan branch slots left: ${remaining}`}
        </p>
        <button className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold">Open Branch</button>
      </div>
    </form>
  );
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = useState<FeatureKey | null>(null);
  const [branchDialog, setBranchDialog] = useState(false);
  return (
    <ctx.Provider value={{ showAccess: setFeature, openBranchDialog: () => setBranchDialog(true) }}>
      {children}
      <Modal isOpen={!!feature} onClose={() => setFeature(null)} title={feature ? FEATURES[feature].label : ""}>
        {feature && <AccessContent feature={feature} onDone={() => setFeature(null)} />}
      </Modal>
      <Modal isOpen={branchDialog} onClose={() => setBranchDialog(false)} title="Open New Branch">
        {branchDialog && <OpenBranchDialog onClose={() => setBranchDialog(false)} />}
      </Modal>
    </ctx.Provider>
  );
}

export function useAccess() {
  const c = useContext(ctx);
  if (!c) throw new Error("useAccess must be used within AccessProvider");
  return c;
}
