import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Boxes, Users, Megaphone, Lock, Building2, Crown } from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount } from "../context/AccountContext";
import { useBusinessSector } from "../context/BusinessSectorContext";
import PillTabs from "../components/PillTabs";
import { INTERNAL_TAB_PLAN, PLAN_LABEL, lockedMessage, roleMessage, planAtLeast } from "../config/access";
import InventoryTab from "./internal/InventoryTab";
import PayrollTab from "./internal/PayrollTab";
import MarketingTab from "./internal/MarketingTab";

const ALL_TABS = [
  { key: "inventory", label: "Stock", icon: Boxes },
  { key: "payroll", label: "Human Resources", icon: Users },
  { key: "marketing", label: "Marketing", icon: Megaphone },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

export default function InternalManagement() {
  usePageTitle("Internal Management");
  const { role, plan, switchAccount } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lockedTab, setLockedTab] = useState<TabKey | null>(null);
  const { sector } = useBusinessSector();
  const [params, setParams] = useSearchParams();
  // Branch accounts only manage their own stock; other tabs also unlock gradually per plan
  const roleLocked = (k: TabKey) => role === "branch" && k !== "inventory";
  const tabs = ALL_TABS.map((t) => ({
    ...t,
    locked: roleLocked(t.key)
      ? roleMessage(["parent"])
      : !planAtLeast(plan, INTERNAL_TAB_PLAN[t.key])
        ? lockedMessage(INTERNAL_TAB_PLAN[t.key])
        : undefined,
  }));
  const lockedLabel = ALL_TABS.find((t) => t.key === lockedTab)?.label ?? "";
  const requested = params.get("tab") as TabKey | null;
  const active: TabKey = tabs.some((t) => t.key === requested && !t.locked) ? requested! : "inventory";

  return (
    <div className="max-w-[80rem] mx-auto">
      <p className="text-sm text-gray-600 mb-4">
        Daily business operations: raw material stock and suppliers, human resources and payroll, and monitoring customer reviews on social media and e-commerce.
      </p>
      <PillTabs tabs={tabs} active={active} onChange={(k) => setParams({ tab: k })} onLocked={setLockedTab} className="mb-6" />
      <Modal isOpen={!!lockedTab} onClose={() => setLockedTab(null)} title={lockedLabel}>
        {lockedTab && !roleLocked(lockedTab) ? (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-primary">
              {lockedLabel} isn't included in the {PLAN_LABEL[plan]} plan
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {lockedMessage(INTERNAL_TAB_PLAN[lockedTab])}. Upgrade your subscription to unlock it across the whole business.
            </p>
            <button
              onClick={() => {
                setLockedTab(null);
                navigate("/profile?tab=plans");
              }}
              className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Crown className="w-4 h-4" /> View & Upgrade Plan
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-primary">Parent account feature</h3>
            <p className="mt-1 text-sm text-gray-600">
              Branch accounts only manage their own stock. Human resources and marketing are managed centrally by the Parent account.
            </p>
            <button
              onClick={() => {
                const t = lockedTab;
                setLockedTab(null);
                switchAccount("parent");
                toast("Now on the Parent account", "info");
                if (t) setParams({ tab: t });
              }}
              className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Building2 className="w-4 h-4" /> Switch to Parent account
            </button>
          </div>
        )}
      </Modal>
      {active === "inventory" && <InventoryTab key={sector} />}
      {active === "payroll" && <PayrollTab key={sector} />}
      {active === "marketing" && <MarketingTab />}
    </div>
  );
}
