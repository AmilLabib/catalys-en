import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Store, Building2, ArrowRight, Crown, CheckCircle2, MapPin } from "lucide-react";
import { useAccount } from "./AccountContext";
import { useToast } from "./ToastContext";
import Modal from "../components/Modal";
import { BATAS_CABANG, CABANG_UTAMA, FEATURES, PLAN_LABEL, ROLE_LABEL, type FeatureKey } from "../config/access";
import { WILAYAH } from "../utils/pricing";
import { rayakan } from "../utils/efek";

// Popup akses fitur (peran/paket) dan dialog membuka cabang baru, dipakai di seluruh aplikasi.

type AksesCtx = {
  tampilkanAkses: (f: FeatureKey) => void;
  bukaDialogCabang: () => void;
};

const ctx = createContext<AksesCtx | undefined>(undefined);

// Isi penjelasan fitur terkunci beserta tombol tindak lanjutnya
export function IsiAkses({ feature, onSelesai }: { feature: FeatureKey; onSelesai?: () => void }) {
  const { role, plan, cabangList, alasanTerkunci, pindahAkun } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  const kunci = alasanTerkunci(feature);
  const def = FEATURES[feature];
  if (!kunci) return null;

  const pindah = (akun: string, tujuan = def.path) => {
    pindahAkun(akun);
    toast(`Sekarang di akun ${akun === "induk" ? "Induk" : akun}`, "info");
    onSelesai?.();
    navigate(tujuan);
  };

  const judul =
    kunci.jenis === "peran" ? `Fitur khusus akun ${ROLE_LABEL[kunci.perluPeran ?? "induk"]}` : `${def.label} belum termasuk paket ${PLAN_LABEL[plan]}`;

  return (
    <div className="text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
        {kunci.jenis === "peran" ? <Lock className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
      </div>
      <h3 className="mt-3 text-lg font-bold text-primary">{judul}</h3>

      {kunci.jenis === "peran" && kunci.perluPeran === "cabang" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {def.label} hanya ada di akun Cabang, karena dipakai langsung untuk operasional harian toko. Pindah ke salah satu cabang untuk
            membukanya.
          </p>
          <div className="mt-4 grid gap-2">
            {cabangList.map((c) => (
              <button
                key={c.nama}
                onClick={() => pindah(c.nama)}
                className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm hover:border-primary hover:bg-primary/5"
              >
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <Store className="w-4 h-4" /> {c.nama}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {c.kota} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {kunci.jenis === "peran" && kunci.perluPeran === "induk" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {def.label} hanya ada di akun Induk, karena mencakup seluruh usaha. Pindah ke akun Induk untuk membukanya.
          </p>
          <button onClick={() => pindah("induk")} className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Building2 className="w-4 h-4" /> Pindah ke akun Induk
          </button>
        </>
      )}

      {kunci.jenis === "paket" && role === "induk" && (
        <>
          <p className="mt-1 text-sm text-gray-600">{kunci.pesan}. Upgrade langganan untuk membukanya di seluruh usaha.</p>
          <button
            onClick={() => {
              onSelesai?.();
              navigate("/profil?tab=paket");
            }}
            className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Crown className="w-4 h-4" /> Lihat & Upgrade Paket
          </button>
        </>
      )}

      {kunci.jenis === "paket" && role === "cabang" && (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {kunci.pesan}. Langganan dikelola oleh akun Induk, minta pemilik usaha untuk melakukan upgrade.
          </p>
          <button onClick={() => pindah("induk", "/profil?tab=paket")} className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Building2 className="w-4 h-4" /> Pindah ke akun Induk
          </button>
        </>
      )}
    </div>
  );
}

function DialogBukaCabang({ onTutup }: { onTutup: () => void }) {
  const { role, plan, punyaCabang, kotaUsaha, sisaSlotCabang, bukaCabang, pindahAkun } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [nama, setNama] = useState("");
  const [kota, setKota] = useState(WILAYAH[0].kota);
  const [kotaUtama, setKotaUtama] = useState(kotaUsaha);
  const [galat, setGalat] = useState("");
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const sisa = sisaSlotCabang();
  const input = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15";

  if (role !== "induk")
    return <p className="text-sm text-gray-600 text-center">Hanya akun Induk yang dapat membuka cabang baru.</p>;

  if (berhasil)
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto w-12 h-12 text-primary" />
        <h3 className="mt-2 text-lg font-bold text-primary">{berhasil} berhasil dibuka</h3>
        <p className="mt-1 text-sm text-gray-600">Data contoh cabang sudah disiapkan. Pindah akun kapan saja lewat menu di pojok kanan atas.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onTutup} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Tetap di Induk
          </button>
          <button
            onClick={() => {
              pindahAkun(berhasil);
              toast(`Sekarang di akun ${berhasil}`, "info");
              onTutup();
              navigate("/dashboard");
            }}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Masuk ke {berhasil.replace("Cabang ", "")}
          </button>
        </div>
      </div>
    );

  if (sisa !== null && sisa <= 0)
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
          <Crown className="w-6 h-6" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-primary">Batas cabang paket {PLAN_LABEL[plan]} tercapai</h3>
        <p className="mt-1 text-sm text-gray-600">
          {BATAS_CABANG[plan] === 0
            ? "Paket Gratis belum termasuk membuka cabang."
            : `Paket ${PLAN_LABEL[plan]} maksimal ${(BATAS_CABANG[plan] ?? 0) + 1} cabang (${CABANG_UTAMA} + ${BATAS_CABANG[plan]} cabang baru).`}{" "}
          Upgrade paket untuk menambah cabang (Pro: hingga 3 cabang, Bisnis: tanpa batas).
        </p>
        <button
          onClick={() => {
            onTutup();
            navigate("/profil?tab=paket");
          }}
          className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Crown className="w-4 h-4" /> Lihat & Upgrade Paket
        </button>
      </div>
    );

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const lengkap = nama.trim() ? `Cabang ${nama.trim().replace(/^cabang\s+/i, "")}` : "";
    const hasil = bukaCabang({ nama: lengkap, kota, kotaUtama: punyaCabang ? undefined : kotaUtama });
    if (!hasil.ok) return setGalat(hasil.pesan ?? "Gagal membuka cabang");
    rayakan();
    setBerhasil(lengkap);
  };

  return (
    <form onSubmit={simpan} className="space-y-4">
      {!punyaCabang && (
        <div className="rounded-xl bg-primary/5 p-3 text-sm text-gray-700">
          <p className="font-semibold text-primary">Ini cabang pertama Anda</p>
          <p className="mt-1">
            Toko yang sudah berjalan akan otomatis menjadi <b>{CABANG_UTAMA}</b> beserta seluruh datanya (transaksi, stok, karyawan). Akun Induk
            berubah menjadi kantor pusat yang memantau semua cabang.
          </p>
          <label className="mt-3 block text-xs text-gray-500">
            Lokasi {CABANG_UTAMA}
            <select value={kotaUtama} onChange={(e) => setKotaUtama(e.target.value)} className={input}>
              {WILAYAH.map((w) => (
                <option key={w.kota}>{w.kota}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Nama cabang baru
        <span className="mt-1 flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/15">
          <span className="pl-3 text-sm text-gray-400">Cabang</span>
          <input
            autoFocus
            value={nama}
            onChange={(e) => {
              setNama(e.target.value);
              setGalat("");
            }}
            placeholder="mis. Bandung Dago"
            className="w-full rounded-xl px-2 py-2 text-sm focus:outline-none"
          />
        </span>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Kota
        </span>
        <select value={kota} onChange={(e) => setKota(e.target.value)} className={input}>
          {WILAYAH.map((w) => (
            <option key={w.kota} value={w.kota}>
              {w.kota}, {w.provinsi}
            </option>
          ))}
        </select>
      </label>
      {galat && <p className="text-sm font-medium text-primary">{galat}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {sisa === null ? `Paket ${PLAN_LABEL[plan]}: cabang tanpa batas` : `Sisa slot cabang paket ${PLAN_LABEL[plan]}: ${sisa}`}
        </p>
        <button className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold">Buka Cabang</button>
      </div>
    </form>
  );
}

export function AksesProvider({ children }: { children: React.ReactNode }) {
  const [fitur, setFitur] = useState<FeatureKey | null>(null);
  const [dialogCabang, setDialogCabang] = useState(false);
  return (
    <ctx.Provider value={{ tampilkanAkses: setFitur, bukaDialogCabang: () => setDialogCabang(true) }}>
      {children}
      <Modal isOpen={!!fitur} onClose={() => setFitur(null)} title={fitur ? FEATURES[fitur].label : ""}>
        {fitur && <IsiAkses feature={fitur} onSelesai={() => setFitur(null)} />}
      </Modal>
      <Modal isOpen={dialogCabang} onClose={() => setDialogCabang(false)} title="Buka Cabang Baru">
        {dialogCabang && <DialogBukaCabang onTutup={() => setDialogCabang(false)} />}
      </Modal>
    </ctx.Provider>
  );
}

export function useAkses() {
  const c = useContext(ctx);
  if (!c) throw new Error("useAkses harus dipakai di dalam AksesProvider");
  return c;
}
