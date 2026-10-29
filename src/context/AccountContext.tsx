import React, { createContext, useContext, useEffect, useState } from "react";
import {
  BATAS_CABANG,
  CABANG_UTAMA,
  FEATURES,
  KANTOR_PUSAT,
  QUOTA_LIMITS,
  QUOTA_PERIODE,
  lockedMessage,
  pesanPeran,
  planAtLeast,
  type CabangInfo,
  type FeatureKey,
  type PeriodeKuota,
  type Plan,
  type QuotaKey,
  type Role,
} from "../config/access";
import { aturDaftarCabang, KONSOLIDASI } from "../data/laporan";

// v2: model akun baru (induk + daftar cabang yang bisa dibuka sendiri)
const STORAGE_KEY = "catalys_account_v2";
const STORAGE_LAMA = "catalys_account_v1";

export type Profile = {
  nama: string;
  email: string;
  telepon: string;
  namaUsaha: string;
  alamat: string;
  jabatan: string;
};

export type SesiKonsultasi = {
  id: string;
  pakar: string;
  topik: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;
  mode: "Online" | "Tatap Muka";
  catatan: string;
  status: "Terjadwal" | "Dibatalkan";
};

type Pemakaian = Record<QuotaKey, number>;

type AccountState = {
  akun: string; // "induk" atau nama cabang yang sedang dibuka
  cabangList: CabangInfo[];
  kotaUsaha: string; // lokasi toko awal (sebelum dan sesudah menjadi Cabang Utama)
  tokoPantau: string; // cabang yang persediaannya sedang dipantau dari akun induk
  plan: Plan; // satu langganan untuk seluruh usaha, dibeli akun induk
  profile: Profile;
  usage: Record<string, Pemakaian>; // pemakaian total, dihitung per akun
  harian: { tanggal: string; usage: Record<string, Pemakaian> }; // pemakaian hari ini, per akun
  sesiTambahan: number;
  sesi: SesiKonsultasi[];
};

const PEMAKAIAN_AWAL: Pemakaian = { scanStruk: 0, konsultasi: 0, eksporLaporan: 0, hargaCerdas: 0, aiBot: 0 };

// tanggal lokal YYYY-MM-DD, penanda reset kuota harian
function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT_STATE: AccountState = {
  akun: "induk",
  cabangList: [],
  kotaUsaha: "Bogor",
  tokoPantau: CABANG_UTAMA,
  plan: "gratis",
  profile: {
    nama: "Amil Labib",
    email: "amil@catalys.id",
    telepon: "0812-3456-7890",
    namaUsaha: "Catalys Demo UMKM",
    alamat: "Jl. Pajajaran No. 12, Bogor",
    jabatan: "Pemilik Usaha",
  },
  usage: { induk: { ...PEMAKAIAN_AWAL, scanStruk: 1 } },
  harian: { tanggal: hariIni(), usage: {} },
  sesiTambahan: 0,
  sesi: [],
};

export type AlasanTerkunci = { pesan: string; jenis: "peran" | "paket"; perluPeran?: Role };

type AccountCtx = Omit<AccountState, "usage"> & {
  role: Role;
  cabang: string; // nama cabang aktif ("" di akun induk)
  punyaCabang: boolean;
  usage: Pemakaian; // pemakaian kuota akun aktif
  kotaAkun: string; // kota akun aktif, untuk harga regional & supplier
  entitasSendiri: string; // entitas laporan akun aktif
  // toko yang data operasionalnya (produk, stok, bahan baku) sedang dipakai/dilihat
  tokoAktif: string;
  pantauToko: (nama: string) => void;
  // masuk sebagai pemilik usaha (akun induk), sekaligus memilih paket
  login: (email: string, plan?: Plan) => void;
  pindahAkun: (akun: string) => void;
  sisaSlotCabang: () => number | null; // null = tanpa batas
  bukaCabang: (c: { nama: string; kota: string; kotaUtama?: string }) => { ok: boolean; pesan?: string };
  setPlan: (plan: Plan) => boolean;
  updateProfile: (p: Partial<Profile>) => void;
  canSee: (f: FeatureKey) => boolean;
  canUse: (f: FeatureKey) => boolean;
  // alasan fitur tidak bisa dipakai (peran lebih dulu, lalu paket), null bila bisa
  alasanTerkunci: (f: FeatureKey) => AlasanTerkunci | null;
  quotaLimit: (q: QuotaKey) => number | null;
  quotaRemaining: (q: QuotaKey) => number | null;
  quotaPeriode: (q: QuotaKey) => PeriodeKuota;
  pakaiKuota: (q: QuotaKey, amount?: number) => boolean;
  beliSesiTambahan: (jumlah: number) => void;
  jadwalkanSesi: (s: Omit<SesiKonsultasi, "id" | "status">) => boolean;
  batalkanSesi: (id: string) => void;
};

const ctx = createContext<AccountCtx | undefined>(undefined);

function migrasiProfil(p: Partial<Profile> | undefined): Profile {
  const profil = { ...DEFAULT_STATE.profile, ...p };
  // nama lama aplikasi
  for (const k of Object.keys(profil) as (keyof Profile)[]) {
    profil[k] = String(profil[k]).replace(/arthami/gi, (m: string) => (m === m.toLowerCase() ? "catalys" : "Catalys"));
  }
  return profil;
}

function loadState(): AccountState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AccountState;
      // data sebelum kuota harian: angka pemakaian lama tidak cocok dengan batas baru, mulai dari nol
      // (sesi konsultasi yang sudah terjadwal tetap dihitung)
      const usage = s.harian
        ? s.usage
        : Object.fromEntries(Object.entries(s.usage ?? {}).map(([k, u]) => [k, { ...PEMAKAIAN_AWAL, konsultasi: u.konsultasi ?? 0 }]));
      return { ...DEFAULT_STATE, ...s, usage, profile: migrasiProfil(s.profile) };
    }
    // data model lama: pertahankan profil, paket, dan sesi; mulai lagi tanpa cabang
    const lama = localStorage.getItem(STORAGE_LAMA);
    if (lama) {
      const s = JSON.parse(lama);
      return {
        ...DEFAULT_STATE,
        plan: s.plan ?? DEFAULT_STATE.plan,
        profile: migrasiProfil(s.profile),
        usage: { induk: { ...PEMAKAIAN_AWAL, konsultasi: s.usage?.konsultasi ?? 0 } },
        sesiTambahan: s.sesiTambahan ?? 0,
        sesi: s.sesi ?? [],
      };
    }
  } catch {
    // abaikan, pakai default
  }
  return DEFAULT_STATE;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // abaikan
    }
  }, [state]);

  // daftar cabang dipakai mesin laporan; diperbarui sebelum anak-anak merender
  aturDaftarCabang(state.cabangList.map((c) => c.nama));

  const punyaCabang = state.cabangList.length > 0;
  const role: Role = state.akun === "induk" ? "induk" : "cabang";
  const cabang = role === "cabang" ? state.akun : "";
  const hari = hariIni();
  const usageAkun = { ...PEMAKAIAN_AWAL, ...state.usage[state.akun] };
  const usageHariIni = { ...PEMAKAIAN_AWAL, ...(state.harian.tanggal === hari ? state.harian.usage[state.akun] : undefined) };
  const kotaAkun = role === "cabang" ? (state.cabangList.find((c) => c.nama === cabang)?.kota ?? state.kotaUsaha) : state.kotaUsaha;
  // tanpa cabang, induk = usaha tunggal (Konsolidasi berisi Cabang Utama saja)
  const entitasSendiri = role === "induk" ? KONSOLIDASI : cabang;
  // cabang memakai tokonya sendiri; induk memantau salah satu cabang (awal: Cabang Utama)
  const tokoAktif =
    role === "cabang" ? cabang : state.cabangList.some((c) => c.nama === state.tokoPantau) ? state.tokoPantau : CABANG_UTAMA;

  // Usaha tanpa cabang: semua fitur peran terbuka di akun induk
  const canSee = (f: FeatureKey) => (role === "induk" && !punyaCabang) || FEATURES[f].roles.includes(role);
  const canUse = (f: FeatureKey) => canSee(f) && planAtLeast(state.plan, FEATURES[f].minPlan);
  const alasanTerkunci = (f: FeatureKey): AlasanTerkunci | null => {
    if (!canSee(f)) return { pesan: pesanPeran(FEATURES[f].roles), jenis: "peran", perluPeran: FEATURES[f].roles[0] };
    if (!planAtLeast(state.plan, FEATURES[f].minPlan)) return { pesan: lockedMessage(FEATURES[f].minPlan), jenis: "paket" };
    return null;
  };

  const quotaLimit = (q: QuotaKey) => {
    const base = QUOTA_LIMITS[q][state.plan];
    if (q === "konsultasi" && base !== null) return base + state.sesiTambahan;
    return base;
  };

  const quotaPeriode = (q: QuotaKey) => QUOTA_PERIODE[q][state.plan];

  // pemakaian yang dihitung terhadap batas: hari ini untuk kuota harian, total untuk lainnya
  const terpakai = (q: QuotaKey) => (quotaPeriode(q) === "harian" ? usageHariIni : usageAkun)[q];

  const quotaRemaining = (q: QuotaKey) => {
    const limit = quotaLimit(q);
    if (limit === null) return null;
    return Math.max(0, limit - terpakai(q));
  };

  // total dan hari ini dicatat bersamaan, agar pindah paket tetap memakai angka yang benar
  const ubahPemakaian = (s: AccountState, q: QuotaKey, delta: number): AccountState => {
    const tgl = hariIni();
    const total = { ...PEMAKAIAN_AWAL, ...s.usage[s.akun] };
    const harianLama = s.harian.tanggal === tgl ? s.harian.usage : {};
    const harian = { ...PEMAKAIAN_AWAL, ...harianLama[s.akun] };
    return {
      ...s,
      usage: { ...s.usage, [s.akun]: { ...total, [q]: Math.max(0, total[q] + delta) } },
      harian: { tanggal: tgl, usage: { ...harianLama, [s.akun]: { ...harian, [q]: Math.max(0, harian[q] + delta) } } },
    };
  };

  const pakaiKuota = (q: QuotaKey, amount = 1) => {
    const remaining = quotaRemaining(q);
    if (remaining !== null && remaining < amount) return false;
    setState((s) => ubahPemakaian(s, q, amount));
    return true;
  };

  const sisaSlotCabang = () => {
    const batas = BATAS_CABANG[state.plan];
    if (batas === null) return null;
    // Cabang Utama (toko awal) tidak dihitung
    const baru = state.cabangList.filter((c) => c.nama !== CABANG_UTAMA).length;
    return Math.max(0, batas - baru);
  };

  const value: AccountCtx = {
    ...state,
    role,
    cabang,
    punyaCabang,
    usage: usageAkun,
    kotaAkun,
    entitasSendiri,
    tokoAktif,
    pantauToko: (nama) => setState((s) => ({ ...s, tokoPantau: nama })),
    login: (email, plan) =>
      setState((s) => ({ ...s, akun: "induk", plan: plan ?? s.plan, profile: email ? { ...s.profile, email } : s.profile })),
    pindahAkun: (akun) =>
      setState((s) => (akun === "induk" || s.cabangList.some((c) => c.nama === akun) ? { ...s, akun } : s)),
    sisaSlotCabang,
    bukaCabang: ({ nama, kota, kotaUtama }) => {
      const n = nama.trim();
      if (role !== "induk") return { ok: false, pesan: "Hanya akun Induk yang dapat membuka cabang" };
      if (!n) return { ok: false, pesan: "Nama cabang wajib diisi" };
      if ([CABANG_UTAMA, KANTOR_PUSAT, KONSOLIDASI].includes(n) || state.cabangList.some((c) => c.nama.toLowerCase() === n.toLowerCase()))
        return { ok: false, pesan: "Nama cabang sudah dipakai" };
      const sisa = sisaSlotCabang();
      if (sisa !== null && sisa <= 0) return { ok: false, pesan: "Batas cabang paket Anda sudah tercapai" };
      const hari = new Date().toISOString().slice(0, 10);
      setState((s) => {
        // cabang pertama: toko awal ikut menjadi Cabang Utama beserta datanya
        const utama = s.cabangList.length ? [] : [{ nama: CABANG_UTAMA, kota: kotaUtama ?? s.kotaUsaha, dibuka: hari }];
        return {
          ...s,
          kotaUsaha: kotaUtama ?? s.kotaUsaha,
          cabangList: [...s.cabangList, ...utama, { nama: n, kota, dibuka: hari }],
        };
      });
      return { ok: true };
    },
    setPlan: (plan) => {
      // langganan hanya bisa diubah dari akun induk
      if (role !== "induk") return false;
      setState((s) => ({ ...s, plan }));
      return true;
    },
    updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
    canSee,
    canUse,
    alasanTerkunci,
    quotaLimit,
    quotaRemaining,
    quotaPeriode,
    pakaiKuota,
    beliSesiTambahan: (jumlah) => setState((s) => ({ ...s, sesiTambahan: s.sesiTambahan + jumlah })),
    jadwalkanSesi: (sesi) => {
      if (!pakaiKuota("konsultasi")) return false;
      setState((s) => ({
        ...s,
        sesi: [{ ...sesi, id: `sesi-${Date.now()}`, status: "Terjadwal" }, ...s.sesi],
      }));
      return true;
    },
    batalkanSesi: (id) =>
      setState((s) => {
        const target = s.sesi.find((x) => x.id === id);
        if (!target || target.status !== "Terjadwal") return s;
        // sesi yang dibatalkan mengembalikan kuota
        return {
          ...ubahPemakaian(s, "konsultasi", -1),
          sesi: s.sesi.map((x) => (x.id === id ? { ...x, status: "Dibatalkan" } : x)),
        };
      }),
  };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useAccount() {
  const c = useContext(ctx);
  if (!c) throw new Error("useAccount harus dipakai di dalam AccountProvider");
  return c;
}
