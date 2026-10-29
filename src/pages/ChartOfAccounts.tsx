import { useMemo, useState } from "react";
import { useChartOfAccounts, type AccountType } from "../context/ChartOfAccountsContext";
import AccountEditModal from "../components/AccountEditModal";
import AccountInfoModal, { InfoButton, type AccountInfo } from "../components/AccountInfoModal";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { getAccountDetails } from "../utils/accountInfo";

// Distinguishing color for each account category
const CATEGORIES: Record<
  AccountType,
  { label: string; desc: string; dot: string; chip: string; border: string; head: string; code: string }
> = {
  asset: {
    label: "Assets",
    desc: "Property owned by the business",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 ring-blue-200",
    border: "border-l-blue-500",
    head: "from-blue-50",
    code: "bg-blue-100 text-blue-800",
  },
  liability: {
    label: "Liabilities",
    desc: "Debts and obligations",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    border: "border-l-amber-500",
    head: "from-amber-50",
    code: "bg-amber-100 text-amber-800",
  },
  equity: {
    label: "Equity",
    desc: "Owner capital and retained earnings",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    border: "border-l-violet-500",
    head: "from-violet-50",
    code: "bg-violet-100 text-violet-800",
  },
  revenue: {
    label: "Revenue",
    desc: "Sales and other income",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    border: "border-l-emerald-500",
    head: "from-emerald-50",
    code: "bg-emerald-100 text-emerald-800",
  },
  expense: {
    label: "Expenses",
    desc: "COGS, operating expenses, and other expenses",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    border: "border-l-rose-500",
    head: "from-rose-50",
    code: "bg-rose-100 text-rose-800",
  },
  distribution: {
    label: "Distribution / Drawings",
    desc: "Withdrawals by the owner",
    dot: "bg-slate-500",
    chip: "bg-slate-50 text-slate-700 ring-slate-200",
    border: "border-l-slate-500",
    head: "from-slate-50",
    code: "bg-slate-100 text-slate-800",
  },
};

const ORDER: AccountType[] = ["asset", "liability", "equity", "revenue", "expense", "distribution"];

export default function ChartOfAccounts() {
  usePageTitle("Chart of Accounts");
  const { accounts, addAccount, updateAccount, deleteAccount } = useChartOfAccounts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalInitial, setModalInitial] = useState<any | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<AccountType | "all">("all");
  const [infoAccount, setInfoAccount] = useState<AccountInfo | undefined>(undefined);

  const openAddModal = () => {
    setEditingId(null);
    setModalInitial({ code: "", name: "", type: filter === "all" ? "asset" : filter, description: "" });
    setModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return;
    setEditingId(id);
    setModalInitial({
      code: a.code,
      name: a.name,
      type: a.type,
      targetKind: a.target.kind,
      targetField: a.target.field,
      description: a.description || "",
    });
    setModalOpen(true);
  };

  const handleModalSubmit = (data: any) => {
    const payload = {
      code: data.code,
      name: data.name,
      type: data.type,
      target: data.target,
      description: data.description,
    };
    if (editingId) updateAccount(editingId, payload);
    else addAccount(payload);
  };

  const groups = useMemo(() => {
    const map = Object.fromEntries(ORDER.map((t) => [t, [] as typeof accounts])) as Record<
      AccountType,
      typeof accounts
    >;
    const q = searchQuery.toLowerCase();
    for (const a of accounts) {
      const matches =
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        CATEGORIES[a.type].label.toLowerCase().includes(q);
      if (matches) map[a.type].push(a);
    }
    return map;
  }, [accounts, searchQuery]);

  const shown = ORDER.filter((t) => filter === "all" || filter === t);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Chart of Accounts</h2>
          <p className="text-sm text-gray-500">{accounts.length} accounts, grouped and color-coded by category.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search code, name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
            />
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 whitespace-nowrap font-medium"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Color legend that doubles as a filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
            filter === "all" ? "bg-primary text-white ring-primary" : "bg-white text-gray-700 ring-gray-200"
          }`}
        >
          All
        </button>
        {ORDER.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
              filter === t ? CATEGORIES[t].chip + " ring-2" : "bg-white text-gray-700 ring-gray-200"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${CATEGORIES[t].dot}`} />
            {CATEGORIES[t].label}
            <span className="text-gray-400">{groups[t].length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {shown.map((t) => {
          const k = CATEGORIES[t];
          if (searchQuery && groups[t].length === 0) return null;
          return (
            <section key={t} className={`card-elegant border-l-4 ${k.border} overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${k.head} to-white`}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${k.dot}`} />
                  <h3 className="font-semibold text-gray-900">{k.label}</h3>
                  <span className="hidden sm:inline text-xs text-gray-500">· {k.desc}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${k.chip}`}>{groups[t].length} accounts</span>
              </div>
              <div className="p-3 space-y-2">
                {groups[t].map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 font-mono text-xs font-semibold px-2 py-1 rounded-md ${k.code}`}>{a.code}</span>
                      <span className="font-medium text-gray-900 truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <InfoButton
                        onClick={() => {
                          const details = getAccountDetails(a.code, a.name, a.type);
                          setInfoAccount({
                            code: a.code,
                            name: a.name,
                            description: details.description,
                            example: details.example,
                            normalBalance: a.description?.startsWith("Normal:") ? a.description : undefined,
                          });
                        }}
                      />
                      <button
                        onClick={() => openEditModal(a.id)}
                        aria-label="Edit account"
                        title="Edit"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete account ${a.code} — ${a.name}?`)) deleteAccount(a.id);
                        }}
                        aria-label="Delete account"
                        title="Delete"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {groups[t].length === 0 && (
                  <div className="text-sm text-gray-500 italic px-2 py-1">
                    {searchQuery ? "No matching accounts." : "No accounts in this category yet."}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AccountEditModal
        visible={modalOpen}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
      <AccountInfoModal visible={!!infoAccount} account={infoAccount} onClose={() => setInfoAccount(undefined)} />
    </div>
  );
}
