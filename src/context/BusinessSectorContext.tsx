import React, { createContext, useContext, useEffect, useState } from "react";

export type BusinessSector =
  | "culinary"
  | "agribusiness"
  | "fashion"
  | "manufacturing"
  | "trade";

const STORAGE_KEY = "business_sector_v2";
const SECTORS: BusinessSector[] = ["culinary", "agribusiness", "fashion", "manufacturing", "trade"];

type ContextShape = {
  sector: BusinessSector;
  setSector: (s: BusinessSector) => void;
};

const ctx = createContext<ContextShape | undefined>(undefined);

export function BusinessSectorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sector, setSector] = useState<BusinessSector>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && SECTORS.includes(raw as BusinessSector)) return raw as BusinessSector;
    } catch (e) {
      // ignore
    }
    return "culinary";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sector);
    } catch (e) {
      // ignore
    }
  }, [sector]);

  return <ctx.Provider value={{ sector, setSector }}>{children}</ctx.Provider>;
}

export function useBusinessSector() {
  const c = useContext(ctx);
  if (!c)
    throw new Error(
      "useBusinessSector must be used within BusinessSectorProvider",
    );
  return c;
}

export const SECTOR_OPTIONS: { value: BusinessSector; label: string }[] = [
  { value: "culinary", label: "Culinary" },
  { value: "agribusiness", label: "Agribusiness & Agriculture" },
  { value: "fashion", label: "Fashion & Beauty" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trade", label: "Trade / Retail" },
];
