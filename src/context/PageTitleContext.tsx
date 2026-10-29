import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type PageTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("Beranda");

  const setTitle = useCallback((next: string) => {
    setTitleState(next);
  }, []);

  const value = useMemo(() => ({ title, setTitle }), [title, setTitle]);

  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleContext() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error(
      "usePageTitleContext must be used within PageTitleProvider",
    );
  }
  return ctx;
}
