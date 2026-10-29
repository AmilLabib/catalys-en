import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Store, Check, ChevronDown, Plus, User2, LogOut, Lock } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useAccess } from "../context/AccessContext";
import { useToast } from "../context/ToastContext";
import { PLAN_LABEL } from "../config/access";

// Top-right dropdown: switch between the Parent account and each branch account,
// open a new branch (parent only), profile, and sign out.
export default function AccountSwitcher() {
  const { profile, role, branch, plan, branchList, hasBranches, switchAccount } = useAccount();
  const { openBranchDialog } = useAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const switchTo = (account: string) => {
    setOpen(false);
    if ((account === "parent" && role === "parent") || account === branch) return;
    switchAccount(account);
    toast(`Now on the ${account === "parent" ? "Parent" : account} account`, "info");
  };

  const accountName = role === "parent" ? (hasBranches ? "Parent Account" : profile.businessName) : branch;
  const item = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? "bg-primary/5 text-primary font-semibold" : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div ref={ref} className="relative" data-tour="account-switcher">
      <button
        onClick={() => setOpen((b) => !b)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-1.5 pr-3 hover:bg-gray-200 transition-colors"
      >
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${role === "parent" ? "bg-primary text-white" : "chip-gradient"}`}>
          {role === "parent" ? initials : <Store className="w-3.5 h-3.5" />}
        </span>
        <span className="hidden md:block leading-tight text-left">
          <span className="block text-xs font-semibold text-gray-800 max-w-[10rem] truncate">{accountName}</span>
          <span className="block text-[11px] text-gray-500">
            {role === "parent" ? (hasBranches ? "Head office" : "Owner") : "Branch account"} · {PLAN_LABEL[plan]}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-500 truncate">{profile.email}</p>
          </div>

          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Switch account</p>
          <button role="menuitem" onClick={() => switchTo("parent")} className={item(role === "parent")}>
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block truncate">{hasBranches ? "Parent Account" : profile.businessName}</span>
              <span className="block text-[11px] font-normal text-gray-500">{hasBranches ? "Head office · all branches" : "Business without branches"}</span>
            </span>
            {role === "parent" && <Check className="w-4 h-4" />}
          </button>
          {branchList.map((c) => (
            <button key={c.name} role="menuitem" onClick={() => switchTo(c.name)} className={item(branch === c.name)}>
              <Store className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate">{c.name}</span>
                <span className="block text-[11px] font-normal text-gray-500">{c.city}</span>
              </span>
              {branch === c.name && <Check className="w-4 h-4" />}
            </button>
          ))}

          {role === "parent" ? (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openBranchDialog();
              }}
              className="mt-1 w-full flex items-center gap-3 rounded-lg border border-dashed border-[#9cb2c1] px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" /> Open New Branch
            </button>
          ) : (
            <p className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
              <Lock className="w-3.5 h-3.5 shrink-0" /> New branches can only be opened from the Parent account
            </p>
          )}

          <div className="my-2 h-px bg-gray-100" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className={item(false)}
          >
            <User2 className="w-4 h-4" /> Profile & subscription
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/");
            }}
            className={item(false)}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
