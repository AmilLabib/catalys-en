import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, PartyPopper } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import type { FeatureKey } from "../config/access";
import Overlay from "../components/Overlay";

// v2: tour adapted to the parent–branch flow, account switching, notifications, and the new reports
const TOUR_KEY = "tour_shown_v2";

type AccountState = { role: "parent" | "branch"; hasBranches: boolean };

type Step = {
  id: string;
  title: string;
  body: string | ((k: AccountState) => string);
  selector?: string;
  path?: string;
  feature?: FeatureKey; // the step only appears if the active account can use the feature
  show?: (k: AccountState) => boolean;
};

const ALL_STEPS: Step[] = [
  {
    id: "sidebar",
    title: "Main Navigation",
    body: "Every module lives in this sidebar. Locked menus can still be clicked: you'll see whether that feature is for the Parent account, Branch accounts, or a specific plan.",
    selector: ".sidebar-root",
    path: "/dashboard",
  },
  {
    id: "account-switcher",
    title: "Accounts & Branches",
    body: (k) =>
      k.role === "branch"
        ? "You're on a branch account. Use this menu to go back to the Parent account or switch to another branch."
        : k.hasBranches
          ? "Switch between the Parent account (head office) and each branch account from this menu. New branches are opened from here too."
          : "Your business has no branches yet, so every feature is open on this account. Open your first branch from this menu anytime.",
    selector: "[data-tour='account-switcher']",
    path: "/dashboard",
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "Low stock, consultation schedules, quotas about to run out, and customer reviews show up here. Click one to jump straight to its page.",
    selector: "[data-tour='notifications']",
    path: "/dashboard",
  },
  {
    id: "home-kpi",
    title: "Performance Summary",
    body: "This year's revenue, net profit, assets, and cash compared with last year.",
    selector: "[data-tour='home-kpi']",
    path: "/dashboard",
  },
  {
    id: "open-branch",
    title: "Ready to Open a Branch?",
    body: "When the first branch is opened, this store automatically becomes the Main Branch with all its data, and the Parent account becomes the head office.",
    selector: "[data-tour='open-branch']",
    path: "/dashboard",
    show: (k) => k.role === "parent" && !k.hasBranches,
  },
  {
    id: "branch-map",
    title: "Branch Map",
    body: "Pillar height shows each branch's share of revenue. Click a pillar or branch card to see its details.",
    selector: "[data-tour='branch-map']",
    path: "/dashboard",
    show: (k) => k.role === "parent" && k.hasBranches,
  },
  {
    id: "cashier-search",
    title: "POS Cashier",
    body: "Search for a product, then click it to add it to the cart. Sales automatically reduce stock and are recorded as journal entries.",
    selector: "input[placeholder='Search products...']",
    path: "/cashier",
    feature: "cashier",
  },
  {
    id: "recording",
    title: "Transaction Recording",
    body: "Scan sales or purchase receipts, or enter manual journals with common transaction templates. Everything goes straight into the reports.",
    selector: "[data-tour='recording']",
    path: "/financial",
    feature: "financialReports",
  },
  {
    id: "report-settings",
    title: "Period & Export",
    body: (k) =>
      `Choose the report date range${k.role === "parent" && k.hasBranches ? " and its entity (consolidated or per branch)" : ""}, then export to Excel or PDF.`,
    selector: "[data-tour='report-settings']",
    path: "/financial",
    feature: "financialReports",
  },
  {
    id: "tab-reports",
    title: "SAK EMKM Reports",
    body: "Switch between the Balance Sheet, Income Statement, Changes in Equity, Cash Flows, and Notes to the Financial Statements, all with prior-period comparisons.",
    selector: "#tab-reports",
    path: "/financial",
    feature: "financialReports",
  },
  {
    id: "charts",
    title: "Chart Analysis",
    body: "Eight charts to read profit trends, expense and asset composition, funding structure, and cash flow.",
    selector: "[data-tour='charts']",
    path: "/financial",
    feature: "financialReports",
  },
  {
    id: "supplier-map",
    title: "Stock & Nearest Suppliers",
    body: "Monitor raw material stock and find suppliers around your store. After shopping, scan the purchase receipt so stock increases automatically.",
    selector: "[data-tour='supplier-map']",
    path: "/internal-management?tab=inventory",
    feature: "internalManagement",
  },
  {
    id: "hr",
    title: "Human Resources",
    body: "Filter employees by work unit, click someone to set their KPIs and salary, then pay out salaries per person.",
    selector: "[data-tour='hr']",
    path: "/internal-management?tab=payroll",
    feature: "internalManagement",
    show: (k) => k.role === "parent",
  },
  {
    id: "audit",
    title: "Data-Driven Audit",
    body: "The system reads your reports, stock, employees, and reviews to find risks along with recommendations.",
    selector: "#audit-summary",
    path: "/data-driven",
    feature: "audit",
  },
];

export default function TourGuide() {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // bumped to recompute the highlight position (after scroll/resize/element appears)
  const [, setTick] = useState(0);
  const navigate = useNavigate();
  const { canUse, role, hasBranches } = useAccount();
  const state: AccountState = { role, hasBranches };
  // Tour steps only for features that are accessible and relevant to the current account
  const STEPS = ALL_STEPS.filter((s) => (!s.feature || canUse(s.feature)) && (!s.show || s.show(state)));

  useEffect(() => {
    try {
      const shown = localStorage.getItem(TOUR_KEY);
      if (!shown) {
        setVisible(true);
        setShowWelcome(true);
      }
    } catch {
      setVisible(true);
      setShowWelcome(true);
    }
  }, []);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  const next = () => setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStepIndex((s) => Math.max(s - 1, 0));

  const saveDontShow = () => {
    if (!dontShowAgain) return;
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // ignore
    }
  };

  const closeAll = () => {
    setVisible(false);
    setShowFinished(false);
  };
  const finish = () => {
    saveDontShow();
    setShowFinished(true);
  };
  const skip = () => {
    saveDontShow();
    setVisible(false);
  };

  // change page, wait for the target element to appear (pages may be lazy-loaded), then scroll to it
  useEffect(() => {
    if (!visible || showWelcome || showFinished || !step) return;
    if (step.path) navigate(step.path);
    const sel = step.selector;
    if (!sel) return;
    let tries = 0;
    const id = setInterval(() => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el || ++tries > 20) {
        clearInterval(id);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setTick((t) => t + 1), 450);
      }
    }, 150);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, visible, showWelcome, showFinished]);

  // the highlight follows the element when the page scrolls or the window resizes
  useEffect(() => {
    if (!visible || showWelcome || showFinished) return;
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
    };
  }, [visible, showWelcome, showFinished]);

  if (!visible || !step) return null;

  const dontShowOption = (
    <label className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={dontShowAgain}
        onChange={(e) => setDontShowAgain(e.target.checked)}
        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
      />
      Don't show again
    </label>
  );

  if (showWelcome) {
    return (
      <Overlay className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
        <div className="absolute inset-0 bg-black/40" />
        <div className="bg-white rounded-2xl p-6 shadow-xl z-10 max-w-sm w-full mx-4 relative">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 chip-gradient rounded-2xl flex items-center justify-center">
              <Rocket className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-primary">Welcome to Catalys</h3>
          <p className="text-gray-600 mb-5 text-center text-sm">
            A quick {STEPS.length}-step tour of the main features of
            {role === "branch" ? " your branch account" : hasBranches ? " your Parent and branch accounts" : " your business"}.
          </p>
          <div className="flex gap-3">
            <button onClick={skip} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Skip
            </button>
            <button
              onClick={() => {
                saveDontShow();
                setStepIndex(0);
                setShowWelcome(false);
              }}
              className="flex-1 px-4 py-2 rounded-xl btn-gradient font-medium"
            >
              Start Tour
            </button>
          </div>
          {dontShowOption}
        </div>
      </Overlay>
    );
  }

  if (showFinished) {
    return (
      <Overlay className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
        <div className="absolute inset-0 bg-black/40" />
        <div className="bg-white rounded-2xl p-6 shadow-xl z-10 max-w-sm w-full mx-4 relative">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 chip-gradient rounded-2xl flex items-center justify-center">
              <PartyPopper className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-primary">Tour Complete</h3>
          <p className="text-gray-600 mb-6 text-center text-sm">
            {role === "parent" && !hasBranches
              ? "Start by recording your first transaction, then open a branch when your business is ready to grow."
              : "Enjoy running your business. Switch accounts anytime from the menu in the top right corner."}
          </p>
          <button onClick={closeAll} className="w-full px-4 py-3 rounded-xl btn-gradient font-medium">
            Start Using the App
          </button>
        </div>
      </Overlay>
    );
  }

  // highlight position of the target element
  let rect: DOMRect | null = null;
  if (step.selector) {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) rect = el.getBoundingClientRect();
  }

  // step card position: below the target if it's in the top half of the screen, otherwise above
  let modalStyle: React.CSSProperties = {
    top: typeof window !== "undefined" ? window.innerHeight - 220 : 0,
    left: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    transform: "translate(-50%, 0)",
  };
  if (rect && typeof window !== "undefined") {
    const modalHeight = 230;
    const above = rect.top < window.innerHeight / 2;
    let top = above ? rect.bottom + 24 : rect.top - modalHeight;
    // clamp so it doesn't leave the screen (especially for screen-tall elements like the sidebar)
    top = Math.max(top, 24);
    top = Math.min(top, window.innerHeight - modalHeight - 24);
    // keep the card on screen whatever the screen width (card width = min(92%, 520px))
    const half = Math.min(window.innerWidth * 0.92, 520) / 2;
    let left = rect.left + rect.width / 2;
    left = Math.max(left, half + 8);
    left = Math.min(left, window.innerWidth - half - 8);
    modalStyle = { top, left, transform: "translate(-50%, 0)" };
  }

  const content = typeof step.body === "function" ? step.body(state) : step.body;

  return (
    <Overlay className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden">
      {!rect && <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />}
      {rect && (
        <div
          className="absolute border-2 border-white rounded-xl pointer-events-none transition-all duration-500 ease-in-out"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(1, 26, 38, 0.55)",
          }}
        />
      )}
      <div className="absolute w-[min(92%,520px)] pointer-events-auto transition-all duration-500 ease-in-out" style={modalStyle}>
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5487ab]">
                Step {stepIndex + 1} of {STEPS.length}
              </p>
              <h4 className="mt-0.5 text-lg font-bold text-primary">{step.title}</h4>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{content}</p>
            </div>
            <button onClick={skip} className="shrink-0 text-sm text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-md">
              Skip
            </button>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            {/* progress dots */}
            <div className="hidden sm:flex gap-1.5">
              {STEPS.map((s, i) => (
                <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-[#c6d8e4]"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={prev}
                disabled={stepIndex === 0}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => (stepIndex === STEPS.length - 1 ? finish() : next())}
                className="px-4 py-2 text-sm font-medium rounded-xl btn-gradient"
              >
                {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
