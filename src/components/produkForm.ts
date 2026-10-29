import type { InventoryItem } from "../context/InventoryContext";

export type ProductForm = Omit<InventoryItem, "id">;

export const PRODUK_KOSONG: ProductForm = {
  name: "",
  category: "",
  qty: 0,
  unit: "pcs",
  unitCost: 0,
  sellingPrice: 0,
  image: "",
  supplier: "",
};
