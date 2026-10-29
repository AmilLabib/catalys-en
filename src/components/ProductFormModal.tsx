import { useState } from "react";
import { X, Calculator, ImagePlus } from "lucide-react";
import type { ProductForm } from "./productForm";
import CogsCalculatorModal from "./CogsCalculatorModal";
import { useRawMaterials } from "../context/RawMaterialContext";
import type { RecipeItem } from "../data/rawMaterials";
import Overlay from "../components/Overlay";


// Add/edit product form shared by the Cashier and Inventory.
// The COGS field has a "Calculate COGS" button that opens the COGS Builder popup.
export default function ProductFormModal({
  open,
  title,
  initial,
  suppliers,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: ProductForm;
  suppliers?: string[];
  submitLabel: string;
  onClose: () => void;
  onSubmit: (p: ProductForm) => void;
}) {
  const [form, setForm] = useState<ProductForm>(initial);
  const [cogsOpen, setCogsOpen] = useState(false);
  const [recipe, setNewRecipe] = useState<RecipeItem[] | undefined>();
  const { setRecipe } = useRawMaterials();
  const [error, setError] = useState("");

  if (!open) return null;

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const margin =
    form.sellingPrice > 0 ? ((form.sellingPrice - form.unitCost) / form.sellingPrice) * 100 : null;

  const save = () => {
    if (!form.name.trim()) return setError("Product name is required.");
    if (form.qty < 0) return setError("Stock can't be negative.");
    if (form.unitCost <= 0) return setError("COGS must be greater than 0. Use the Calculate COGS button if needed.");
    if (form.sellingPrice <= 0) return setError("Selling price must be greater than 0.");
    setError("");
    const name = form.name.trim();
    // the recipe from the COGS Builder is saved so sales reduce raw material stock
    if (recipe && recipe.length > 0) setRecipe(name, recipe);
    onSubmit({ ...form, name, category: form.category.trim() || "General" });
  };

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <Overlay className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-2 gap-4">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Product name</span>
            <input className={input} value={form.name} placeholder="e.g. Fried Catfish, Linen Shirt" onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Category</span>
            <input className={input} value={form.category} placeholder="e.g. Food" onChange={(e) => set("category", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Unit</span>
            <input className={input} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Stock</span>
            <input type="number" min={0} className={input} value={form.qty || ""} placeholder="0" onChange={(e) => set("qty", Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Selling price</span>
            <input type="number" min={0} className={input} value={form.sellingPrice || ""} placeholder="0" onChange={(e) => set("sellingPrice", Number(e.target.value))} />
          </label>
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">COGS per unit</span>
            <div className="flex gap-2">
              <input type="number" min={0} className={input} value={form.unitCost || ""} placeholder="0" onChange={(e) => set("unitCost", Number(e.target.value))} />
              <button
                type="button"
                onClick={() => setCogsOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <Calculator className="w-4 h-4" /> Calculate COGS
              </button>
            </div>
            {recipe && recipe.length > 0 && (
              <span className="text-xs text-emerald-700">A recipe of {recipe.length} raw materials will be saved with the product.</span>
            )}
            {margin !== null && (
              <span className={`text-xs ${margin < 0 ? "text-red-600" : "text-gray-500"}`}>
                Gross margin {margin.toFixed(1)}% per unit
              </span>
            )}
          </div>
          {suppliers && (
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Supplier</span>
              <select className={input} value={form.supplier || ""} onChange={(e) => set("supplier", e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Product photo (optional)</span>
            <label className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
              {form.image ? (
                <img src={form.image} alt="" className="w-12 h-12 rounded object-cover" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
              <span>{form.image ? "Change photo" : "Upload photo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => set("image", String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
            </label>
          </div>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-95">
            {submitLabel}
          </button>
        </div>
      </div>

      <CogsCalculatorModal
        open={cogsOpen}
        onClose={() => setCogsOpen(false)}
        productName={form.name}
        onApply={(v, r) => {
          set("unitCost", v);
          setNewRecipe(r);
        }}
      />
    </Overlay>
  );
}
