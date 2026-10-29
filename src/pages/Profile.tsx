import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User2,
  CreditCard,
  Gauge,
  ShieldCheck,
  Receipt,
  Check,
  Crown,
  Mail,
  Phone,
  MapPin,
  Building2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount, type Profile as ProfileData } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { celebrate } from "../utils/effects";
import { resetDemoData } from "../utils/resetDemo";
import { useJournal } from "../context/JournalContext";
import { useBusinessSector, SECTOR_OPTIONS } from "../context/BusinessSectorContext";
import Modal from "../components/Modal";
import {
  PRICE_NOTE,
  PLANS,
  PLAN_LABEL,
  PLAN_ORDER,
  ROLE_LABEL,
  QUOTA_INFO,
  PERIOD_LABEL,
  type Plan,
  type QuotaKey,
} from "../config/access";

const TABS = [
  { key: "account", label: "Account Information", icon: User2 },
  { key: "plans", label: "Subscription Plans", icon: CreditCard },
  { key: "quota", label: "Quota Usage", icon: Gauge },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "billing", label: "Billing History", icon: Receipt },
  { key: "data", label: "Demo Data", icon: RotateCcw },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const INVOICES = [
  { no: "INV-2026-009", date: "01 Sep 2026", plan: "Pro", amount: "Rp 105.000", status: "Paid" },
  { no: "INV-2026-008", date: "01 Aug 2026", plan: "Pro", amount: "Rp 105.000", status: "Paid" },
  { no: "INV-2026-007", date: "01 Jul 2026", plan: "Free", amount: "Rp 0", status: "Paid" },
];

export default function Profile() {
  usePageTitle("Profile");
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam! : "account";
  const account = useAccount();
  const { profile, role, branch, plan } = account;

  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] p-6 text-white shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-2xl font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{profile.name}</h2>
            <p className="text-white/75 text-sm">
              {profile.position} · {profile.businessName}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {ROLE_LABEL[role]} Account
                {role === "branch" ? ` · ${branch}` : ""}
              </span>
              <span className="rounded-full bg-amber-300 text-amber-950 px-3 py-1 inline-flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> {PLAN_LABEL[plan]} Plan
              </span>
            </div>
          </div>
          {plan !== "business" && (
            <button
              onClick={() => setParams({ tab: "plans" })}
              className="self-start sm:self-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow hover:bg-white/90"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tab navigation */}
        <nav className="card-elegant lg:col-span-3 p-2 h-fit flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setParams({ tab: key })}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-9">
          {tab === "account" && <AccountTab />}
          {tab === "plans" && <PlansTab />}
          {tab === "quota" && <QuotaTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "billing" && <BillingTab />}
          {tab === "data" && <DemoDataTab />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card-elegant p-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountTab() {
  const { profile, updateProfile } = useAccount();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileData>(profile);

  const fields: { key: keyof ProfileData; label: string; icon: typeof Mail; type?: string }[] = [
    { key: "name", label: "Full Name", icon: User2 },
    { key: "position", label: "Position", icon: User2 },
    { key: "email", label: "Email", icon: Mail, type: "email" },
    { key: "phone", label: "Phone Number", icon: Phone },
    { key: "businessName", label: "Business Name", icon: Building2 },
    { key: "address", label: "Business Address", icon: MapPin },
  ];

  return (
    <Card title="Account Information" desc="Update your personal and business details.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile(form);
          toast("Profile saved");
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {fields.map(({ key, label, icon: Icon, type }) => (
          <label key={key} className={`flex flex-col gap-1.5 ${key === "address" ? "md:col-span-2" : ""}`}>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="relative">
              <Icon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </span>
          </label>
        ))}
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setForm(profile)}
            className="rounded-full border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95">
            Save Changes
          </button>
        </div>
      </form>
    </Card>
  );
}

function PlansTab() {
  const { plan, setPlan, role, switchAccount } = useAccount();
  // the subscription applies to the whole business and can only be bought from the parent account
  const canChange = role === "parent";
  const { toast } = useToast();
  const navigate = useNavigate();

  const choose = (p: Plan) => {
    // upgrades are celebrated with confetti
    if (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(plan)) celebrate("big");
    setPlan(p);
    toast(`${PLAN_LABEL[p]} plan active. Features have been updated.`);
    navigate("/dashboard");
  };

  return (
    <Card
      title="Subscription Plans"
      desc={
        canChange
          ? "One subscription for the whole business (parent and all branches). Demo mode: choosing a plan activates it immediately without payment."
          : "Branches use the Parent account's subscription plan."
      }
    >
      {!canChange && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-sm text-gray-700">
            <b className="text-primary">Managed by the Parent account.</b> Only the business owner on the Parent account can buy or change plans.
          </p>
          <button
            onClick={() => {
              switchAccount("parent");
              toast("Now on the Parent account", "info");
            }}
            className="shrink-0 rounded-full btn-gradient px-4 py-2 text-sm font-semibold"
          >
            Switch to Parent account
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const active = p.key === plan;
          const featured = p.key === "business";
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border-2 p-5 transition-shadow hover:shadow-lg ${
                active ? "border-primary bg-primary/[0.03]" : "border-gray-100"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 right-4 rounded-full bg-amber-300 px-3 py-0.5 text-[11px] font-bold text-amber-950">
                  Most Complete
                </span>
              )}
              <h4 className="text-lg font-bold text-primary">{PLAN_LABEL[p.key]}</h4>
              <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{p.description}</p>
              {p.normalPrice && (
                <p className="mt-3 text-xs text-gray-500">
                  <span className="line-through">{p.normalPrice}</span>{" "}
                  <span className="font-semibold text-emerald-700">{PRICE_NOTE}</span>
                </p>
              )}
              <p className={`${p.normalPrice ? "mt-0.5" : "mt-3"} text-xl font-extrabold text-gray-900`}>{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={active || !canChange}
                onClick={() => choose(p.key)}
                className={`mt-5 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  active || !canChange
                    ? "bg-gray-100 text-gray-500 cursor-default"
                    : "bg-primary text-white hover:opacity-95"
                }`}
              >
                {active ? "Current Plan" : canChange ? "Choose Plan" : "Managed by Parent account"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function QuotaTab() {
  const { quotaLimit, quotaRemaining, quotaPeriod, extraSessions } = useAccount();
  const keys: QuotaKey[] = ["receiptScan", "smartPricing", "aiBot", "consultation", "reportExport"];
  return (
    <Card title="Quota Usage" desc="Remaining tokens for limited features on your plan.">
      <div className="space-y-5">
        {keys.map((k) => {
          const limit = quotaLimit(k);
          const remaining = quotaRemaining(k);
          // the bar shows remaining quota: full at the start of the period, shrinking with each use
          const pct = limit ? Math.min(100, ((remaining ?? 0) / limit) * 100) : 0;
          const color =
            limit === null
              ? "bg-emerald-500"
              : remaining === 0
                ? "bg-red-500"
                : remaining! / (limit || 1) < 0.2
                  ? "bg-amber-500"
                  : "bg-primary";
          return (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-800">{QUOTA_INFO[k].label}</span>
                <span className="text-gray-600">
                  {limit === null
                    ? "Unlimited"
                    : limit === 0
                      ? k === "consultation"
                        ? "Buy sessions on the Consultation page"
                        : "Not included in your plan"
                      : `${remaining} of ${limit} left (${PERIOD_LABEL[quotaPeriod(k)]})`}
                </span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: limit === null ? "100%" : `${pct}%` }}
                />
              </div>
              {k === "consultation" && extraSessions > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Includes {extraSessions} purchased extra sessions.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DemoDataTab() {
  const { branchList, plan } = useAccount();
  const { entries } = useJournal();
  const { sector } = useBusinessSector();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showTour, setShowTour] = useState(true);
  const sectorName = SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector;

  const summary: [string, string][] = [
    ["Branches opened", branchList.length ? `${branchList.length} (including the Main Branch)` : "None yet"],
    ["Journals entered", `${entries.length} entries`],
    ["Active plan", PLAN_LABEL[plan]],
    ["Business sector", sectorName],
  ];

  return (
    <Card
      title="Reset Demo Data"
      desc="Return the app to its initial state, e.g. before a presentation. Only data in this browser is deleted."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summary.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <p className="text-xs text-gray-500">{k}</p>
            <p className="font-semibold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">What will be reset:</p>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5">
          <li>Account, plan, quotas, and all branches</li>
          <li>Entered journals and Cashier orders</li>
          <li>Products, stock, raw materials, and recipes</li>
          <li>Chart of Accounts and business sector</li>
          <li>Employees, KPIs, and payroll status</li>
          <li>Loan portfolio and consultation sessions</li>
        </ul>
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showTour}
          onChange={(e) => setShowTour(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary"
        />
        Show the guided tour again after reset
      </label>

      <button
        onClick={() => setConfirmOpen(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Reset demo data
      </button>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Reset demo data?">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="mt-3 text-sm text-gray-600">
            All entered data will be deleted and can't be recovered. The app will reload to the login page.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => resetDemoData({ showTour })} className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold">
              Yes, reset
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function SecurityTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", next: "", repeat: "" });
  const [error, setError] = useState("");
  return (
    <Card title="Security" desc="Change your password regularly to keep your account secure.">
      <form
        className="max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.current || !form.next) return setError("All fields are required.");
          if (form.next.length < 8) return setError("The new password must be at least 8 characters.");
          if (form.next !== form.repeat) return setError("Password confirmation doesn't match.");
          setError("");
          setForm({ current: "", next: "", repeat: "" });
          toast("Password updated");
        }}
      >
        {(
          [
            ["current", "Current Password"],
            ["next", "New Password"],
            ["repeat", "Repeat New Password"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <input
              type="password"
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95">
          Update Password
        </button>
      </form>
    </Card>
  );
}

function BillingTab() {
  return (
    <Card title="Billing History">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4 font-medium">Invoice No.</th>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Plan</th>
              <th className="py-2 pr-4 font-medium text-right">Amount</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((t) => (
              <tr key={t.no} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium text-gray-800">{t.no}</td>
                <td className="py-3 pr-4 text-gray-600">{t.date}</td>
                <td className="py-3 pr-4 text-gray-600">{t.plan}</td>
                <td className="py-3 pr-4 text-right text-gray-800">{t.amount}</td>
                <td className="py-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
