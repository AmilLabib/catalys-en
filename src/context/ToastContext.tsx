import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, FolderDown } from "lucide-react";

type ToastKind = "success" | "warning" | "info";
type Toast = { id: number; kind: ToastKind; text: string };

// Notification styled like a system notification (e.g. after a download finishes)
export type DownloadNotice = { title: string; message: string; files: string[] };
type DownloadCard = DownloadNotice & { id: number; leaving: boolean };

type ToastCtx = {
  toast: (text: string, kind?: ToastKind) => void;
  downloadNotice: (n: DownloadNotice) => void;
};

const ctx = createContext<ToastCtx | undefined>(undefined);

const STYLE: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-emerald-200 text-emerald-800" },
  warning: { icon: AlertTriangle, cls: "border-amber-200 text-amber-800" },
  info: { icon: Info, cls: "border-blue-200 text-blue-800" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [downloads, setDownloads] = useState<DownloadCard[]>([]);

  const remove = (id: number) =>
    setToasts((t) => t.filter((x) => x.id !== id));

  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // shows briefly, then slides out before being removed
  const closeDownload = useCallback((id: number) => {
    setDownloads((u) => u.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setDownloads((u) => u.filter((x) => x.id !== id)), 320);
  }, []);
  const downloadNotice = useCallback(
    (n: DownloadNotice) => {
      const id = Date.now() + Math.random();
      setDownloads((u) => [...u, { ...n, id, leaving: false }]);
      setTimeout(() => closeDownload(id), 5000);
    },
    [closeDownload],
  );

  return (
    <ctx.Provider value={{ toast, downloadNotice }}>
      {children}
      <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 w-[min(92vw,380px)]">
        {downloads.map((n) => (
          <div
            key={n.id}
            role="status"
            className={`system-notice group relative flex items-start gap-3 rounded-2xl border border-white/70 bg-white/85 px-3.5 py-3 shadow-[0_18px_40px_-14px_rgba(1,42,61,0.45)] backdrop-blur-xl ${n.leaving ? "system-notice-exit" : ""}`}
          >
            <span className="w-10 h-10 shrink-0 rounded-xl grad-navy flex items-center justify-center text-white shadow-md">
              <FolderDown className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{n.title}</p>
                <span className="shrink-0 text-[11px] text-gray-400">now</span>
              </div>
              <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500" title={n.files.join(" • ")}>
                {n.files.join(" • ")}
              </p>
            </div>
            <button
              onClick={() => closeDownload(n.id)}
              aria-label="Close"
              className="absolute -left-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow group-hover:flex"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLE[t.kind];
          return (
            <div
              key={t.id}
              className={`toast-in flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${cls}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="flex-1 text-gray-800">{t.text}</p>
              <button
                onClick={() => remove(t.id)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(ctx);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}
