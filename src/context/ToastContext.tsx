import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, FolderDown } from "lucide-react";

type ToastKind = "sukses" | "peringatan" | "info";
type Toast = { id: number; kind: ToastKind; text: string };

// Notifikasi bergaya notifikasi sistem (mis. setelah unduhan selesai)
export type NotifUnduhan = { judul: string; pesan: string; berkas: string[] };
type KartuUnduhan = NotifUnduhan & { id: number; keluar: boolean };

type ToastCtx = {
  toast: (text: string, kind?: ToastKind) => void;
  notifUnduhan: (n: NotifUnduhan) => void;
};

const ctx = createContext<ToastCtx | undefined>(undefined);

const STYLE: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  sukses: { icon: CheckCircle2, cls: "border-emerald-200 text-emerald-800" },
  peringatan: { icon: AlertTriangle, cls: "border-amber-200 text-amber-800" },
  info: { icon: Info, cls: "border-blue-200 text-blue-800" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unduhan, setUnduhan] = useState<KartuUnduhan[]>([]);

  const remove = (id: number) =>
    setToasts((t) => t.filter((x) => x.id !== id));

  const toast = useCallback((text: string, kind: ToastKind = "sukses") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // muncul sebentar, lalu meluncur keluar sebelum dihapus
  const tutupUnduhan = useCallback((id: number) => {
    setUnduhan((u) => u.map((x) => (x.id === id ? { ...x, keluar: true } : x)));
    setTimeout(() => setUnduhan((u) => u.filter((x) => x.id !== id)), 320);
  }, []);
  const notifUnduhan = useCallback(
    (n: NotifUnduhan) => {
      const id = Date.now() + Math.random();
      setUnduhan((u) => [...u, { ...n, id, keluar: false }]);
      setTimeout(() => tutupUnduhan(id), 5000);
    },
    [tutupUnduhan],
  );

  return (
    <ctx.Provider value={{ toast, notifUnduhan }}>
      {children}
      <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 w-[min(92vw,380px)]">
        {unduhan.map((n) => (
          <div
            key={n.id}
            role="status"
            className={`notif-sistem group relative flex items-start gap-3 rounded-2xl border border-white/70 bg-white/85 px-3.5 py-3 shadow-[0_18px_40px_-14px_rgba(1,42,61,0.45)] backdrop-blur-xl ${n.keluar ? "notif-sistem-keluar" : ""}`}
          >
            <span className="w-10 h-10 shrink-0 rounded-xl grad-navy flex items-center justify-center text-white shadow-md">
              <FolderDown className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{n.judul}</p>
                <span className="shrink-0 text-[11px] text-gray-400">sekarang</span>
              </div>
              <p className="text-sm text-gray-800 leading-snug">{n.pesan}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500" title={n.berkas.join(" • ")}>
                {n.berkas.join(" • ")}
              </p>
            </div>
            <button
              onClick={() => tutupUnduhan(n.id)}
              aria-label="Tutup"
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
                aria-label="Tutup"
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
  if (!c) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return c;
}
