import { useMemo, useState } from "react";
import { X, Plus, Trash2, Calculator, Search, Boxes } from "lucide-react";
import { useBahanBaku } from "../context/BahanBakuContext";
import type { ItemResep } from "../data/bahanBaku";
import Lapisan from "../components/Lapisan";

type Baris = { id: string; label: string; amount: number };
type Mode = "produsen" | "pedagang";
type Pilihan = { aktif: boolean; nilai: number; satuan: "qty" | "rp" };

const baru = (label: string): Baris => ({
  id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  label,
  amount: 0,
});

const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Math.round(v));

// Popup pembuat HPP per unit dengan metode full costing:
//   Produsen : (bahan baku dari persediaan + bahan lain + tenaga kerja langsung + overhead) / unit
//   Pedagang : (harga beli + ongkos kirim + biaya perolehan lain) / unit
// Bahan baku yang dipilih juga dikembalikan sebagai resep per unit produk.
export default function HppCalculatorModal({
  open,
  onClose,
  onApply,
  namaProduk,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (hppPerUnit: number, resep?: ItemResep[]) => void;
  namaProduk?: string;
}) {
  const { bahan, resepProduk } = useBahanBaku();
  const resepLama = namaProduk ? resepProduk(namaProduk) : [];

  const [mode, setMode] = useState<Mode>("produsen");
  const [unit, setUnit] = useState(1);
  const [cari, setCari] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, Pilihan>>(() =>
    Object.fromEntries(resepLama.map((r) => [r.bahanId, { aktif: true, nilai: r.qty, satuan: "qty" as const }])),
  );
  const [bahanLain, setBahanLain] = useState<Baris[]>([]);
  const [tenaga, setTenaga] = useState(0);
  const [overhead, setOverhead] = useState<Baris[]>([baru("Listrik & gas produksi")]);
  const [hargaBeli, setHargaBeli] = useState(0);
  const [ongkir, setOngkir] = useState(0);
  const [lain, setLain] = useState<Baris[]>([]);

  const jumlah = (xs: Baris[]) => xs.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  // biaya tiap bahan terpilih
  const biayaBahan = useMemo(
    () =>
      bahan
        .filter((b) => pilihan[b.id]?.aktif)
        .map((b) => {
          const p = pilihan[b.id];
          const nilai = Number(p.nilai) || 0;
          const biaya = p.satuan === "rp" ? nilai : nilai * b.harga;
          const qty = p.satuan === "rp" ? (b.harga ? nilai / b.harga : 0) : nilai;
          return { b, biaya, qty };
        }),
    [bahan, pilihan],
  );
  const totalBahan = biayaBahan.reduce((s, x) => s + x.biaya, 0);

  const total =
    mode === "produsen"
      ? totalBahan + jumlah(bahanLain) + (Number(tenaga) || 0) + jumlah(overhead)
      : (Number(hargaBeli) || 0) + (Number(ongkir) || 0) + jumlah(lain);
  const perUnit = unit > 0 ? total / unit : 0;

  if (!open) return null;

  const ubahPilihan = (id: string, p: Partial<Pilihan>) =>
    setPilihan((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { aktif: false, nilai: 0, satuan: "qty" }), ...p } }));

  const daftar = (judul: string, rows: Baris[], set: React.Dispatch<React.SetStateAction<Baris[]>>, labelBaru: string) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{judul}</p>
        <button type="button" onClick={() => set((p) => [...p, baru(labelBaru)])} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Tambah baris
        </button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-gray-400">Belum ada baris.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => set((p) => p.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={r.amount || ""}
              placeholder="Rp"
              onChange={(e) => set((p) => p.map((x) => (x.id === r.id ? { ...x, amount: Number(e.target.value) } : x)))}
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm text-right"
            />
            <button type="button" aria-label="Hapus baris" onClick={() => set((p) => p.filter((x) => x.id !== r.id))} className="p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const angka = (label: string, value: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input type="number" min={0} value={value || ""} placeholder="0" onChange={(e) => set(Number(e.target.value))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </label>
  );

  const tersaring = bahan.filter((b) => (b.nama + " " + b.kategori).toLowerCase().includes(cari.toLowerCase()));

  return (
    <Lapisan className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-gray-800">Pembuat HPP</h3>
              {namaProduk && <p className="text-xs text-gray-500">{namaProduk}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(
              [
                ["produsen", "Produsen (membuat sendiri)"],
                ["pedagang", "Pedagang (membeli jadi)"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium ${mode === k ? "bg-white shadow text-primary" : "text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {angka(mode === "produsen" ? "Jumlah unit dihasilkan" : "Jumlah unit dibeli", unit, setUnit)}

          {mode === "produsen" ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-primary" /> Bahan baku dari persediaan
                  </p>
                  <span className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari bahan" className="w-40 rounded-lg border border-gray-200 pl-8 pr-2 py-1.5 text-xs" />
                  </span>
                </div>
                <div className="rounded-xl border divide-y max-h-64 overflow-y-auto">
                  {tersaring.length === 0 && <p className="p-3 text-xs text-gray-400">Belum ada bahan baku di persediaan.</p>}
                  {tersaring.map((b) => {
                    const p = pilihan[b.id];
                    const aktif = !!p?.aktif;
                    const biaya = biayaBahan.find((x) => x.b.id === b.id)?.biaya ?? 0;
                    return (
                      <div key={b.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${aktif ? "bg-primary/[0.03]" : ""}`}>
                        <label className="flex items-center gap-2 flex-1 min-w-[160px] cursor-pointer">
                          <input type="checkbox" checked={aktif} onChange={(e) => ubahPilihan(b.id, { aktif: e.target.checked })} />
                          <span>
                            <span className="block text-sm text-gray-800">{b.nama}</span>
                            <span className="block text-[11px] text-gray-500">
                              {rupiah(b.harga)}/{b.satuan} · stok {b.stok} {b.satuan}
                            </span>
                          </span>
                        </label>
                        {aktif && (
                          <>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={p.nilai || ""}
                              placeholder="0"
                              onChange={(e) => ubahPilihan(b.id, { nilai: Number(e.target.value) })}
                              className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                              aria-label={`Jumlah ${b.nama}`}
                            />
                            <div className="flex rounded-lg bg-gray-100 p-0.5 text-[11px] font-medium">
                              {(["qty", "rp"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => ubahPilihan(b.id, { satuan: s, nilai: 0 })}
                                  className={`rounded-md px-2 py-1 ${p.satuan === s ? "bg-white shadow text-primary" : "text-gray-500"}`}
                                >
                                  {s === "qty" ? b.satuan : "Rp"}
                                </button>
                              ))}
                            </div>
                            <span className="w-24 text-right text-xs font-semibold text-gray-700">{rupiah(biaya)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-right text-xs text-gray-600">Total bahan baku {rupiah(totalBahan)}</p>
              </div>
              {daftar("Bahan lain di luar persediaan", bahanLain, setBahanLain, "Bahan lain")}
              {angka("Tenaga kerja langsung (total)", tenaga, setTenaga)}
              {daftar("Overhead produksi", overhead, setOverhead, "Overhead")}
            </>
          ) : (
            <>
              {angka("Harga beli barang (total)", hargaBeli, setHargaBeli)}
              {angka("Ongkos kirim / angkut pembelian", ongkir, setOngkir)}
              {daftar("Biaya perolehan lain", lain, setLain, "Biaya lain")}
            </>
          )}

          <div className="rounded-xl bg-primary/5 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Total biaya produksi / perolehan</span>
              <span className="font-semibold">{rupiah(total)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-gray-800">HPP per unit</span>
              <span className="font-bold text-primary">{rupiah(perUnit)}</span>
            </div>
            <p className="text-[11px] text-gray-500 pt-1">
              Metode full costing sesuai SAK EMKM. Bahan baku yang dipilih disimpan sebagai resep produk, sehingga penjualan di Kasir otomatis mengurangi stok persediaan.
            </p>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button
            disabled={perUnit <= 0}
            onClick={() => {
              const resep =
                mode === "produsen" && unit > 0
                  ? biayaBahan.filter((x) => x.qty > 0).map((x) => ({ bahanId: x.b.id, qty: Math.round((x.qty / unit) * 10000) / 10000 }))
                  : undefined;
              onApply(Math.round(perUnit), resep);
              onClose();
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Gunakan HPP ini
          </button>
        </div>
      </div>
    </Lapisan>
  );
}
