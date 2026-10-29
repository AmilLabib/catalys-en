import React, { createContext, useContext, useEffect, useState } from "react";

export type BusinessSector =
  | "kuliner"
  | "agribisnis"
  | "fashion"
  | "industri"
  | "perdagangan";

const STORAGE_KEY = "business_sector_v1";

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
      if (raw) return raw as BusinessSector;
    } catch (e) {
      // ignore
    }
    return "kuliner";
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
  { value: "kuliner", label: "Kuliner" },
  { value: "agribisnis", label: "Agribisnis dan Pertanian" },
  { value: "fashion", label: "Fashion & Kecantikan" },
  { value: "industri", label: "Industri Pengolahan" },
  { value: "perdagangan", label: "Perdagangan / Retail" },
];
