import React, { createContext, useContext, useEffect, useState } from "react";
import {
  BRANCH_LIMIT,
  MAIN_BRANCH,
  FEATURES,
  HEAD_OFFICE,
  QUOTA_LIMITS,
  QUOTA_PERIOD,
  lockedMessage,
  roleMessage,
  planAtLeast,
  type BranchInfo,
  type FeatureKey,
  type QuotaPeriod,
  type Plan,
  type QuotaKey,
  type Role,
} from "../config/access";
import { setBranchList, CONSOLIDATED } from "../data/reports";

// v3: English data model (parent + list of self-opened branches)
const STORAGE_KEY = "catalys_account_v3";

export type Profile = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  position: string;
};

export type ConsultationSession = {
  id: string;
  expert: string;
  topic: string;
  date: string; // YYYY-MM-DD
  time: string;
  mode: "Online" | "In Person";
  notes: string;
  status: "Scheduled" | "Cancelled";
};

type Usage = Record<QuotaKey, number>;

type AccountState = {
  account: string; // "parent" or the name of the branch currently open
  branchList: BranchInfo[];
  businessCity: string; // location of the original store (before and after it becomes the Main Branch)
  monitoredStore: string; // branch whose stock is being monitored from the parent account
  plan: Plan; // one subscription for the whole business, bought by the parent account
  profile: Profile;
  usage: Record<string, Usage>; // total usage, counted per account
  daily: { date: string; usage: Record<string, Usage> }; // today's usage, per account
  extraSessions: number;
  sessions: ConsultationSession[];
};

const INITIAL_USAGE: Usage = { receiptScan: 0, consultation: 0, reportExport: 0, smartPricing: 0, aiBot: 0 };

// local YYYY-MM-DD date, marks the daily quota reset
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT_STATE: AccountState = {
  account: "parent",
  branchList: [],
  businessCity: "Bogor",
  monitoredStore: MAIN_BRANCH,
  plan: "free",
  profile: {
    name: "Amil Labib",
    email: "amil@catalys.id",
    phone: "0812-3456-7890",
    businessName: "Catalys Demo MSME",
    address: "Jl. Pajajaran No. 12, Bogor",
    position: "Business Owner",
  },
  usage: { parent: { ...INITIAL_USAGE, receiptScan: 1 } },
  daily: { date: today(), usage: {} },
  extraSessions: 0,
  sessions: [],
};

export type LockReason = { message: string; kind: "role" | "plan"; requiredRole?: Role };

type AccountCtx = Omit<AccountState, "usage"> & {
  role: Role;
  branch: string; // active branch name ("" on the parent account)
  hasBranches: boolean;
  usage: Usage; // quota usage of the active account
  accountCity: string; // active account's city, for regional prices & suppliers
  ownEntity: string; // active account's report entity
  // store whose operational data (products, stock, raw materials) is being used/viewed
  activeStore: string;
  monitorStore: (name: string) => void;
  // sign in as the business owner (parent account), choosing a plan at the same time
  login: (email: string, plan?: Plan) => void;
  switchAccount: (account: string) => void;
  remainingBranchSlots: () => number | null; // null = unlimited
  openBranch: (c: { name: string; city: string; mainCity?: string }) => { ok: boolean; message?: string };
  setPlan: (plan: Plan) => boolean;
  updateProfile: (p: Partial<Profile>) => void;
  canSee: (f: FeatureKey) => boolean;
  canUse: (f: FeatureKey) => boolean;
  // why a feature can't be used (role first, then plan), null if it can
  lockReason: (f: FeatureKey) => LockReason | null;
  quotaLimit: (q: QuotaKey) => number | null;
  quotaRemaining: (q: QuotaKey) => number | null;
  quotaPeriod: (q: QuotaKey) => QuotaPeriod;
  consumeQuota: (q: QuotaKey, amount?: number) => boolean;
  buyExtraSessions: (count: number) => void;
  scheduleSession: (s: Omit<ConsultationSession, "id" | "status">) => boolean;
  cancelSession: (id: string) => void;
};

const ctx = createContext<AccountCtx | undefined>(undefined);

function loadState(): AccountState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AccountState;
      return { ...DEFAULT_STATE, ...s, profile: { ...DEFAULT_STATE.profile, ...s.profile } };
    }
  } catch {
    // ignore, use default
  }
  return DEFAULT_STATE;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // the branch list is used by the report engine; updated before children render
  setBranchList(state.branchList.map((c) => c.name));

  const hasBranches = state.branchList.length > 0;
  const role: Role = state.account === "parent" ? "parent" : "branch";
  const branch = role === "branch" ? state.account : "";
  const day = today();
  const accountUsage = { ...INITIAL_USAGE, ...state.usage[state.account] };
  const todayUsage = { ...INITIAL_USAGE, ...(state.daily.date === day ? state.daily.usage[state.account] : undefined) };
  const accountCity = role === "branch" ? (state.branchList.find((c) => c.name === branch)?.city ?? state.businessCity) : state.businessCity;
  // without branches, parent = single business (Consolidated contains only the Main Branch)
  const ownEntity = role === "parent" ? CONSOLIDATED : branch;
  // a branch uses its own store; the parent monitors one of the branches (initially: Main Branch)
  const activeStore =
    role === "branch" ? branch : state.branchList.some((c) => c.name === state.monitoredStore) ? state.monitoredStore : MAIN_BRANCH;

  // Business without branches: every role feature is open on the parent account
  const canSee = (f: FeatureKey) => (role === "parent" && !hasBranches) || FEATURES[f].roles.includes(role);
  const canUse = (f: FeatureKey) => canSee(f) && planAtLeast(state.plan, FEATURES[f].minPlan);
  const lockReason = (f: FeatureKey): LockReason | null => {
    if (!canSee(f)) return { message: roleMessage(FEATURES[f].roles), kind: "role", requiredRole: FEATURES[f].roles[0] };
    if (!planAtLeast(state.plan, FEATURES[f].minPlan)) return { message: lockedMessage(FEATURES[f].minPlan), kind: "plan" };
    return null;
  };

  const quotaLimit = (q: QuotaKey) => {
    const base = QUOTA_LIMITS[q][state.plan];
    if (q === "consultation" && base !== null) return base + state.extraSessions;
    return base;
  };

  const quotaPeriod = (q: QuotaKey) => QUOTA_PERIOD[q][state.plan];

  // usage counted against the limit: today for daily quotas, total for the rest
  const used = (q: QuotaKey) => (quotaPeriod(q) === "daily" ? todayUsage : accountUsage)[q];

  const quotaRemaining = (q: QuotaKey) => {
    const limit = quotaLimit(q);
    if (limit === null) return null;
    return Math.max(0, limit - used(q));
  };

  // total and today are recorded together so switching plans still uses the right numbers
  const changeUsage = (s: AccountState, q: QuotaKey, delta: number): AccountState => {
    const date = today();
    const total = { ...INITIAL_USAGE, ...s.usage[s.account] };
    const oldDaily = s.daily.date === date ? s.daily.usage : {};
    const daily = { ...INITIAL_USAGE, ...oldDaily[s.account] };
    return {
      ...s,
      usage: { ...s.usage, [s.account]: { ...total, [q]: Math.max(0, total[q] + delta) } },
      daily: { date, usage: { ...oldDaily, [s.account]: { ...daily, [q]: Math.max(0, daily[q] + delta) } } },
    };
  };

  const consumeQuota = (q: QuotaKey, amount = 1) => {
    const remaining = quotaRemaining(q);
    if (remaining !== null && remaining < amount) return false;
    setState((s) => changeUsage(s, q, amount));
    return true;
  };

  const remainingBranchSlots = () => {
    const limit = BRANCH_LIMIT[state.plan];
    if (limit === null) return null;
    // the Main Branch (original store) isn't counted
    const added = state.branchList.filter((c) => c.name !== MAIN_BRANCH).length;
    return Math.max(0, limit - added);
  };

  const value: AccountCtx = {
    ...state,
    role,
    branch,
    hasBranches,
    usage: accountUsage,
    accountCity,
    ownEntity,
    activeStore,
    monitorStore: (name) => setState((s) => ({ ...s, monitoredStore: name })),
    login: (email, plan) =>
      setState((s) => ({ ...s, account: "parent", plan: plan ?? s.plan, profile: email ? { ...s.profile, email } : s.profile })),
    switchAccount: (account) =>
      setState((s) => (account === "parent" || s.branchList.some((c) => c.name === account) ? { ...s, account } : s)),
    remainingBranchSlots,
    openBranch: ({ name, city, mainCity }) => {
      const n = name.trim();
      if (role !== "parent") return { ok: false, message: "Only the Parent account can open branches" };
      if (!n) return { ok: false, message: "Branch name is required" };
      if ([MAIN_BRANCH, HEAD_OFFICE, CONSOLIDATED].includes(n) || state.branchList.some((c) => c.name.toLowerCase() === n.toLowerCase()))
        return { ok: false, message: "Branch name is already taken" };
      const remaining = remainingBranchSlots();
      if (remaining !== null && remaining <= 0) return { ok: false, message: "Your plan's branch limit has been reached" };
      const date = new Date().toISOString().slice(0, 10);
      setState((s) => {
        // first branch: the original store becomes the Main Branch along with its data
        const main = s.branchList.length ? [] : [{ name: MAIN_BRANCH, city: mainCity ?? s.businessCity, openedAt: date }];
        return {
          ...s,
          businessCity: mainCity ?? s.businessCity,
          branchList: [...s.branchList, ...main, { name: n, city, openedAt: date }],
        };
      });
      return { ok: true };
    },
    setPlan: (plan) => {
      // the subscription can only be changed from the parent account
      if (role !== "parent") return false;
      setState((s) => ({ ...s, plan }));
      return true;
    },
    updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
    canSee,
    canUse,
    lockReason,
    quotaLimit,
    quotaRemaining,
    quotaPeriod,
    consumeQuota,
    buyExtraSessions: (count) => setState((s) => ({ ...s, extraSessions: s.extraSessions + count })),
    scheduleSession: (session) => {
      if (!consumeQuota("consultation")) return false;
      setState((s) => ({
        ...s,
        sessions: [{ ...session, id: `session-${Date.now()}`, status: "Scheduled" }, ...s.sessions],
      }));
      return true;
    },
    cancelSession: (id) =>
      setState((s) => {
        const target = s.sessions.find((x) => x.id === id);
        if (!target || target.status !== "Scheduled") return s;
        // a cancelled session returns the quota
        return {
          ...changeUsage(s, "consultation", -1),
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, status: "Cancelled" } : x)),
        };
      }),
  };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useAccount() {
  const c = useContext(ctx);
  if (!c) throw new Error("useAccount must be used within AccountProvider");
  return c;
}
