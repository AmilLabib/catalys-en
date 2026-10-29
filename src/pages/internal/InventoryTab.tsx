import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Share2, Calculator, Boxes, Truck } from "lucide-react";
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useBusinessSector } from "../../context/BusinessSectorContext";
import { useInventory, type InventoryItem } from "../../context/InventoryContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";
import ProductImage from "../../components/ProductImage";
import ProductFormModal from "../../components/ProductFormModal";
import { EMPTY_PRODUCT, type ProductForm } from "../../components/productForm";
import { SECTORS, type Supplier } from "../../data/internal";
import { formatRp } from "../../data/reports";
import StockPanel from "./StockPanel";

function SupplyChainDiagram({
  suppliers,
  products,
  wip,
  finished,
  materialFlow,
  productFlow,
}: {
  suppliers: Supplier[];
  products: string[];
  wip: string[];
  finished: string[];
  materialFlow: Record<string, string[]>;
  productFlow: Record<string, string[]>;
}) {
  const node = (id: string, label: string, x: number, y: number, bg: string, border: string, color = "#1f2937") => ({
    id,
    data: { label },
    position: { x, y },
    sourcePosition: "right",
    targetPosition: "left",
    style: { background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 10, fontSize: 12, color },
  });

  const initialNodes = useMemo<any[]>(() => {
    const ys = (n: number) => Array.from({ length: n }, (_, i) => 50 + i * 80);
    const column = 250;
    const allMaterials = Array.from(new Set(suppliers.flatMap((s) => s.materials)));
    return [
      ...suppliers.map((s, i) => node(`sup-${s.name}`, s.name, 0, ys(suppliers.length)[i], "#f8fafc", "#cbd5e1")),
      ...allMaterials.map((b, i) => node(`raw-${b}`, b, column, ys(allMaterials.length)[i], "#f3f7fa", "#c6d8e4", "#0a3f5e")),
      ...wip.map((w, i) => node(`wip-${w}`, w, column * 2, ys(wip.length)[i], "#f3f7fa", "#c6d8e4", "#0a3f5e")),
      ...[...finished, ...products.slice(0, 4)].map((f, i) =>
        node(`fin-${f}`, f, column * 3, ys(finished.length + Math.min(4, products.length))[i], "#f3f7fa", "#c6d8e4", "#012a3d"),
      ),
    ];
  }, [suppliers, products, wip, finished]);

  const initialEdges = useMemo<any[]>(() => {
    const edges: any[] = [];
    let n = 0;
    const style = { stroke: "#9ca3af", strokeWidth: 1.5 };
    suppliers.forEach((s) =>
      s.materials.forEach((m) => edges.push({ id: `e${n++}`, source: `sup-${s.name}`, target: `raw-${m}`, animated: true, style })),
    );
    Object.entries(materialFlow).forEach(([b, ws]) =>
      ws.forEach((w) => wip.includes(w) && edges.push({ id: `e${n++}`, source: `raw-${b}`, target: `wip-${w}`, animated: true, style })),
    );
    Object.entries(productFlow).forEach(([w, fs]) =>
      fs.forEach((f) => finished.includes(f) && edges.push({ id: `e${n++}`, source: `wip-${w}`, target: `fin-${f}`, animated: true, style })),
    );
    return edges;
  }, [suppliers, wip, finished, materialFlow, productFlow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (params: any) => setEdges((eds: any[]) => addEdge({ ...params, animated: true, style: { stroke: "#2f6b8f", strokeWidth: 2 } }, eds)),
    [setEdges],
  );
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-[420px] w-full border rounded-xl bg-gray-50 overflow-hidden relative">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView attributionPosition="bottom-right">
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>
      <div className="absolute top-3 left-4 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-md shadow-sm border z-10">
        Tip: drag boxes to reposition them, drag a connection point to create a new flow
      </div>
    </div>
  );
}

export default function InventoryTab() {
  const { sector } = useBusinessSector();
  const mock = SECTORS[sector];
  const { products, addProduct, updateProduct, deleteProduct } = useInventory();
  const { toast } = useToast();

  // the component is remounted per sector (key in InternalManagement), so initial state is enough
  const [suppliers] = useState<Supplier[]>(() => [...mock.suppliers]);

  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string | null; initial: ProductForm } | null>(null);

  const [share, setShare] = useState<InventoryItem | null>(null);
  const [caption, setCaption] = useState("");
  const [target, setTarget] = useState({ instagram: true, facebook: false, whatsapp: false });
  const [posting, setPosting] = useState(false);

  // Per-product COGS builder (full costing: raw materials + direct labor + overhead)
  const [cogsProduct, setCogsProduct] = useState("");
  const [cogsUnits, setCogsUnits] = useState(1);
  const [cogsMaterials, setCogsMaterials] = useState(0);
  const [cogsLabor, setCogsLabor] = useState(0);
  const [overhead, setOverhead] = useState<{ id: string; label: string; amount: number }[]>([]);
  const totalOverhead = overhead.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const cogsPerUnit = cogsUnits > 0 ? (cogsMaterials + cogsLabor + totalOverhead) / cogsUnits : 0;
  const materialsPerUnit = cogsUnits > 0 ? cogsMaterials / cogsUnits : 0;

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12">
        <StockPanel />
      </div>

      {/* Finished product list */}
      <section className="card-elegant lg:col-span-12 p-6 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Finished Products</h2>
            <span className="text-xs text-gray-400">{products.length} products</span>
          </div>
          <button
            onClick={() => {
              setFormKey((k) => k + 1);
              setEditing({ id: null, initial: { ...EMPTY_PRODUCT, category: products[0]?.category ?? "", supplier: suppliers[0]?.name ?? "" } });
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {products.map((item) => {
            const margin = item.sellingPrice > 0 ? ((item.sellingPrice - item.unitCost) / item.sellingPrice) * 100 : 0;
            return (
              <div key={item.id} className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <ProductImage src={item.image} name={item.name} className="w-16 h-16 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.category}</span>
                    <span className={item.qty < 20 ? "text-amber-700 font-semibold" : "text-gray-600"}>
                      Stock {item.qty} {item.unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    COGS <b className="text-emerald-700">{formatRp(item.unitCost)}</b> · Price <b className="text-primary">{formatRp(item.sellingPrice)}</b> · Margin{" "}
                    {margin.toFixed(0)}%
                  </p>
                  {item.supplier && <p className="text-[11px] text-gray-400 truncate">Supplier: {item.supplier}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    aria-label="Share"
                    title="Share"
                    className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
                    onClick={() => {
                      setShare(item);
                      setCaption(`${item.name} - Special promo today! Order now and get the best price.`);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Edit"
                    title="Edit"
                    className="p-1.5 rounded-md text-primary hover:bg-primary/10"
                    onClick={() => {
                      setFormKey((k) => k + 1);
                      const { id, ...rest } = item;
                      setEditing({ id, initial: rest });
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Delete"
                    title="Delete"
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Delete ${item.name}?`)) deleteProduct(item.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-elegant lg:col-span-7 p-6 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Supply Chain Diagram</h2>
        </div>
        <SupplyChainDiagram
          suppliers={suppliers}
          products={products.map((p) => p.name)}
          wip={mock.wip.map((w) => w.name)}
          finished={mock.finishedGoods.map((f) => f.name)}
          materialFlow={mock.materialFlow}
          productFlow={mock.productFlow}
        />
      </section>

      {/* COGS Builder */}
      <section className="card-elegant lg:col-span-5 p-6 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">COGS Builder</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          COGS per unit = (raw materials + direct labor + production overhead) ÷ number of units. The same popup is available in the product form via the "Calculate COGS" button.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="text-xs text-gray-600">Product</span>
            <select value={cogsProduct} onChange={(e) => setCogsProduct(e.target.value)} className={input}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-gray-600">Units produced</span>
            <input type="number" min={1} value={cogsUnits} onChange={(e) => setCogsUnits(Number(e.target.value) || 0)} className={input} />
          </label>
          <label>
            <span className="text-xs text-gray-600">Direct raw materials (total)</span>
            <input type="number" min={0} value={cogsMaterials || ""} placeholder="0" onChange={(e) => setCogsMaterials(Number(e.target.value) || 0)} className={input} />
          </label>
          <label>
            <span className="text-xs text-gray-600">Direct labor (total)</span>
            <input type="number" min={0} value={cogsLabor || ""} placeholder="0" onChange={(e) => setCogsLabor(Number(e.target.value) || 0)} className={input} />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">Production overhead</p>
          {overhead.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <input
                value={o.label}
                onChange={(e) => setOverhead((p) => p.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={o.amount || ""}
                placeholder="0"
                onChange={(e) => setOverhead((p) => p.map((x) => (x.id === o.id ? { ...x, amount: Number(e.target.value) || 0 } : x)))}
                className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={() => setOverhead((p) => p.filter((x) => x.id !== o.id))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove overhead">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setOverhead((p) => [...p, { id: `${Date.now()}`, label: "Overhead", amount: 0 }])}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm text-primary hover:bg-primary/5"
          >
            <Plus className="w-4 h-4" /> Add overhead
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-primary/5 p-4">
          <div>
            <p className="text-xs text-gray-500">Material cost per unit</p>
            <p className="text-lg font-semibold text-gray-900">{formatRp(Math.round(materialsPerUnit))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">COGS per unit (full costing)</p>
            <p className="text-lg font-bold text-primary">{formatRp(Math.round(cogsPerUnit))}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              if (!cogsProduct) return toast("Select a product first", "info");
              if (cogsPerUnit <= 0) return toast("Fill in the cost components first", "info");
              updateProduct(cogsProduct, { unitCost: Math.round(cogsPerUnit), cogsSalesBasis: Math.round(cogsPerUnit) });
              toast("COGS applied to the product");
            }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            Apply to product
          </button>
          <button
            onClick={() => {
              setCogsProduct("");
              setCogsUnits(1);
              setCogsMaterials(0);
              setCogsLabor(0);
              setOverhead([]);
            }}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            Reset
          </button>
        </div>
      </section>

      <ProductFormModal
        key={formKey}
        open={!!editing}
        title={editing?.id ? "Edit Product" : "Add Product"}
        initial={editing?.initial ?? EMPTY_PRODUCT}
        suppliers={suppliers.map((s) => s.name)}
        submitLabel={editing?.id ? "Save Changes" : "Add Product"}
        onClose={() => setEditing(null)}
        onSubmit={(p) => {
          if (editing?.id) updateProduct(editing.id, p);
          else addProduct(p);
          toast(editing?.id ? "Product updated" : "Product added");
          setEditing(null);
        }}
      />


      <Modal isOpen={!!share} onClose={() => setShare(null)} title="Post Preview">
        {share && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border">
              <ProductImage src={share.image} name={share.name} className="w-full h-56" />
              <div className="p-4">
                <p className="font-semibold text-sm">{share.name}</p>
                <p className="text-xs text-gray-500 mb-2">@your_store · {new Date().toLocaleDateString("en-US")}</p>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} className="w-full border rounded-md p-2 text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["instagram", "facebook", "whatsapp"] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={target[k]}
                  onClick={() => setTarget((t) => ({ ...t, [k]: !t[k] }))}
                  className={`px-3 py-1.5 rounded-full border text-sm capitalize ${target[k] ? "bg-primary text-white border-primary" : "bg-white"}`}
                >
                  {k === "whatsapp" ? "WhatsApp" : k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShare(null)} className="px-4 py-2 rounded-lg border text-sm">
                Cancel
              </button>
              <button
                disabled={posting || !Object.values(target).some(Boolean)}
                onClick={() => {
                  setPosting(true);
                  setTimeout(() => {
                    const p = Object.entries(target)
                      .filter(([, v]) => v)
                      .map(([k]) => (k === "whatsapp" ? "WhatsApp" : k[0].toUpperCase() + k.slice(1)));
                    toast(`Posted to ${p.join(", ")} (simulation)`);
                    setPosting(false);
                    setShare(null);
                  }, 900);
                }}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
