// Feature access rules: account role (parent/branch) and subscription plan.
// A business without branches uses every feature from the parent account.
// Once a branch is opened, features are split by role. Every menu stays visible;
// features outside the role or plan show a warning popup when opened.

export type Role = "parent" | "branch";
export type Plan = "free" | "pro" | "business";

export type FeatureKey =
  | "home"
  | "cashier"
  | "smartPricing"
  | "chartOfAccounts"
  | "financialReports"
  | "journal"
  | "internalManagement"
  | "audit"
  | "consultation"
  | "msmeGrowth"
  | "funding"
  | "profile";

export type FeatureDef = {
  label: string;
  path: string;
  minPlan: Plan;
  roles: Role[];
};

export const PLAN_ORDER: Plan[] = ["free", "pro", "business"];

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

export const ROLE_LABEL: Record<Role, string> = {
  parent: "Parent",
  branch: "Branch",
};

const BOTH: Role[] = ["parent", "branch"];

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  home: { label: "Home", path: "/dashboard", minPlan: "free", roles: BOTH },
  cashier: { label: "POS Cashier", path: "/cashier", minPlan: "free", roles: ["branch"] },
  smartPricing: { label: "Smart Pricing", path: "/smart-pricing", minPlan: "pro", roles: ["branch"] },
  chartOfAccounts: { label: "Chart of Accounts", path: "/chart-of-accounts", minPlan: "free", roles: ["branch"] },
  financialReports: { label: "Financial Reports", path: "/financial", minPlan: "free", roles: BOTH },
  journal: { label: "Journal Entries", path: "/journal", minPlan: "free", roles: BOTH },
  // tabs inside are locked per plan, see INTERNAL_TAB_PLAN
  internalManagement: { label: "Internal Management", path: "/internal-management", minPlan: "free", roles: BOTH },
  audit: { label: "Data-Driven Audit", path: "/data-driven", minPlan: "pro", roles: ["parent"] },
  // consultation sessions are sold separately on every plan; Business gets 1 free session
  consultation: { label: "Consultation", path: "/consultation", minPlan: "free", roles: ["parent"] },
  msmeGrowth: { label: "MSME Growth", path: "/msme-growth", minPlan: "free", roles: ["parent"] },
  funding: { label: "Funding", path: "/funding", minPlan: "free", roles: ["parent"] },
  profile: { label: "Profile", path: "/profile", minPlan: "free", roles: BOTH },
};

export function planAtLeast(plan: Plan, min: Plan) {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

export function roleMessage(roles: Role[]) {
  return `Only available on the ${roles.map((r) => ROLE_LABEL[r]).join(" and ")} account`;
}

export function lockedMessage(min: Plan) {
  return min === "pro"
    ? "Only available on the Pro and Business plans"
    : `Only available on the ${PLAN_LABEL[min]} plan`;
}

// Internal Management tabs unlocked by each plan
export type InternalTab = "inventory" | "payroll" | "marketing";
export const INTERNAL_TAB_PLAN: Record<InternalTab, Plan> = {
  inventory: "free",
  payroll: "pro",
  marketing: "business",
};

// Usage quota per plan. null = unlimited.
export type QuotaKey = "receiptScan" | "consultation" | "reportExport" | "smartPricing" | "aiBot";

export const QUOTA_LIMITS: Record<QuotaKey, Record<Plan, number | null>> = {
  receiptScan: { free: 3, pro: 8, business: 20 },
  consultation: { free: 0, pro: 0, business: 1 },
  reportExport: { free: 3, pro: null, business: null },
  smartPricing: { free: 0, pro: 3, business: 5 },
  aiBot: { free: 2, pro: 20, business: null },
};

// "daily" quotas refill every day; "total" quotas are one-time
// (a trial allowance on the Free plan; consultation sessions can be topped up by purchase).
export type QuotaPeriod = "daily" | "total";

export const QUOTA_PERIOD: Record<QuotaKey, Record<Plan, QuotaPeriod>> = {
  receiptScan: { free: "total", pro: "daily", business: "daily" },
  consultation: { free: "total", pro: "total", business: "total" },
  reportExport: { free: "total", pro: "total", business: "total" },
  smartPricing: { free: "total", pro: "daily", business: "daily" },
  aiBot: { free: "total", pro: "daily", business: "daily" },
};

export const PERIOD_LABEL: Record<QuotaPeriod, string> = { daily: "today", total: "total" };

export const QUOTA_INFO: Record<QuotaKey, { label: string }> = {
  receiptScan: { label: "Receipt Scan" },
  consultation: { label: "Consultation Session" },
  reportExport: { label: "Report Export" },
  smartPricing: { label: "Smart Pricing Search" },
  aiBot: { label: "AI Bot Message" },
};

// Message shown when a quota runs out, based on the active period and plan
export function quotaExhaustedMessage(q: QuotaKey, plan: Plan) {
  const label = QUOTA_INFO[q].label;
  if (QUOTA_PERIOD[q][plan] === "daily")
    return `Today's ${label} quota is used up and refills tomorrow.${plan === "business" ? "" : " Upgrade to the Business plan for a larger quota."}`;
  return `The ${PLAN_LABEL[plan]} plan's ${label} quota is used up. Upgrade to the Pro plan for a daily quota.`;
}

// 2027 introductory pricing (30% off); regular pricing applies from 2028
export const PRICE_NOTE = "2027 introductory price, 30% off";

// Extra consultation sessions, sold separately from plans
export const SESSION_PACK = { count: 2, price: "Rp 249.000" };

export type PlanDef = {
  key: Plan;
  price: string;
  normalPrice?: string;
  description: string;
  features: string[];
};

export const PLANS: PlanDef[] = [
  {
    key: "free",
    price: "Rp 0",
    description: "Core features to start recording your business.",
    features: [
      "POS Cashier, Chart of Accounts, and Journal Entries",
      "Internal Management: Stock",
      "Financial Reports (3 receipt scans, 3 exports)",
      "MSME Growth and Funding (launching 2028)",
      "AI Bot 2x",
      "Consultation sessions sold separately",
    ],
  },
  {
    key: "pro",
    price: "Rp 105.000 / month",
    normalPrice: "Rp 150.000",
    description: "For businesses that need daily automation and data analysis.",
    features: [
      "Everything in Free",
      "Smart Pricing 3x per day (launching 2028)",
      "Internal Management: Stock & Human Resources",
      "8 receipt scans per day, unlimited exports",
      "Data-Driven Audit (launching 2028)",
      "Up to 3 branches",
      "AI Bot 20x per day",
      "Consultation sessions sold separately",
    ],
  },
  {
    key: "business",
    price: "Rp 245.000 / month",
    normalPrice: "Rp 350.000",
    description: "The complete plan with marketing, consultation, and unlimited branches.",
    features: [
      "Everything in Pro",
      "Smart Pricing 5x per day (launching 2028)",
      "Internal Management: Stock, Human Resources & Marketing",
      "20 receipt scans per day",
      "1 free consultation session",
      "Unlimited branches",
      "Unlimited AI Bot",
    ],
  },
];

// ---------- Branches ----------

// The original store automatically becomes this branch when the business opens its first branch
export const MAIN_BRANCH = "Main Branch";
export const HEAD_OFFICE = "Head Office";

// Number of new branches that may be opened (besides the Main Branch). null = unlimited.
// Pro: 3 branches total = Main Branch + 2 new branches
export const BRANCH_LIMIT: Record<Plan, number | null> = { free: 0, pro: 2, business: null };

export type BranchInfo = { name: string; city: string; openedAt: string };
