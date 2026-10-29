import { useMemo, useState } from "react";
import {
  fetchMarketPricing,
  roundPrice,
  summarizeMarket,
  findRegion,
  REGIONS,
  type MarketPricing,
  type Competitor,
} from "../utils/pricing";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import QuotaBadge from "./QuotaBadge";
import { quotaExhaustedMessage } from "../config/access";
import BrandIcon, { type Brand } from "./BrandIcon";
import { usePageTitle } from "../hooks/usePageTitle";
import { useInventory } from "../context/InventoryContext";
import { Search, Sparkles, Store, Star, Lightbulb, TrendingUp, Target, Scale, Package, MapPin } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import ProductImage from "./ProductImage";
import { formatRp } from "../data/reports";

type Scenario = "conservative" | "normal" | "premium";

// targetMarkup: margin above break-even; marketCap: maximum position relative to the market average
const SCENARIOS: Record<Scenario, { label: string; desc: string; targetMarkup: number; marketCap: number }> = {
  conservative: { label: "Conservative", desc: "Slightly below market, chase volume", targetMarkup: 0.15, marketCap: 0.97 },
  normal: { label: "Normal", desc: "In line with the market average", targetMarkup: 0.2, marketCap: 1.0 },
  premium: { label: "Premium", desc: "Above market, chase margin", targetMarkup: 0.3, marketCap: 1.06 },
};

type Result = {
  price: number;
  breakEven: number;
  grossMargin: number; // per unit, relative to price
  monthlyNetProfit: number;
  netMargin: number;
  bepUnits: number | null;
  position: number; // difference from the market average
  note: string;
};

// Recommended price:
//   break-even/unit = COGS + fixed costs ÷ estimated sales
//   target          = break-even × (1 + scenario markup)
//   upper bound     = market average × scenario cap
// If the target margin is already met at the scenario's market position, the price is set
// at that position (e.g. Normal = in line with the market average). If not, the price
// is still held at the market position as long as it stays above break-even.
function compute(cogs: number, fixed: number, volume: number, market: MarketPricing, s: Scenario): Result {
  const sc = SCENARIOS[s];
  const breakEven = cogs + fixed / volume;
  const target = breakEven * (1 + sc.targetMarkup);
  const cap = market.average * sc.marketCap;
  let price: number;
  let note: string;
  if (target <= cap) {
    price = cap;
    note = "Target margin reached while the price stays competitive.";
  } else if (breakEven < cap) {
    price = cap;
    note = "Price held at the market cap; margin is below the scenario target.";
  } else {
    price = breakEven * 1.05;
    note = "Break-even is above the market price; the price is set just above break-even. Cut costs first.";
  }
  price = roundPrice(price);
  const contribution = price - cogs;
  const monthlyNetProfit = contribution * volume - fixed;
  return {
    price,
    breakEven,
    grossMargin: price > 0 ? contribution / price : 0,
    monthlyNetProfit,
    netMargin: price * volume > 0 ? monthlyNetProfit / (price * volume) : 0,
    bepUnits: contribution > 0 ? Math.ceil(fixed / contribution) : null,
    position: market.average ? (price - market.average) / market.average : 0,
    note,
  };
}

const CHANNEL_BRAND: Record<Competitor["channel"], Brand | null> = {
  Shopee: "shopee",
  Tokopedia: "tokopedia",
  "TikTok Shop": "tiktok",
  GrabFood: "grab",
  "Physical store": null,
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function SmartPricing() {
  usePageTitle("Smart Pricing");
  const { products } = useInventory();

  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [cogs, setCogs] = useState<number | "">("");
  const [fixed, setFixed] = useState<number | "">("");
  const [volume, setVolume] = useState<number | "">("");
  const [image, setImage] = useState<string | undefined>();
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [loading, setLoading] = useState(false);
  const { accountCity, consumeQuota, quotaRemaining, plan } = useAccount();
  const { toast } = useToast();
  // the default region follows the branch location
  const [city, setCity] = useState(accountCity);
  const [radius, setRadius] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [searchResult, setSearchResult] = useState<{ all: Competitor[]; city: string } | null>(null);
  const market: MarketPricing | null = useMemo(
    () => (searchResult ? summarizeMarket(searchResult.all, findRegion(searchResult.city), radius) : null),
    [searchResult, radius],
  );
  const tokensLeft = quotaRemaining("smartPricing");

  const valid = name.trim() && Number(cogs) > 0 && Number(fixed) >= 0 && fixed !== "" && Number(volume) > 0;

  const selectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setName(p.name);
    setCogs(p.unitCost);
    setImage(p.image);
    setSearchResult(null);
  };

  const search = async (productName = name, productCogs = Number(cogs), productFixed = Number(fixed), vol = Number(volume)) => {
    if (!productName.trim()) return;
    if (!consumeQuota("smartPricing")) {
      toast(quotaExhaustedMessage("smartPricing", plan), "warning");
      return;
    }
    setLoading(true);
    // market price reference: selling price of a similar product in inventory, otherwise a typical 60% markup on break-even
    const similar = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    const reference = similar?.sellingPrice || (productCogs + (vol > 0 ? productFixed / vol : 0)) * 1.6;
    const m = await fetchMarketPricing(productName, reference, city, radius);
    setSearchResult({ all: m.all, city });
    setLoading(false);
  };

  const result = useMemo(
    () => (market && valid ? compute(Number(cogs), Number(fixed), Number(volume), market, scenario) : null),
    [market, valid, cogs, fixed, volume, scenario],
  );
  const allScenarios = useMemo(
    () =>
      market && valid
        ? (Object.keys(SCENARIOS) as Scenario[]).map((s) => ({ s, ...compute(Number(cogs), Number(fixed), Number(volume), market, s) }))
        : [],
    [market, valid, cogs, fixed, volume],
  );

  const chart = market
    ? [...market.competitors.map((k) => ({ name: k.store, price: k.price, ours: false })), ...(result ? [{ name: "Your Price", price: result.price, ours: true }] : [])].sort(
        (a, b) => a.price - b.price,
      )
    : [];

  // Rule-based key takeaways
  const tips = useMemo(() => {
    if (!result || !market) return [];
    const out: string[] = [];
    const cheapest = [...market.competitors].sort((a, b) => a.price - b.price)[0];
    const nearest = [...market.competitors].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const index = market.region.priceIndex;
    const bestSeller = [...market.competitors].sort((a, b) => b.sold - a.sold)[0];
    out.push(
      result.position <= 0
        ? `Your price is ${pct(Math.abs(result.position))} below the market average (${formatRp(market.average)}). Highlight the savings in your promotional materials.`
        : `Your price is ${pct(result.position)} above the market average. Make sure the quality, packaging, or service genuinely feels better.`,
    );
    out.push(
      `The cheapest competitor is ${cheapest.store} (${cheapest.channel}) at ${formatRp(cheapest.price)}. ${
        cheapest.price < result.breakEven
          ? "That's below your break-even, so don't join a price war."
          : "Still above your break-even, so there's room for a limited promo if needed."
      }`,
    );
    out.push(
      `Prices in ${market.region.city} are ${index >= 1 ? pct(index - 1) + " above" : pct(1 - index) + " below"} the national average. The nearest competitor, ${nearest.store} (${nearest.distanceKm} km, ${nearest.district}), sells at ${formatRp(nearest.price)}.`,
    );
    out.push(
      `The market's best seller goes for ${formatRp(bestSeller.price)} on ${bestSeller.channel} (${bestSeller.sold} sold). This channel is worth trying.`,
    );
    if (result.bepUnits !== null) {
      const v = Number(volume);
      out.push(
        result.bepUnits <= v
          ? `Break-even is reached at ${result.bepUnits} units/month, safely below your estimated sales of ${v} units.`
          : `You need ${result.bepUnits} units/month to break even, more than your estimate of ${v} units. Increase volume or cut fixed costs.`,
      );
    }
    if (result.grossMargin < 0.3) out.push("Gross margin is below 30%. Look for cheaper raw materials or create bundles to raise the transaction value.");
    out.push(result.note);
    return out;
  }, [result, market, volume]);

  const input = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="card-elegant p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-extrabold text-primary">Smart Pricing</h2>
        </div>
        <p className="text-gray-600 mt-1 text-sm">
          Set your selling price from COGS, fixed costs, and competitor price comparisons. Competitor data in demo mode is sample data.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Pick from inventory (optional)</span>
              <select className={input} value={productId} onChange={(e) => selectProduct(e.target.value)}>
                <option value="">Enter manually</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Product name</span>
              <input className={input} value={name} placeholder="e.g. Sweet Iced Tea" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">COGS per unit</span>
              <input type="number" min={0} className={input} value={cogs} onChange={(e) => setCogs(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Fixed costs per month</span>
              <input type="number" min={0} className={input} value={fixed} placeholder="rent, salaries, electricity" onChange={(e) => setFixed(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Estimated sales per month (units)</span>
              <input type="number" min={1} className={input} value={volume} onChange={(e) => setVolume(e.target.value === "" ? "" : Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Market region</span>
              <select className={input} value={city} onChange={(e) => setCity(e.target.value)}>
                {Array.from(new Set(REGIONS.map((r) => r.province))).map((prov) => (
                  <optgroup key={prov} label={prov}>
                    {REGIONS.filter((r) => r.province === prov).map((r) => (
                      <option key={r.city} value={r.city}>
                        {r.city}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => search()}
                disabled={!valid || loading || tokensLeft === 0}
                className="sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Search className="w-4 h-4" /> {loading ? "Searching competitor prices..." : `Search Competitor Prices in ${city}`}
              </button>
              <QuotaBadge quota="smartPricing" />
            </div>
          </div>
          <div className="lg:col-span-4 rounded-2xl bg-gray-50 border p-4 flex flex-col items-center justify-center text-center">
            <ProductImage src={image} name={name || "Product"} className="w-32 h-32 rounded-2xl" />
            <p className="mt-3 font-semibold text-gray-900">{name || "No product yet"}</p>
            {valid && (
              <p className="text-xs text-gray-500 mt-1">
                Break-even {formatRp(Math.round(Number(cogs) + Number(fixed) / Number(volume)))}/unit
              </p>
            )}
          </div>
        </div>
      </section>

      {loading && (
        // skeleton while searching competitor prices
        <div className="space-y-6" aria-busy="true" aria-label="Loading results">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 shimmer h-64" />
            <div className="lg:col-span-7 shimmer h-64" />
          </div>
          <div className="card-elegant p-6 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="shimmer h-10" />
            ))}
          </div>
        </div>
      )}

      {!loading && result && market && (
        <>
          {/* Scenarios */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${scenario === s ? "bg-primary text-white border-primary" : "bg-white text-gray-700"}`}
              >
                {SCENARIOS[s].label}
                <span className={`ml-1 text-xs ${scenario === s ? "text-white/70" : "text-gray-400"}`}>· {SCENARIOS[s].desc}</span>
              </button>
            ))}
          </div>

          {/* Recommendation */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl p-6 text-white bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
              <p className="text-sm text-white/70">Recommended selling price</p>
              <p className="text-4xl font-extrabold mt-1">{formatRp(result.price)}</p>
              <p className="mt-1 text-sm text-white/80">
                {result.position <= 0 ? `${pct(-result.position)} below` : `${pct(result.position)} above`} the market average
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Gross margin/unit", pct(result.grossMargin)],
                  ["Net profit/month", formatRp(Math.round(result.monthlyNetProfit))],
                  ["Net margin", pct(result.netMargin)],
                  ["Break-even at", result.bepUnits === null ? "—" : `${result.bepUnits} units/mo`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/10 p-3">
                    <p className="text-[11px] text-white/60">{k}</p>
                    <p className="font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/70">
                Net profit = (price − COGS) × sales − fixed costs.
              </p>
            </div>

            <div className="card-elegant lg:col-span-7 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Price Position</h3>
              {(() => {
                const min = Math.min(market.lowest, result.breakEven, result.price) * 0.95;
                const max = Math.max(market.highest, result.price) * 1.05;
                const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
                return (
                  <div className="relative h-16">
                    <div className="absolute top-7 h-2 rounded-full bg-gray-100" style={{ left: 0, right: 0 }} />
                    <div className="absolute top-7 h-2 rounded-full bg-blue-200" style={{ left: pos(market.lowest), width: `calc(${pos(market.highest)} - ${pos(market.lowest)})` }} />
                    {[
                      { v: result.breakEven, l: "Break-even", c: "bg-red-500" },
                      { v: market.average, l: "Average", c: "bg-blue-600" },
                      { v: result.price, l: "You", c: "bg-emerald-500" },
                    ].map((m) => (
                      <div key={m.l} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(m.v) }}>
                        <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">{m.l}</span>
                        <span className={`mt-1 w-3 h-3 rounded-full ring-2 ring-white ${m.c}`} />
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Lowest {formatRp(market.lowest)}</span>
                <span>Highest {formatRp(market.highest)}</span>
              </div>

              <h3 className="font-semibold text-gray-900 mt-6 mb-2">Scenario Comparison</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">Scenario</th>
                      <th className="py-2 pr-3 font-medium text-right">Price</th>
                      <th className="py-2 pr-3 font-medium text-right">Gross margin</th>
                      <th className="py-2 font-medium text-right">Profit/month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScenarios.map((x) => (
                      <tr key={x.s} className={`border-b last:border-0 ${x.s === scenario ? "bg-primary/5 font-semibold" : ""}`}>
                        <td className="py-2 pr-3">{SCENARIOS[x.s].label}</td>
                        <td className="py-2 pr-3 text-right">{formatRp(x.price)}</td>
                        <td className="py-2 pr-3 text-right">{pct(x.grossMargin)}</td>
                        <td className={`py-2 text-right ${x.monthlyNetProfit < 0 ? "text-red-600" : ""}`}>{formatRp(Math.round(x.monthlyNetProfit))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Competitor comparison */}
          <section className="card-elegant p-6">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Competitor Comparison Results</h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 inline -mt-0.5" /> {market.region.city}, {market.region.province} · {market.competitors.length} relevant
                competitors out of {market.all.length} results · average {formatRp(market.average)}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Radius</span>
                {[3, 5, 10, 25].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`rounded-full px-2.5 py-1 font-medium ${radius === r ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Relevance = product similarity 50% + location proximity 30% + price proximity 20%. Relevant competitors: product similarity ≥ 70% and within the radius.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">Seller</th>
                      <th className="py-2 pr-3 font-medium">Location</th>
                      <th className="py-2 pr-3 font-medium text-right">Price</th>
                      <th className="py-2 pr-3 font-medium text-right">vs You</th>
                      <th className="py-2 font-medium">Relevance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? market.all : market.competitors).map((k) => {
                      const diff = (k.price - result.price) / result.price;
                      const relevant = market.competitors.includes(k);
                      const brand = CHANNEL_BRAND[k.channel];
                      return (
                        <tr key={k.store + k.product + k.distanceKm} className={`border-b last:border-0 ${relevant ? "" : "opacity-50"}`}>
                          <td className="py-2 pr-3">
                            <p className="font-medium text-gray-800">{k.store}</p>
                            <p className="text-[11px] text-gray-500">{k.product}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                              {brand ? <BrandIcon brand={brand} size={12} /> : <Store className="w-3 h-3" />} {k.channel}
                              <span className="text-gray-300">·</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {k.rating} · {k.sold} sold
                            </p>
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                            {k.district}
                            <br />
                            <span className="text-gray-400">{k.distanceKm} km</span>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatRp(k.price)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${diff < 0 ? "text-red-600" : "text-emerald-700"}`}>
                            {diff >= 0 ? "+" : ""}
                            {pct(diff)}
                          </td>
                          <td className="py-2 w-28">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${k.relevance}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-600">{k.relevance}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline">
                  {showAll ? "Show relevant competitors only" : `Show all ${market.all.length} search results`}
                </button>
              </div>
              <div className="lg:col-span-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f6" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}K`} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                    <ReferenceLine x={market.average} stroke="#2f6b8f" strokeDasharray="4 4" />
                    <Bar dataKey="price" name="Price" radius={[0, 4, 4, 0]}>
                      {chart.map((g) => (
                        <Cell key={g.name} fill={g.ours ? "#2f6b8f" : "#9cb2c1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Key takeaways */}
          <section className="card-elegant p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Key Takeaways & Tips</h3>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tips.map((s, i) => {
                const Icon = [Target, Scale, TrendingUp, Package, Lightbulb, Sparkles][i % 6];
                return (
                  <li key={i} className="flex gap-3 rounded-xl border p-4 text-sm text-gray-700">
                    <Icon className="w-5 h-5 text-primary shrink-0" /> {s}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
