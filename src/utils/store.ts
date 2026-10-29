import { MAIN_BRANCH } from "../config/access";

// Operational data (products, raw materials) is stored per store. The Main Branch uses
// the legacy key so data from before any branch existed automatically belongs to it.
export function storeKey(prefix: string, sector: string, store: string) {
  if (store === MAIN_BRANCH) return `${prefix}${sector}`;
  return `${prefix}${sector}__${store.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Stock variation for a new branch's sample data (same catalog, different stock levels)
export function stockFactor(store: string, i: number) {
  if (store === MAIN_BRANCH) return 1;
  const h = Array.from(store).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  const x = Math.sin(h * 0.0001 + i * 12.9898) * 43758.5453;
  return 0.45 + (x - Math.floor(x)) * 0.8;
}
