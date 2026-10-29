import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User2,
  CreditCard,
  Gauge,
  ShieldCheck,
  Receipt,
  Check,
  Crown,
  Mail,
  Phone,
  MapPin,
  Building2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount, type Profile } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { rayakan } from "../utils/efek";
import { resetDataDemo } from "../utils/resetDemo";
import { useJournal } from "../context/JournalContext";
import { useBusinessSector, SECTOR_OPTIONS } from "../context/BusinessSectorContext";
import Modal from "../components/Modal";
import {
  CATATAN_HARGA,
  PLANS,
  PLAN_LABEL,
  PLAN_ORDER,
  ROLE_LABEL,
  QUOTA_INFO,
  PERIODE_LABEL,
  type Plan,
  type QuotaKey,
} from "../config/access";

const TABS = [
  { key: "akun", label: "Informasi Akun", icon: User2 },
  { key: "paket", label: "Paket Langganan", icon: CreditCard },
  { key: "kuota", label: "Penggunaan Kuota", icon: Gauge },
  { key: "keamanan", label: "Keamanan", icon: ShieldCheck },
  { key: "tagihan", label: "Riwayat Tagihan", icon: Receipt },
  { key: "data", label: "Data Demo", icon: RotateCcw },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAGIHAN = [
  { no: "INV-2026-009", tanggal: "01 Sep 2026", paket: "Pro", jumlah: "Rp 105.000", status: "Lunas" },
  { no: "INV-2026-008", tanggal: "01 Agu 2026", paket: "Pro", jumlah: "Rp 105.000", status: "Lunas" },
  { no: "INV-2026-007", tanggal: "01 Jul 2026", paket: "Gratis", jumlah: "Rp 0", status: "Lunas" },
];

export default function Profil() {
  usePageTitle("Profil");
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam! : "akun";
  const account = useAccount();
  const { profile, role, cabang, plan } = account;

  const inisial = profile.nama
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Kartu identitas */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] p-6 text-white shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-2xl font-bold">
            {inisial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{profile.nama}</h2>
            <p className="text-white/75 text-sm">
              {profile.jabatan} · {profile.namaUsaha}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1">
                Akun {ROLE_LABEL[role]}
                {role === "cabang" ? ` · ${cabang}` : ""}
              </span>
              <span className="rounded-full bg-amber-300 text-amber-950 px-3 py-1 inline-flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Paket {PLAN_LABEL[plan]}
              </span>
            </div>
          </div>
          {plan !== "bisnis" && (
            <button
              onClick={() => setParams({ tab: "paket" })}
              className="self-start sm:self-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow hover:bg-white/90"
            >
              Upgrade Paket
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigasi tab */}
        <nav className="card-elegant lg:col-span-3 p-2 h-fit flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setParams({ tab: key })}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-9">
          {tab === "akun" && <TabAkun />}
          {tab === "paket" && <TabPaket />}
          {tab === "kuota" && <TabKuota />}
          {tab === "keamanan" && <TabKeamanan />}
          {tab === "tagihan" && <TabTagihan />}
          {tab === "data" && <TabDataDemo />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card-elegant p-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TabAkun() {
  const { profile, updateProfile } = useAccount();
  const { toast } = useToast();
  const [form, setForm] = useState<Profile>(profile);

  const fields: { key: keyof Profile; label: string; icon: typeof Mail; type?: string }[] = [
    { key: "nama", label: "Nama Lengkap", icon: User2 },
    { key: "jabatan", label: "Jabatan", icon: User2 },
    { key: "email", label: "Email", icon: Mail, type: "email" },
    { key: "telepon", label: "Nomor Telepon", icon: Phone },
    { key: "namaUsaha", label: "Nama Usaha", icon: Building2 },
    { key: "alamat", label: "Alamat Usaha", icon: MapPin },
  ];

  return (
    <Card title="Informasi Akun" desc="Perbarui data pribadi dan data usaha Anda.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile(form);
          toast("Profil berhasil disimpan");
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {fields.map(({ key, label, icon: Icon, type }) => (
          <label key={key} className={`flex flex-col gap-1.5 ${key === "alamat" ? "md:col-span-2" : ""}`}>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="relative">
              <Icon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </span>
          </label>
        ))}
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setForm(profile)}
            className="rounded-full border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95">
            Simpan Perubahan
          </button>
        </div>
      </form>
    </Card>
  );
}

function TabPaket() {
  const { plan, setPlan, role, pindahAkun } = useAccount();
  // langganan berlaku untuk seluruh usaha dan hanya bisa dibeli dari akun induk
  const bisaUbah = role === "induk";
  const { toast } = useToast();
  const navigate = useNavigate();

  const pilih = (p: Plan) => {
    // naik paket dirayakan dengan confetti
    if (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(plan)) rayakan("besar");
    setPlan(p);
    toast(`Paket ${PLAN_LABEL[p]} aktif. Fitur sudah disesuaikan.`);
    navigate("/dashboard");
  };

  return (
    <Card
      title="Paket Langganan"
      desc={
        bisaUbah
          ? "Satu langganan untuk seluruh usaha (induk dan semua cabang). Mode demo: memilih paket langsung mengaktifkannya tanpa pembayaran."
          : "Cabang memakai paket langganan akun Induk."
      }
    >
      {!bisaUbah && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-sm text-gray-700">
            <b className="text-primary">Dikelola akun Induk.</b> Hanya pemilik usaha di akun Induk yang dapat membeli atau mengubah paket.
          </p>
          <button
            onClick={() => {
              pindahAkun("induk");
              toast("Sekarang di akun Induk", "info");
            }}
            className="shrink-0 rounded-full btn-gradient px-4 py-2 text-sm font-semibold"
          >
            Pindah ke akun Induk
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const aktif = p.key === plan;
          const unggulan = p.key === "bisnis";
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border-2 p-5 transition-shadow hover:shadow-lg ${
                aktif ? "border-primary bg-primary/[0.03]" : "border-gray-100"
              }`}
            >
              {unggulan && (
                <span className="absolute -top-3 right-4 rounded-full bg-amber-300 px-3 py-0.5 text-[11px] font-bold text-amber-950">
                  Paling Lengkap
                </span>
              )}
              <h4 className="text-lg font-bold text-primary">{PLAN_LABEL[p.key]}</h4>
              <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{p.deskripsi}</p>
              {p.hargaNormal && (
                <p className="mt-3 text-xs text-gray-500">
                  <span className="line-through">{p.hargaNormal}</span>{" "}
                  <span className="font-semibold text-emerald-700">{CATATAN_HARGA}</span>
                </p>
              )}
              <p className={`${p.hargaNormal ? "mt-0.5" : "mt-3"} text-xl font-extrabold text-gray-900`}>{p.harga}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                {p.fitur.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={aktif || !bisaUbah}
                onClick={() => pilih(p.key)}
                className={`mt-5 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  aktif || !bisaUbah
                    ? "bg-gray-100 text-gray-500 cursor-default"
                    : "bg-primary text-white hover:opacity-95"
                }`}
              >
                {aktif ? "Paket Aktif" : bisaUbah ? "Pilih Paket" : "Dikelola akun Induk"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TabKuota() {
  const { quotaLimit, quotaRemaining, quotaPeriode, sesiTambahan } = useAccount();
  const keys: QuotaKey[] = ["scanStruk", "hargaCerdas", "aiBot", "konsultasi", "eksporLaporan"];
  return (
    <Card title="Penggunaan Kuota" desc="Sisa token untuk fitur berbatas pada paket Anda.">
      <div className="space-y-5">
        {keys.map((k) => {
          const limit = quotaLimit(k);
          const sisa = quotaRemaining(k);
          // bilah menunjukkan sisa kuota: penuh di awal periode, berkurang setiap dipakai
          const pct = limit ? Math.min(100, ((sisa ?? 0) / limit) * 100) : 0;
          const warna =
            limit === null
              ? "bg-emerald-500"
              : sisa === 0
                ? "bg-red-500"
                : sisa! / (limit || 1) < 0.2
                  ? "bg-amber-500"
                  : "bg-primary";
          return (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-800">{QUOTA_INFO[k].label}</span>
                <span className="text-gray-600">
                  {limit === null
                    ? "Tanpa batas"
                    : limit === 0
                      ? k === "konsultasi"
                        ? "Beli sesi di halaman Konsultasi"
                        : "Tidak termasuk paket"
                      : `Sisa ${sisa} dari ${limit} (${PERIODE_LABEL[quotaPeriode(k)]})`}
                </span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${warna}`}
                  style={{ width: limit === null ? "100%" : `${pct}%` }}
                />
              </div>
              {k === "konsultasi" && sesiTambahan > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Termasuk {sesiTambahan} sesi tambahan yang dibeli.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TabDataDemo() {
  const { cabangList, plan } = useAccount();
  const { entries } = useJournal();
  const { sector } = useBusinessSector();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [tampilkanTur, setTampilkanTur] = useState(true);
  const namaSektor = SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector;

  const ringkasan: [string, string][] = [
    ["Cabang dibuka", cabangList.length ? `${cabangList.length} (termasuk Cabang Utama)` : "Belum ada"],
    ["Jurnal yang diinput", `${entries.length} entri`],
    ["Paket aktif", PLAN_LABEL[plan]],
    ["Sektor bisnis", namaSektor],
  ];

  return (
    <Card
      title="Reset Data Demo"
      desc="Kembalikan aplikasi ke kondisi awal, misalnya sebelum presentasi. Hanya data di browser ini yang terhapus."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ringkasan.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <p className="text-xs text-gray-500">{k}</p>
            <p className="font-semibold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Yang akan dikembalikan ke awal:</p>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5">
          <li>Akun, paket, kuota, dan semua cabang</li>
          <li>Jurnal yang diinput dan pesanan Kasir</li>
          <li>Produk, stok, bahan baku, dan resep</li>
          <li>Bagan Akun dan sektor bisnis</li>
          <li>Karyawan, KPI, dan status gaji</li>
          <li>Portofolio pinjaman dan sesi konsultasi</li>
        </ul>
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={tampilkanTur}
          onChange={(e) => setTampilkanTur(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary"
        />
        Tampilkan lagi tur panduan setelah reset
      </label>

      <button
        onClick={() => setKonfirmasi(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Reset data demo
      </button>

      <Modal isOpen={konfirmasi} onClose={() => setKonfirmasi(false)} title="Reset data demo?">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Semua data yang sudah dimasukkan akan dihapus dan tidak bisa dikembalikan. Aplikasi akan dimuat ulang ke halaman login.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setKonfirmasi(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button onClick={() => resetDataDemo({ tampilkanTur })} className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold">
              Ya, reset
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function TabKeamanan() {
  const { toast } = useToast();
  const [form, setForm] = useState({ lama: "", baru: "", ulang: "" });
  const [error, setError] = useState("");
  return (
    <Card title="Keamanan" desc="Ganti kata sandi secara berkala untuk menjaga akun tetap aman.">
      <form
        className="max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.lama || !form.baru) return setError("Semua kolom wajib diisi.");
          if (form.baru.length < 8) return setError("Kata sandi baru minimal 8 karakter.");
          if (form.baru !== form.ulang) return setError("Konfirmasi kata sandi tidak cocok.");
          setError("");
          setForm({ lama: "", baru: "", ulang: "" });
          toast("Kata sandi berhasil diperbarui");
        }}
      >
        {(
          [
            ["lama", "Kata Sandi Lama"],
            ["baru", "Kata Sandi Baru"],
            ["ulang", "Ulangi Kata Sandi Baru"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <input
              type="password"
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95">
          Perbarui Kata Sandi
        </button>
      </form>
    </Card>
  );
}

function TabTagihan() {
  return (
    <Card title="Riwayat Tagihan">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4 font-medium">No. Tagihan</th>
              <th className="py-2 pr-4 font-medium">Tanggal</th>
              <th className="py-2 pr-4 font-medium">Paket</th>
              <th className="py-2 pr-4 font-medium text-right">Jumlah</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {TAGIHAN.map((t) => (
              <tr key={t.no} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium text-gray-800">{t.no}</td>
                <td className="py-3 pr-4 text-gray-600">{t.tanggal}</td>
                <td className="py-3 pr-4 text-gray-600">{t.paket}</td>
                <td className="py-3 pr-4 text-right text-gray-800">{t.jumlah}</td>
                <td className="py-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
