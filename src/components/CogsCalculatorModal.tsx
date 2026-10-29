import { useMemo, useState } from "react";
import { X, Plus, Trash2, Calculator, Search, Boxes } from "lucide-react";
import { useRawMaterials } from "../context/RawMaterialContext";
import type { RecipeItem } from "../data/rawMaterials";
import Overlay from "../components/Overlay";

type Row = { id: string; label: string; amount: number };
type Mode = "producer" | "reseller";
type Selection = { active: boolean; value: number; unit: "qty" | "rp" };

const newRow = (label: string): Row => ({
  id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  label,
  amount: 0,
});

const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Math.round(v));

// Per-unit COGS builder popup using the full costing method:
//   Producer : (raw materials from stock + other materials + direct labor + overhead) / units
//   Reseller : (purchase price + shipping + other acquisition costs) / units
// The selected raw materials are also returned as a per-unit product recipe.
export default function CogsCalculatorModal({
  open,
  onClose,
  onApply,
  productName,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (cogsPerUnit: number, recipe?: RecipeItem[]) => void;
  productName?: string;
}) {
  const { materials, productRecipe } = useRawMaterials();
  const existingRecipe = productName ? productRecipe(productName) : [];

  const [mode, setMode] = useState<Mode>("producer");
  const [units, setUnits] = useState(1);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Record<string, Selection>>(() =>
    Object.fromEntries(existingRecipe.map((r) => [r.materialId, { active: true, value: r.qty, unit: "qty" as const }])),
  );
  const [otherMaterials, setOtherMaterials] = useState<Row[]>([]);
  const [labor, setLabor] = useState(0);
  const [overhead, setOverhead] = useState<Row[]>([newRow("Production electricity & gas")]);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [other, setOther] = useState<Row[]>([]);

  const sumRows = (xs: Row[]) => xs.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  // cost of each selected material
  const materialCosts = useMemo(
    () =>
      materials
        .filter((m) => selection[m.id]?.active)
        .map((m) => {
          const p = selection[m.id];
          const value = Number(p.value) || 0;
          const cost = p.unit === "rp" ? value : value * m.price;
          const qty = p.unit === "rp" ? (m.price ? value / m.price : 0) : value;
          return { m, cost, qty };
        }),
    [materials, selection],
  );
  const totalMaterials = materialCosts.reduce((s, x) => s + x.cost, 0);

  const total =
    mode === "producer"
      ? totalMaterials + sumRows(otherMaterials) + (Number(labor) || 0) + sumRows(overhead)
      : (Number(purchasePrice) || 0) + (Number(shipping) || 0) + sumRows(other);
  const perUnit = units > 0 ? total / units : 0;

  if (!open) return null;

  const updateSelection = (id: string, p: Partial<Selection>) =>
    setSelection((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { active: false, value: 0, unit: "qty" }), ...p } }));

  const rowList = (title: string, rows: Row[], set: React.Dispatch<React.SetStateAction<Row[]>>, newLabel: string) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <button type="button" onClick={() => set((p) => [...p, newRow(newLabel)])} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add row
        </button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-gray-400">No rows yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => set((p) => p.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={r.amount || ""}
              placeholder="Rp"
              onChange={(e) => set((p) => p.map((x) => (x.id === r.id ? { ...x, amount: Number(e.target.value) } : x)))}
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm text-right"
            />
            <button type="button" aria-label="Remove row" onClick={() => set((p) => p.filter((x) => x.id !== r.id))} className="p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const numberField = (label: string, value: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input type="number" min={0} value={value || ""} placeholder="0" onChange={(e) => set(Number(e.target.value))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </label>
  );

  const filtered = materials.filter((m) => (m.name + " " + m.category).toLowerCase().includes(search.toLowerCase()));

  return (
    <Overlay className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-gray-800">COGS Builder</h3>
              {productName && <p className="text-xs text-gray-500">{productName}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(
              [
                ["producer", "Producer (makes it yourself)"],
                ["reseller", "Reseller (buys finished goods)"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium ${mode === k ? "bg-white shadow text-primary" : "text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {numberField(mode === "producer" ? "Units produced" : "Units purchased", units, setUnits)}

          {mode === "producer" ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-primary" /> Raw materials from stock
                  </p>
                  <span className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" className="w-40 rounded-lg border border-gray-200 pl-8 pr-2 py-1.5 text-xs" />
                  </span>
                </div>
                <div className="rounded-xl border divide-y max-h-64 overflow-y-auto">
                  {filtered.length === 0 && <p className="p-3 text-xs text-gray-400">No raw materials in stock yet.</p>}
                  {filtered.map((m) => {
                    const p = selection[m.id];
                    const active = !!p?.active;
                    const cost = materialCosts.find((x) => x.m.id === m.id)?.cost ?? 0;
                    return (
                      <div key={m.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${active ? "bg-primary/[0.03]" : ""}`}>
                        <label className="flex items-center gap-2 flex-1 min-w-[160px] cursor-pointer">
                          <input type="checkbox" checked={active} onChange={(e) => updateSelection(m.id, { active: e.target.checked })} />
                          <span>
                            <span className="block text-sm text-gray-800">{m.name}</span>
                            <span className="block text-[11px] text-gray-500">
                              {rupiah(m.price)}/{m.unit} · stock {m.stock} {m.unit}
                            </span>
                          </span>
                        </label>
                        {active && (
                          <>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={p.value || ""}
                              placeholder="0"
                              onChange={(e) => updateSelection(m.id, { value: Number(e.target.value) })}
                              className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                              aria-label={`Amount of ${m.name}`}
                            />
                            <div className="flex rounded-lg bg-gray-100 p-0.5 text-[11px] font-medium">
                              {(["qty", "rp"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateSelection(m.id, { unit: s, value: 0 })}
                                  className={`rounded-md px-2 py-1 ${p.unit === s ? "bg-white shadow text-primary" : "text-gray-500"}`}
                                >
                                  {s === "qty" ? m.unit : "Rp"}
                                </button>
                              ))}
                            </div>
                            <span className="w-24 text-right text-xs font-semibold text-gray-700">{rupiah(cost)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-right text-xs text-gray-600">Total raw materials {rupiah(totalMaterials)}</p>
              </div>
              {rowList("Other materials not in stock", otherMaterials, setOtherMaterials, "Other material")}
              {numberField("Direct labor (total)", labor, setLabor)}
              {rowList("Production overhead", overhead, setOverhead, "Overhead")}
            </>
          ) : (
            <>
              {numberField("Purchase price of goods (total)", purchasePrice, setPurchasePrice)}
              {numberField("Purchase shipping / freight", shipping, setShipping)}
              {rowList("Other acquisition costs", other, setOther, "Other cost")}
            </>
          )}

          <div className="rounded-xl bg-primary/5 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Total production / acquisition cost</span>
              <span className="font-semibold">{rupiah(total)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-gray-800">COGS per unit</span>
              <span className="font-bold text-primary">{rupiah(perUnit)}</span>
            </div>
            <p className="text-[11px] text-gray-500 pt-1">
              Full costing method per SAK EMKM. The selected raw materials are saved as the product recipe, so Cashier sales automatically reduce inventory stock.
            </p>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={perUnit <= 0}
            onClick={() => {
              const recipe =
                mode === "producer" && units > 0
                  ? materialCosts.filter((x) => x.qty > 0).map((x) => ({ materialId: x.m.id, qty: Math.round((x.qty / units) * 10000) / 10000 }))
                  : undefined;
              onApply(Math.round(perUnit), recipe);
              onClose();
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Use this COGS
          </button>
        </div>
      </div>
    </Overlay>
  );
}
