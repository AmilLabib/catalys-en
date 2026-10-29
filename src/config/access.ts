// Aturan akses fitur: peran akun (induk/cabang) dan paket langganan.
// Usaha yang belum punya cabang memakai semua fitur dari akun induk.
// Setelah membuka cabang, fitur dibagi per peran. Semua menu tetap terlihat;
// fitur di luar peran atau paket memunculkan popup peringatan saat dibuka.

export type Role = "induk" | "cabang";
export type Plan = "gratis" | "pro" | "bisnis";

export type FeatureKey =
  | "beranda"
  | "kasir"
  | "hargaCerdas"
  | "baganAkun"
  | "laporanKeuangan"
  | "jurnal"
  | "manajemenInternal"
  | "audit"
  | "konsultasi"
  | "umkmBerkembang"
  | "permodalan"
  | "profil";

export type FeatureDef = {
  label: string;
  path: string;
  minPlan: Plan;
  roles: Role[];
};

export const PLAN_ORDER: Plan[] = ["gratis", "pro", "bisnis"];

export const PLAN_LABEL: Record<Plan, string> = {
  gratis: "Gratis",
  pro: "Pro",
  bisnis: "Bisnis",
};

export const ROLE_LABEL: Record<Role, string> = {
  induk: "Induk",
  cabang: "Cabang",
};

const BOTH: Role[] = ["induk", "cabang"];

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  beranda: { label: "Beranda", path: "/dashboard", minPlan: "gratis", roles: BOTH },
  kasir: { label: "Kasir POS", path: "/kasir", minPlan: "gratis", roles: ["cabang"] },
  hargaCerdas: { label: "Smart Pricing", path: "/smart-pricing", minPlan: "pro", roles: ["cabang"] },
  baganAkun: { label: "Bagan Akun", path: "/chart-of-accounts", minPlan: "gratis", roles: ["cabang"] },
  laporanKeuangan: { label: "Laporan Keuangan", path: "/financial", minPlan: "gratis", roles: BOTH },
  jurnal: { label: "Entri Jurnal", path: "/jurnal", minPlan: "gratis", roles: BOTH },
  // tab di dalamnya dikunci per paket, lihat INTERNAL_TAB_PLAN
  manajemenInternal: { label: "Manajemen Internal", path: "/internal-management", minPlan: "gratis", roles: BOTH },
  audit: { label: "Audit Berbasis Data", path: "/data-driven", minPlan: "pro", roles: ["induk"] },
  // sesi konsultasi dijual terpisah untuk semua paket; Bisnis mendapat 1 sesi gratis
  konsultasi: { label: "Konsultasi", path: "/konsultasi", minPlan: "gratis", roles: ["induk"] },
  umkmBerkembang: { label: "UMKM Berkembang", path: "/umkm-berkembang", minPlan: "gratis", roles: ["induk"] },
  permodalan: { label: "Permodalan", path: "/permodalan", minPlan: "gratis", roles: ["induk"] },
  profil: { label: "Profil", path: "/profil", minPlan: "gratis", roles: BOTH },
};

export function planAtLeast(plan: Plan, min: Plan) {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

export function pesanPeran(roles: Role[]) {
  return `Hanya tersedia di akun ${roles.map((r) => ROLE_LABEL[r]).join(" dan ")}`;
}

export function lockedMessage(min: Plan) {
  return min === "pro"
    ? "Hanya tersedia di paket Pro dan Bisnis"
    : `Hanya tersedia di paket ${PLAN_LABEL[min]}`;
}

// Tab Manajemen Internal yang dibuka tiap paket
export type InternalTab = "inventaris" | "penggajian" | "pemasaran";
export const INTERNAL_TAB_PLAN: Record<InternalTab, Plan> = {
  inventaris: "gratis",
  penggajian: "pro",
  pemasaran: "bisnis",
};

// Kuota pemakaian per paket. null = tanpa batas.
export type QuotaKey = "scanStruk" | "konsultasi" | "eksporLaporan" | "hargaCerdas" | "aiBot";

export const QUOTA_LIMITS: Record<QuotaKey, Record<Plan, number | null>> = {
  scanStruk: { gratis: 3, pro: 8, bisnis: 20 },
  konsultasi: { gratis: 0, pro: 0, bisnis: 1 },
  eksporLaporan: { gratis: 3, pro: null, bisnis: null },
  hargaCerdas: { gratis: 0, pro: 3, bisnis: 5 },
  aiBot: { gratis: 2, pro: 20, bisnis: null },
};

// Kuota "harian" terisi lagi setiap hari; kuota "total" hanya sekali pakai
// (paket Gratis sebagai jatah coba, sesi konsultasi bisa ditambah dengan membeli).
export type PeriodeKuota = "harian" | "total";

export const QUOTA_PERIODE: Record<QuotaKey, Record<Plan, PeriodeKuota>> = {
  scanStruk: { gratis: "total", pro: "harian", bisnis: "harian" },
  konsultasi: { gratis: "total", pro: "total", bisnis: "total" },
  eksporLaporan: { gratis: "total", pro: "total", bisnis: "total" },
  hargaCerdas: { gratis: "total", pro: "harian", bisnis: "harian" },
  aiBot: { gratis: "total", pro: "harian", bisnis: "harian" },
};

export const PERIODE_LABEL: Record<PeriodeKuota, string> = { harian: "hari ini", total: "total" };

export const QUOTA_INFO: Record<QuotaKey, { label: string }> = {
  scanStruk: { label: "Scan Struk" },
  konsultasi: { label: "Sesi Konsultasi" },
  eksporLaporan: { label: "Ekspor Laporan" },
  hargaCerdas: { label: "Pencarian Smart Pricing" },
  aiBot: { label: "Pesan AI Bot" },
};

// Pesan saat kuota habis, mengikuti periode dan paket aktif
export function pesanKuotaHabis(q: QuotaKey, plan: Plan) {
  const label = QUOTA_INFO[q].label;
  if (QUOTA_PERIODE[q][plan] === "harian")
    return `Kuota ${label} hari ini habis, terisi lagi besok.${plan === "bisnis" ? "" : " Upgrade ke paket Bisnis untuk kuota lebih besar."}`;
  return `Kuota ${label} paket ${PLAN_LABEL[plan]} sudah habis. Upgrade ke paket Pro untuk kuota harian.`;
}

// Harga perkenalan 2027 (diskon 30%), harga normal berlaku mulai 2028
export const CATATAN_HARGA = "Harga perkenalan 2027, diskon 30%";

// Sesi konsultasi tambahan, dijual terpisah dari paket
export const PAKET_SESI = { jumlah: 2, harga: "Rp 249.000" };

export type PlanDef = {
  key: Plan;
  harga: string;
  hargaNormal?: string;
  deskripsi: string;
  fitur: string[];
};

export const PLANS: PlanDef[] = [
  {
    key: "gratis",
    harga: "Rp 0",
    deskripsi: "Fitur dasar untuk mulai mencatat usaha.",
    fitur: [
      "Kasir POS, Bagan Akun, dan Entri Jurnal",
      "Manajemen Internal: Persediaan",
      "Laporan Keuangan (scan struk 3x, ekspor 3x)",
      "UMKM Berkembang dan Permodalan (rilis 2028)",
      "AI Bot 2x",
      "Sesi konsultasi dijual terpisah",
    ],
  },
  {
    key: "pro",
    harga: "Rp 105.000 / bulan",
    hargaNormal: "Rp 150.000",
    deskripsi: "Untuk usaha yang butuh otomatisasi harian dan analisis data.",
    fitur: [
      "Semua fitur Gratis",
      "Smart Pricing 3x per hari (rilis 2028)",
      "Manajemen Internal: Persediaan & Sumber Daya",
      "Scan struk 8x per hari, ekspor tanpa batas",
      "Audit Berbasis Data (rilis 2028)",
      "Hingga 3 cabang",
      "AI Bot 20x per hari",
      "Sesi konsultasi dijual terpisah",
    ],
  },
  {
    key: "bisnis",
    harga: "Rp 245.000 / bulan",
    hargaNormal: "Rp 350.000",
    deskripsi: "Paket lengkap dengan pemasaran, konsultasi, dan cabang tanpa batas.",
    fitur: [
      "Semua fitur Pro",
      "Smart Pricing 5x per hari (rilis 2028)",
      "Manajemen Internal: Persediaan, Sumber Daya & Pemasaran",
      "Scan struk 20x per hari",
      "Gratis 1x sesi konsultasi",
      "Cabang tanpa batas",
      "AI Bot tanpa batas",
    ],
  },
];

// ---------- Cabang ----------

// Toko awal otomatis menjadi cabang ini saat usaha membuka cabang pertamanya
export const CABANG_UTAMA = "Cabang Utama";
export const KANTOR_PUSAT = "Kantor Pusat";

// Jumlah cabang baru yang boleh dibuka (di luar Cabang Utama). null = tanpa batas.
// Pro: 3 cabang total = Cabang Utama + 2 cabang baru
export const BATAS_CABANG: Record<Plan, number | null> = { gratis: 0, pro: 2, bisnis: null };

export type CabangInfo = { nama: string; kota: string; dibuka: string };
