import { useEffect, useState } from "react";
import Lapisan from "../components/Lapisan";

const KATEGORI_AKUN: { value: string; label: string }[] = [
  { value: "asset", label: "Aset" },
  { value: "liability", label: "Liabilitas" },
  { value: "equity", label: "Ekuitas" },
  { value: "revenue", label: "Pendapatan" },
  { value: "expense", label: "Beban" },
  { value: "distribution", label: "Distribusi / Prive" },
];

export default function AccountEditModal({
  visible,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: {
    code?: string;
    name?: string;
    type?: string;
    targetKind?: string;
    targetField?: string;
    description?: string;
  };
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    type: string;
    target: { kind: string; field: string };
    description?: string;
  }) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("asset");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCode(initial?.code || "");
    setName(initial?.name || "");
    setType(initial?.type || "asset");
    setDescription(initial?.description || "");
    setError("");
  }, [initial, visible]);

  if (!visible) return null;

  const isEdit = !!initial?.code;

  const handleSave = () => {
    if (!code.trim() || !name.trim()) return setError("Kode dan nama akun wajib diisi.");
    if (!/^\d+(\.\d+)*$/.test(code.trim()))
      return setError("Format kode memakai angka dan titik, misalnya 1.1.1.08.");
    // Pos laporan ditentukan dari prefiks kode akun; target disimpan untuk kompatibilitas.
    const kind = type === "revenue" || type === "expense" ? "is" : type === "equity" || type === "distribution" ? "equity" : "bs";
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      type,
      target: { kind, field: initial?.targetField || name.trim().toLowerCase().replace(/\W+/g, "_") },
      description: description.trim(),
    });
    onClose();
  };

  const input = "w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <Lapisan className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-[min(100%,560px)] shadow-lg">
        <h3 className="text-lg font-semibold mb-4">{isEdit ? "Ubah Akun" : "Tambah Akun"}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-1">
              <span className="text-sm text-gray-700">Kode</span>
              <input className={input} value={code} placeholder="1.1.1.08" onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm text-gray-700">Nama akun</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-gray-700">Kategori</span>
            <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
              {KATEGORI_AKUN.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Keterangan</span>
            <textarea className={input} rows={3} value={description} placeholder="Normal: Debit" onChange={(e) => setDescription(e.target.value)} />
          </label>
          <p className="text-xs text-gray-500">
            Akun otomatis masuk ke pos laporan keuangan sesuai awalan kodenya (mis. 1.1.1 = Kas dan setara kas).
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-full text-sm">
            Batal
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold">
            Simpan
          </button>
        </div>
      </div>
    </Lapisan>
  );
}
