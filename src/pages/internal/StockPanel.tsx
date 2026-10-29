import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Boxes, Plus, Pencil, Trash2, Search, ShoppingCart, Star, TrendingDown, AlertTriangle, MapPin, Store, ScanLine } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { useRawMaterials } from "../../context/RawMaterialContext";
import { useAccount } from "../../context/AccountContext";
import { useJournal } from "../../context/JournalContext";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useInventory } from "../../context/InventoryContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";
import BrandIcon from "../../components/BrandIcon";
import ReceiptScanner, { type ReceiptScannerHandle } from "../../components/ReceiptScanner";
import type { SupplierPoint } from "../../components/SupplierMap";
import {
  daysLeft,
  mapsLink,
  shopeeLink,
  stockStatus,
  materialSuppliers,
  stockTrend,
  type RawMaterial,
  type MaterialSupplier,
} from "../../data/rawMaterials";
import { formatRp } from "../../data/reports";

const STATUS = {
  "out of stock": { label: "Out of stock", cls: "bg-red-100 text-red-700", bar: "bg-red-500" },
  "running low": { label: "Running low", cls: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  safe: { label: "Safe", cls: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
} as const;

// Leaflet is loaded separately, only when the stock tab is opened
const SupplierMap = lazy(() => import("../../components/SupplierMap"));

const statusOrder = { "out of stock": 0, "running low": 1, safe: 2 };
const num = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });

type MaterialForm = Omit<RawMaterial, "id">;
const EMPTY_MATERIAL: MaterialForm = { name: "", category: "", unit: "kg", stock: 0, minStock: 0, price: 0, dailyUsage: 0 };

export default function StockPanel() {
  const { materials, recipes, addMaterial, updateMaterial, removeMaterial, addStock } = useRawMaterials();
  const { accountCity, role, hasBranches, branchList, activeStore, monitorStore } = useAccount();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { products } = useInventory();
  const { toast } = useToast();
  // suppliers follow the city of the branch currently in use/monitored
  const city = branchList.find((c) => c.name === activeStore)?.city ?? accountCity;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [materialForm, setMaterialForm] = useState<{ id: string | null; data: MaterialForm } | null>(null);
  // stage: confirm the purchase was made -> choose receipt scan, or record manually
  const [buy, setBuy] = useState<{
    material: RawMaterial;
    supplier?: MaterialSupplier;
    qty: number;
    price: number;
    stage: "confirm" | "done" | "manual";
  } | null>(null);
  const scanRef = useRef<ReceiptScannerHandle>(null);
  const [allSuppliers, setAllSuppliers] = useState(false);

  const categoryList = Array.from(new Set(materials.map((m) => m.category)));
  // products that have a recipe, for the "used for product" filter
  const productsWithRecipe = products.filter((p) => (recipes[p.name.toLowerCase()] ?? []).length > 0);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    const productMaterials = productFilter === "all" ? null : new Set((recipes[productFilter] ?? []).map((r) => r.materialId));
    return materials
      .filter((m) => (category === "all" || m.category === category) && m.name.toLowerCase().includes(q))
      .filter((m) => !productMaterials || productMaterials.has(m.id))
      .filter((m) => !lowOnly || stockStatus(m) !== "safe")
      .sort((a, b) => statusOrder[stockStatus(a)] - statusOrder[stockStatus(b)] || daysLeft(a) - daysLeft(b));
  }, [materials, recipes, search, category, productFilter, lowOnly]);

  const lowCount = materials.filter((m) => stockStatus(m) !== "safe").length;
  const totalValue = materials.reduce((s, m) => s + m.stock * m.price, 0);

  // ---------- trend ----------
  const trends = useMemo(() => materials.map((m) => ({ m, ...stockTrend(m) })), [materials]);
  const oftenLow = [...trends].sort((a, b) => b.lowCount - a.lowCount || daysLeft(a.m) - daysLeft(b.m)).slice(0, 4);
  const [trendId, setTrendId] = useState<string | null>(null);
  const activeTrend = trends.find((t) => t.m.id === trendId) ?? oftenLow[0];

  const recordPurchase = () => {
    if (!buy || buy.qty <= 0 || buy.price <= 0) return toast("Enter the purchase quantity and price", "info");
    const total = Math.round(buy.qty * buy.price);
    addStock(buy.material.id, buy.qty, total);
    const id = (code: string) => accounts.find((a) => a.code === code)?.id;
    const inventory = id("1.1.4.01");
    const cash = id("1.1.1.01");
    if (inventory && cash) {
      const now = Date.now();
      setEntries([
        {
          id: `purchase-${now}`,
          date: new Date().toISOString().slice(0, 10),
          description: `Purchase of ${buy.material.name}${buy.supplier ? ` from ${buy.supplier.name}` : ""}`,
          lines: [
            { id: `${now}-1`, side: "debit", accountId: inventory, amount: total },
            { id: `${now}-2`, side: "credit", accountId: cash, amount: total },
          ],
        },
        ...entries,
      ]);
    }
    toast(`${buy.material.name} stock increased by ${num(buy.qty)} ${buy.material.unit}`);
    setBuy(null);
  };

  const select = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white";
  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";
  const shownSuppliers = allSuppliers ? list : list.slice(0, 4);

  // map points: one marker per store, containing every material available there
  const mapPoints = useMemo(() => {
    const m = new Map<string, SupplierPoint>();
    for (const mat of list) {
      for (const sp of materialSuppliers(mat, city)) {
        const t = m.get(sp.name) ?? { supplier: sp, materials: [] };
        if (sp.distanceKm < t.supplier.distanceKm) t.supplier = sp;
        t.materials.push({ material: mat, supplier: sp });
        m.set(sp.name, t);
      }
    }
    return [...m.values()];
  }, [list, city]);

  return (
    <div className="space-y-6">
      {/* The parent account monitors one branch's stock (the head office holds no stock) */}
      {role === "parent" && hasBranches && (
        <section className="card-elegant p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary shrink-0">
            <Store className="w-4 h-4" /> Monitor branch stock
          </div>
          <div className="flex flex-wrap gap-2">
            {branchList.map((c) => (
              <button
                key={c.name}
                onClick={() => monitorStore(c.name)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeStore === c.name ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-[#9cb2c1]"
                }`}
              >
                {c.name.replace(/ Branch$/, "")}
                <span className={`ml-1.5 ${activeStore === c.name ? "text-white/70" : "text-gray-400"}`}>{c.city}</span>
              </button>
            ))}
          </div>
          <p className="sm:ml-auto text-xs text-gray-500">Stock changes here are recorded at the selected branch.</p>
        </section>
      )}

      {/* ---------- Stock list ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Raw Material Stock</h2>
              <p className="text-sm text-gray-500">
                {materials.length} materials · value {formatRp(Math.round(totalValue))} ·{" "}
                <span className={lowCount ? "text-amber-700 font-medium" : ""}>{lowCount} running low</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setMaterialForm({ id: null, data: { ...EMPTY_MATERIAL, category: categoryList[0] ?? "" } })}
            className="inline-flex items-center gap-1.5 rounded-lg btn-gradient px-3 py-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add material
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials..." className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-52" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={select} aria-label="Category">
            <option value="all">All categories</option>
            {categoryList.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={select} aria-label="Used for product">
            <option value="all">Used for all products</option>
            {productsWithRecipe.map((p) => (
              <option key={p.id} value={p.name.toLowerCase()}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Running low only
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4 font-medium">Material</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Runs out in</th>
                <th className="py-2 pr-4 font-medium text-right">Average price</th>
                <th className="py-2 pr-4 font-medium text-right">Stock value</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const st = stockStatus(m);
                const days = daysLeft(m);
                const pct = Math.min(100, (m.stock / Math.max(m.minStock * 2, 0.0001)) * 100);
                return (
                  <tr key={m.id} className={`border-b last:border-0 ${st !== "safe" ? "bg-amber-50/40" : ""}`}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{m.name}</p>
                      <p className="text-[11px] text-gray-500">{m.category}</p>
                    </td>
                    <td className="py-2.5 pr-4 w-48">
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {num(m.stock)} <span className="font-normal text-gray-500">{m.unit}</span>
                      </p>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden" title={`Minimum ${num(m.minStock)} ${m.unit}`}>
                        <div className={`h-full rounded-full ${STATUS[st].bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">min. {num(m.minStock)} {m.unit}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                    </td>
                    <td className={`py-2.5 pr-4 text-right whitespace-nowrap ${days < 4 ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                      {Number.isFinite(days) ? `${Math.max(0, Math.floor(days))} days` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums whitespace-nowrap">
                      {formatRp(m.price)}/{m.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatRp(Math.round(m.stock * m.price))}</td>
                    <td className="py-2.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setBuy({ material: m, qty: Math.max(1, Math.round(m.minStock)), price: m.price, stage: "manual" })}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Buy
                      </button>
                      <button
                        aria-label="Edit material"
                        onClick={() => {
                          const { id, ...data } = m;
                          setMaterialForm({ id, data });
                        }}
                        className="ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        aria-label="Delete material"
                        onClick={() => {
                          if (confirm(`Remove ${m.name} from stock?`)) removeMaterial(m.id);
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                    No materials match the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Suppliers ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nearest Suppliers</h2>
              <p className="text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 inline -mt-0.5" /> Around {city} · 3 options per material, sorted from nearest. Follows the stock list filters.
              </p>
            </div>
          </div>
        </div>
        <div className="mb-6" data-tour="supplier-map">
          <Suspense fallback={<div className="shimmer h-80 rounded-2xl bg-gray-100" />}>
            <SupplierMap
              city={city}
              points={mapPoints}
              onBuy={(m, sp) => setBuy({ material: m, supplier: sp, qty: Math.max(1, Math.round(m.minStock)), price: sp.price, stage: "confirm" })}
            />
          </Suspense>
          <p className="mt-2 text-xs text-gray-500">
            {mapPoints.length} suppliers around {city}. Click a marker to see the available materials. Locations are sample data.
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {shownSuppliers.map((m) => {
              const st = stockStatus(m);
              return (
                <div key={m.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{m.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[st].cls}`}>
                      {num(m.stock)} {m.unit}
                    </span>
                    <a
                      href={shopeeLink(m)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <BrandIcon brand="shopee" size={14} /> Search on Shopee
                    </a>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {materialSuppliers(m, city).map((s) => (
                      <div key={s.name} className="rounded-xl border bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-28 bg-gray-100">
                          <img src={s.photo.src} alt={`${s.type} illustration`} loading="lazy" className="h-full w-full object-cover" />
                          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
                            {s.type}
                          </span>
                          <a
                            href={s.photo.source}
                            target="_blank"
                            rel="noreferrer"
                            title={`Illustrative photo: ${s.photo.author}, ${s.photo.license}, via Wikimedia Commons`}
                            className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-md bg-black/45 px-1.5 py-0.5 text-[9px] text-white/90 hover:bg-black/65"
                          >
                            Photo: {s.photo.author} · {s.photo.license}
                          </a>
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{s.name}</p>
                            <p className="text-[11px] text-gray-500">{s.type}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-base font-bold text-primary">
                          {formatRp(s.price)}
                          <span className="text-xs font-normal text-gray-500">/{m.unit}</span>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {s.distanceKm} km · {s.district} · <Star className="w-3 h-3 inline fill-amber-400 text-amber-400 -mt-0.5" /> {s.rating}
                        </p>
                        <p className="text-[11px] text-gray-400">{s.minOrder}</p>
                        <div className="mt-auto pt-3 flex gap-1.5">
                          <a
                            href={mapsLink(s)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <BrandIcon brand="googlemaps" size={13} /> Maps
                          </a>
                          <button
                            onClick={() => setBuy({ material: m, supplier: s, qty: Math.max(1, Math.round(m.minStock)), price: s.price, stage: "confirm" })}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Buy
                          </button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {list.length > 4 && (
              <button onClick={() => setAllSuppliers((v) => !v)} className="text-sm font-medium text-primary hover:underline">
                {allSuppliers ? "Show only the top 4 materials" : `Show suppliers for ${list.length} materials`}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <ReceiptScanner ref={scanRef} purchaseOnly />
            <p className="text-xs text-gray-500 px-1">
              After shopping at a supplier or on Shopee, snap the receipt here. Items matching a raw material immediately increase stock and the average
              price, which is then used automatically in COGS calculations.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Stock trend ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">12-Week Stock Trend</h2>
              <p className="text-sm text-gray-500">Area = remaining stock, bars = weekly usage, dashed line = minimum level.</p>
            </div>
          </div>
          {activeTrend && (
            <select value={activeTrend.m.id} onChange={(e) => setTrendId(e.target.value)} className={select} aria-label="Select material">
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {activeTrend && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activeTrend.points}>
                  <defs>
                    <linearGradient id="gradStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis width={48} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(v: number, n: string) => [`${num(v)} ${activeTrend.m.unit}`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="used" name="Usage" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
                  <Area type="monotone" dataKey="stock" name="Remaining stock" stroke="#2f6b8f" strokeWidth={2.5} fill="url(#gradStock)" />
                  <ReferenceLine y={activeTrend.m.minStock} stroke="#9cb2c1" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Most often running low
              </h3>
              <ul className="space-y-2">
                {oftenLow.map((t) => (
                  <li key={t.m.id}>
                    <button
                      onClick={() => setTrendId(t.m.id)}
                      className={`w-full text-left rounded-xl border p-3 hover:bg-gray-50 ${activeTrend.m.id === t.m.id ? "border-primary bg-primary/[0.03]" : ""}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{t.m.name}</p>
                      <p className="text-xs text-gray-600">
                        Hit the minimum {t.lowCount}x in 12 weeks · average usage {num(t.m.dailyUsage * 7)} {t.m.unit}/week
                      </p>
                      <p className={`text-xs mt-0.5 ${daysLeft(t.m) < 7 ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        Current stock lasts ±{Math.max(0, Math.floor(daysLeft(t.m)))} days
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              {oftenLow[0] && (
                <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  Tip: raise the minimum level for {oftenLow[0].m.name} to {num(Math.ceil(oftenLow[0].m.dailyUsage * 7))} {oftenLow[0].m.unit} (1 week of
                  usage) and schedule regular purchases so you don't run out during rush hours.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------- add/edit material modal ---------- */}
      <Modal isOpen={!!materialForm} onClose={() => setMaterialForm(null)} title={materialForm?.id ? "Edit Raw Material" : "Add Raw Material"}>
        {materialForm && (
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["name", "Material name", "text", 2],
                ["category", "Category", "text", 1],
                ["unit", "Unit (kg, liter, pcs)", "text", 1],
                ["stock", "Current stock", "number", 1],
                ["minStock", "Running-low threshold", "number", 1],
                ["price", "Purchase price per unit", "number", 1],
                ["dailyUsage", "Average daily usage", "number", 1],
              ] as const
            ).map(([k, label, type, span]) => (
              <label key={k} className={span === 2 ? "col-span-2" : ""}>
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type={type}
                  step="any"
                  min={0}
                  value={materialForm.data[k] as string | number}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, data: { ...materialForm.data, [k]: type === "number" ? Number(e.target.value) : e.target.value } })
                  }
                  className={input}
                />
              </label>
            ))}
            <button
              className="col-span-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                if (!materialForm.data.name.trim()) return toast("Material name is required", "info");
                if (materialForm.id) updateMaterial(materialForm.id, materialForm.data);
                else addMaterial(materialForm.data);
                toast(materialForm.id ? "Material updated" : "Material added");
                setMaterialForm(null);
              }}
            >
              Save
            </button>
          </div>
        )}
      </Modal>

      {/* ---------- buy modal: confirm shopping at the supplier, then scan the receipt ---------- */}
      <Modal isOpen={!!buy} onClose={() => setBuy(null)} title={buy?.stage === "manual" ? `Record purchase of ${buy.material.name}` : `Buy ${buy?.material.name ?? ""}`}>
        {buy && buy.supplier && buy.stage !== "manual" && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border p-3">
              <img src={buy.supplier.photo.src} alt="" className="w-24 h-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-gray-900">{buy.supplier.name}</p>
                <p className="text-xs text-gray-500">
                  {buy.supplier.type} · {buy.supplier.distanceKm} km · {buy.supplier.district}
                </p>
                <p className="mt-1 font-bold text-primary">
                  {formatRp(buy.supplier.price)}
                  <span className="text-xs font-normal text-gray-500">/{buy.material.unit} · {buy.supplier.minOrder}</span>
                </p>
              </div>
            </div>
            <a
              href={mapsLink(buy.supplier)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <BrandIcon brand="googlemaps" size={15} /> Open directions to the store in Google Maps
            </a>

            {buy.stage === "confirm" ? (
              <div className="rounded-2xl bg-primary/5 p-4 text-center">
                <p className="font-semibold text-gray-900">Have you made the purchase?</p>
                <p className="mt-1 text-xs text-gray-500">
                  After shopping, scan the receipt so stock and the purchase journal are recorded automatically.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => setBuy(null)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Not yet, later
                  </button>
                  <button onClick={() => setBuy({ ...buy, stage: "done" })} className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold">
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setBuy(null);
                    scanRef.current?.open("purchase");
                  }}
                  className="btn-gradient w-full rounded-2xl p-4 text-left flex items-center gap-3"
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                    <ScanLine className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block font-bold">Scan Purchase Receipt</span>
                    <span className="block text-xs text-white/75">Snap the receipt from {buy.supplier.name}, stock increases automatically.</span>
                  </span>
                </button>
                <button
                  onClick={() => setBuy({ ...buy, stage: "manual" })}
                  className="w-full text-center text-xs font-medium text-primary hover:underline"
                >
                  No receipt? Record manually
                </button>
              </div>
            )}
          </div>
        )}
        {buy && (!buy.supplier || buy.stage === "manual") && (
          <div className="space-y-4">
            {buy.supplier && (
              <p className="text-sm text-gray-600">
                From <b>{buy.supplier.name}</b> ({buy.supplier.distanceKm} km, {buy.supplier.district})
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="text-sm text-gray-700">Quantity ({buy.material.unit})</span>
                <input type="number" min={0} step="any" value={buy.qty} onChange={(e) => setBuy({ ...buy, qty: Number(e.target.value) })} className={input} />
              </label>
              <label>
                <span className="text-sm text-gray-700">Price per {buy.material.unit}</span>
                <input type="number" min={0} value={buy.price} onChange={(e) => setBuy({ ...buy, price: Number(e.target.value) })} className={input} />
              </label>
            </div>
            <div className="rounded-xl bg-primary/5 p-3 text-sm flex justify-between">
              <span>Total purchase</span>
              <b>{formatRp(Math.round(buy.qty * buy.price))}</b>
            </div>
            <p className="text-xs text-gray-500">
              Stock increases, the average price is updated, and a purchase journal (Inventory / Cash) is recorded automatically.
            </p>
            <div className="flex justify-end gap-2">
              {buy.supplier && (
                <a href={mapsLink(buy.supplier)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm">
                  <BrandIcon brand="googlemaps" size={14} /> Directions to store
                </a>
              )}
              <button onClick={recordPurchase} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
                Record Purchase
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
