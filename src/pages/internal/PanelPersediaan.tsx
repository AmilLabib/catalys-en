import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Boxes, Plus, Pencil, Trash2, Search, ShoppingCart, Star, TrendingDown, AlertTriangle, MapPin, Store, ScanLine } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { useBahanBaku } from "../../context/BahanBakuContext";
import { useAccount } from "../../context/AccountContext";
import { useJournal } from "../../context/JournalContext";
import { useChartOfAccounts } from "../../context/ChartOfAccountsContext";
import { useInventory } from "../../context/InventoryContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/Modal";
import BrandIcon from "../../components/BrandIcon";
import ScanStruk, { type ScanStrukHandle } from "../../components/ScanStruk";
import type { TitikSupplier } from "../../components/PetaSupplier";
import {
  hariTersisa,
  linkMaps,
  linkShopee,
  statusStok,
  supplierBahan,
  trenStok,
  type BahanBaku,
  type SupplierBahan,
} from "../../data/bahanBaku";
import { formatRp } from "../../data/laporan";

const STATUS = {
  habis: { label: "Habis", cls: "bg-red-100 text-red-700", bar: "bg-red-500" },
  "hampir habis": { label: "Hampir habis", cls: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  aman: { label: "Aman", cls: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
} as const;

// Leaflet dimuat terpisah, hanya saat tab persediaan dibuka
const PetaSupplier = lazy(() => import("../../components/PetaSupplier"));

const urutStatus = { habis: 0, "hampir habis": 1, aman: 2 };
const angka = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 });

type FormBahan = Omit<BahanBaku, "id">;
const BAHAN_KOSONG: FormBahan = { nama: "", kategori: "", satuan: "kg", stok: 0, stokMin: 0, harga: 0, pakaiHarian: 0 };

export default function PanelPersediaan() {
  const { bahan, resep, tambahBahan, ubahBahan, hapusBahan, tambahStok } = useBahanBaku();
  const { kotaAkun, role, punyaCabang, cabangList, tokoAktif, pantauToko } = useAccount();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { products } = useInventory();
  const { toast } = useToast();
  // supplier mengikuti kota cabang yang sedang dipakai/dipantau
  const kota = cabangList.find((c) => c.nama === tokoAktif)?.kota ?? kotaAkun;

  const [cari, setCari] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [produkFilter, setProdukFilter] = useState("semua");
  const [hanyaMenipis, setHanyaMenipis] = useState(false);
  const [formBahan, setFormBahan] = useState<{ id: string | null; data: FormBahan } | null>(null);
  // tahap: konfirmasi sudah belanja -> pilih scan struk, atau catat manual
  const [beli, setBeli] = useState<{
    bahan: BahanBaku;
    supplier?: SupplierBahan;
    qty: number;
    harga: number;
    tahap: "konfirmasi" | "sudah" | "manual";
  } | null>(null);
  const scanRef = useRef<ScanStrukHandle>(null);
  const [supplierSemua, setSupplierSemua] = useState(false);

  const kategoriList = Array.from(new Set(bahan.map((b) => b.kategori)));
  // produk yang punya resep, untuk filter "dipakai untuk produk"
  const produkBerResep = products.filter((p) => (resep[p.name.toLowerCase()] ?? []).length > 0);

  const daftar = useMemo(() => {
    const q = cari.toLowerCase();
    const bahanProduk = produkFilter === "semua" ? null : new Set((resep[produkFilter] ?? []).map((r) => r.bahanId));
    return bahan
      .filter((b) => (kategori === "semua" || b.kategori === kategori) && b.nama.toLowerCase().includes(q))
      .filter((b) => !bahanProduk || bahanProduk.has(b.id))
      .filter((b) => !hanyaMenipis || statusStok(b) !== "aman")
      .sort((a, b) => urutStatus[statusStok(a)] - urutStatus[statusStok(b)] || hariTersisa(a) - hariTersisa(b));
  }, [bahan, resep, cari, kategori, produkFilter, hanyaMenipis]);

  const jumlahMenipis = bahan.filter((b) => statusStok(b) !== "aman").length;
  const nilaiTotal = bahan.reduce((s, b) => s + b.stok * b.harga, 0);

  // ---------- tren ----------
  const tren = useMemo(() => bahan.map((b) => ({ b, ...trenStok(b) })), [bahan]);
  const seringHabis = [...tren].sort((a, b) => b.kaliHampirHabis - a.kaliHampirHabis || hariTersisa(a.b) - hariTersisa(b.b)).slice(0, 4);
  const [trenId, setTrenId] = useState<string | null>(null);
  const trenAktif = tren.find((t) => t.b.id === trenId) ?? seringHabis[0];

  const catatPembelian = () => {
    if (!beli || beli.qty <= 0 || beli.harga <= 0) return toast("Isi jumlah dan harga pembelian", "info");
    const total = Math.round(beli.qty * beli.harga);
    tambahStok(beli.bahan.id, beli.qty, total);
    const id = (code: string) => accounts.find((a) => a.code === code)?.id;
    const persediaan = id("1.1.4.01");
    const kas = id("1.1.1.01");
    if (persediaan && kas) {
      const now = Date.now();
      setEntries([
        {
          id: `beli-${now}`,
          date: new Date().toISOString().slice(0, 10),
          description: `Pembelian ${beli.bahan.nama}${beli.supplier ? ` dari ${beli.supplier.nama}` : ""}`,
          lines: [
            { id: `${now}-1`, side: "debit", accountId: persediaan, amount: total },
            { id: `${now}-2`, side: "credit", accountId: kas, amount: total },
          ],
        },
        ...entries,
      ]);
    }
    toast(`Stok ${beli.bahan.nama} bertambah ${angka(beli.qty)} ${beli.bahan.satuan}`);
    setBeli(null);
  };

  const pilihan = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white";
  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";
  const supplierDitampilkan = supplierSemua ? daftar : daftar.slice(0, 4);

  // titik peta: satu penanda per toko, berisi semua bahan yang tersedia di sana
  const titikPeta = useMemo(() => {
    const m = new Map<string, TitikSupplier>();
    for (const b of daftar) {
      for (const sp of supplierBahan(b, kota)) {
        const t = m.get(sp.nama) ?? { supplier: sp, bahan: [] };
        if (sp.jarakKm < t.supplier.jarakKm) t.supplier = sp;
        t.bahan.push({ bahan: b, supplier: sp });
        m.set(sp.nama, t);
      }
    }
    return [...m.values()];
  }, [daftar, kota]);

  return (
    <div className="space-y-6">
      {/* Akun induk memantau persediaan salah satu cabang (kantor pusat tidak menyimpan stok) */}
      {role === "induk" && punyaCabang && (
        <section className="card-elegant p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary shrink-0">
            <Store className="w-4 h-4" /> Pantau persediaan cabang
          </div>
          <div className="flex flex-wrap gap-2">
            {cabangList.map((c) => (
              <button
                key={c.nama}
                onClick={() => pantauToko(c.nama)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tokoAktif === c.nama ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-[#9cb2c1]"
                }`}
              >
                {c.nama.replace("Cabang ", "")}
                <span className={`ml-1.5 ${tokoAktif === c.nama ? "text-white/70" : "text-gray-400"}`}>{c.kota}</span>
              </button>
            ))}
          </div>
          <p className="sm:ml-auto text-xs text-gray-500">Perubahan stok di sini tercatat di cabang yang dipilih.</p>
        </section>
      )}

      {/* ---------- Daftar persediaan ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daftar Persediaan Bahan Baku</h2>
              <p className="text-sm text-gray-500">
                {bahan.length} bahan · nilai {formatRp(Math.round(nilaiTotal))} ·{" "}
                <span className={jumlahMenipis ? "text-amber-700 font-medium" : ""}>{jumlahMenipis} hampir habis</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setFormBahan({ id: null, data: { ...BAHAN_KOSONG, kategori: kategoriList[0] ?? "" } })}
            className="inline-flex items-center gap-1.5 rounded-lg btn-gradient px-3 py-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Tambah bahan
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari bahan..." className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-52" />
          </div>
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} className={pilihan} aria-label="Kategori">
            <option value="semua">Semua kategori</option>
            {kategoriList.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select value={produkFilter} onChange={(e) => setProdukFilter(e.target.value)} className={pilihan} aria-label="Dipakai untuk produk">
            <option value="semua">Dipakai untuk semua produk</option>
            {produkBerResep.map((p) => (
              <option key={p.id} value={p.name.toLowerCase()}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hanyaMenipis} onChange={(e) => setHanyaMenipis(e.target.checked)} /> Hanya yang hampir habis
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4 font-medium">Bahan</th>
                <th className="py-2 pr-4 font-medium">Stok</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Habis dalam</th>
                <th className="py-2 pr-4 font-medium text-right">Harga rata-rata</th>
                <th className="py-2 pr-4 font-medium text-right">Nilai stok</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((b) => {
                const st = statusStok(b);
                const hari = hariTersisa(b);
                const pct = Math.min(100, (b.stok / Math.max(b.stokMin * 2, 0.0001)) * 100);
                return (
                  <tr key={b.id} className={`border-b last:border-0 ${st !== "aman" ? "bg-amber-50/40" : ""}`}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{b.nama}</p>
                      <p className="text-[11px] text-gray-500">{b.kategori}</p>
                    </td>
                    <td className="py-2.5 pr-4 w-48">
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {angka(b.stok)} <span className="font-normal text-gray-500">{b.satuan}</span>
                      </p>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden" title={`Batas minimum ${angka(b.stokMin)} ${b.satuan}`}>
                        <div className={`h-full rounded-full ${STATUS[st].bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">min. {angka(b.stokMin)} {b.satuan}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                    </td>
                    <td className={`py-2.5 pr-4 text-right whitespace-nowrap ${hari < 4 ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                      {Number.isFinite(hari) ? `${Math.max(0, Math.floor(hari))} hari` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums whitespace-nowrap">
                      {formatRp(b.harga)}/{b.satuan}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatRp(Math.round(b.stok * b.harga))}</td>
                    <td className="py-2.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setBeli({ bahan: b, qty: Math.max(1, Math.round(b.stokMin)), harga: b.harga, tahap: "manual" })}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Beli
                      </button>
                      <button
                        aria-label="Ubah bahan"
                        onClick={() => {
                          const { id, ...data } = b;
                          setFormBahan({ id, data });
                        }}
                        className="ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        aria-label="Hapus bahan"
                        onClick={() => {
                          if (confirm(`Hapus ${b.nama} dari persediaan?`)) hapusBahan(b.id);
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                    Tidak ada bahan yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Supplier ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Supplier Terdekat</h2>
              <p className="text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 inline -mt-0.5" /> Sekitar {kota} · 3 pilihan per bahan, urut dari yang terdekat. Mengikuti filter daftar persediaan.
              </p>
            </div>
          </div>
        </div>
        <div className="mb-6" data-tour="peta-supplier">
          <Suspense fallback={<div className="shimmer h-80 rounded-2xl bg-gray-100" />}>
            <PetaSupplier
              kota={kota}
              titik={titikPeta}
              onBeli={(b, sp) => setBeli({ bahan: b, supplier: sp, qty: Math.max(1, Math.round(b.stokMin)), harga: sp.harga, tahap: "konfirmasi" })}
            />
          </Suspense>
          <p className="mt-2 text-xs text-gray-500">
            {titikPeta.length} supplier di sekitar {kota}. Klik penanda untuk melihat bahan yang tersedia. Lokasi adalah data contoh.
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {supplierDitampilkan.map((b) => {
              const st = statusStok(b);
              return (
                <div key={b.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{b.nama}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[st].cls}`}>
                      {angka(b.stok)} {b.satuan}
                    </span>
                    <a
                      href={linkShopee(b)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <BrandIcon brand="shopee" size={14} /> Cari di Shopee
                    </a>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {supplierBahan(b, kota).map((s) => (
                      <div key={s.nama} className="rounded-xl border bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-28 bg-gray-100">
                          <img src={s.foto.src} alt={`Ilustrasi ${s.jenis.toLowerCase()}`} loading="lazy" className="h-full w-full object-cover" />
                          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
                            {s.jenis}
                          </span>
                          <a
                            href={s.foto.sumber}
                            target="_blank"
                            rel="noreferrer"
                            title={`Foto ilustrasi: ${s.foto.penulis}, ${s.foto.lisensi}, via Wikimedia Commons`}
                            className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-md bg-black/45 px-1.5 py-0.5 text-[9px] text-white/90 hover:bg-black/65"
                          >
                            Foto: {s.foto.penulis} · {s.foto.lisensi}
                          </a>
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{s.nama}</p>
                            <p className="text-[11px] text-gray-500">{s.jenis}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-base font-bold text-primary">
                          {formatRp(s.harga)}
                          <span className="text-xs font-normal text-gray-500">/{b.satuan}</span>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {s.jarakKm} km · {s.kecamatan} · <Star className="w-3 h-3 inline fill-amber-400 text-amber-400 -mt-0.5" /> {s.rating}
                        </p>
                        <p className="text-[11px] text-gray-400">{s.minOrder}</p>
                        <div className="mt-auto pt-3 flex gap-1.5">
                          <a
                            href={linkMaps(s)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <BrandIcon brand="googlemaps" size={13} /> Maps
                          </a>
                          <button
                            onClick={() => setBeli({ bahan: b, supplier: s, qty: Math.max(1, Math.round(b.stokMin)), harga: s.harga, tahap: "konfirmasi" })}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Beli
                          </button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {daftar.length > 4 && (
              <button onClick={() => setSupplierSemua((v) => !v)} className="text-sm font-medium text-primary hover:underline">
                {supplierSemua ? "Tampilkan 4 bahan teratas saja" : `Tampilkan supplier untuk ${daftar.length} bahan`}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <ScanStruk ref={scanRef} hanyaPembelian />
            <p className="text-xs text-gray-500 px-1">
              Setelah belanja di supplier atau Shopee, foto struknya di sini. Barang yang cocok dengan bahan baku langsung menambah stok dan harga
              rata-rata, lalu dipakai otomatis di perhitungan HPP.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Tren persediaan ---------- */}
      <section className="card-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tren Persediaan 12 Minggu</h2>
              <p className="text-sm text-gray-500">Area = sisa stok, batang = pemakaian per minggu, garis putus = batas minimum.</p>
            </div>
          </div>
          {trenAktif && (
            <select value={trenAktif.b.id} onChange={(e) => setTrenId(e.target.value)} className={pilihan} aria-label="Pilih bahan">
              {bahan.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
          )}
        </div>
        {trenAktif && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trenAktif.titik}>
                  <defs>
                    <linearGradient id="gradStok" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f6b8f" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2f6b8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="minggu" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis width={48} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(v: number, n: string) => [`${angka(v)} ${trenAktif.b.satuan}`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pakai" name="Pemakaian" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
                  <Area type="monotone" dataKey="stok" name="Sisa stok" stroke="#2f6b8f" strokeWidth={2.5} fill="url(#gradStok)" />
                  <ReferenceLine y={trenAktif.b.stokMin} stroke="#9cb2c1" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Paling sering hampir habis
              </h3>
              <ul className="space-y-2">
                {seringHabis.map((t) => (
                  <li key={t.b.id}>
                    <button
                      onClick={() => setTrenId(t.b.id)}
                      className={`w-full text-left rounded-xl border p-3 hover:bg-gray-50 ${trenAktif.b.id === t.b.id ? "border-primary bg-primary/[0.03]" : ""}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{t.b.nama}</p>
                      <p className="text-xs text-gray-600">
                        {t.kaliHampirHabis}x menyentuh batas minimum dalam 12 minggu · rata-rata pakai {angka(t.b.pakaiHarian * 7)} {t.b.satuan}/minggu
                      </p>
                      <p className={`text-xs mt-0.5 ${hariTersisa(t.b) < 7 ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        Stok sekarang cukup ±{Math.max(0, Math.floor(hariTersisa(t.b)))} hari
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              {seringHabis[0] && (
                <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  Saran: naikkan batas minimum {seringHabis[0].b.nama} ke {angka(Math.ceil(seringHabis[0].b.pakaiHarian * 7))} {seringHabis[0].b.satuan} (kebutuhan
                  1 minggu) dan jadwalkan pembelian rutin supaya tidak kehabisan saat jam ramai.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------- modal tambah/ubah bahan ---------- */}
      <Modal isOpen={!!formBahan} onClose={() => setFormBahan(null)} title={formBahan?.id ? "Ubah Bahan Baku" : "Tambah Bahan Baku"}>
        {formBahan && (
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["nama", "Nama bahan", "text", 2],
                ["kategori", "Kategori", "text", 1],
                ["satuan", "Satuan (kg, liter, pcs)", "text", 1],
                ["stok", "Stok saat ini", "number", 1],
                ["stokMin", "Batas hampir habis", "number", 1],
                ["harga", "Harga beli per satuan", "number", 1],
                ["pakaiHarian", "Rata-rata pemakaian per hari", "number", 1],
              ] as const
            ).map(([k, label, type, span]) => (
              <label key={k} className={span === 2 ? "col-span-2" : ""}>
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type={type}
                  step="any"
                  min={0}
                  value={formBahan.data[k] as string | number}
                  onChange={(e) =>
                    setFormBahan({ ...formBahan, data: { ...formBahan.data, [k]: type === "number" ? Number(e.target.value) : e.target.value } })
                  }
                  className={input}
                />
              </label>
            ))}
            <button
              className="col-span-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                if (!formBahan.data.nama.trim()) return toast("Nama bahan wajib diisi", "info");
                if (formBahan.id) ubahBahan(formBahan.id, formBahan.data);
                else tambahBahan(formBahan.data);
                toast(formBahan.id ? "Bahan diperbarui" : "Bahan ditambahkan");
                setFormBahan(null);
              }}
            >
              Simpan
            </button>
          </div>
        )}
      </Modal>

      {/* ---------- modal beli: konfirmasi belanja di supplier, lalu scan struk ---------- */}
      <Modal isOpen={!!beli} onClose={() => setBeli(null)} title={beli?.tahap === "manual" ? `Catat pembelian ${beli.bahan.nama}` : `Beli ${beli?.bahan.nama ?? ""}`}>
        {beli && beli.supplier && beli.tahap !== "manual" && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border p-3">
              <img src={beli.supplier.foto.src} alt="" className="w-24 h-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-gray-900">{beli.supplier.nama}</p>
                <p className="text-xs text-gray-500">
                  {beli.supplier.jenis} · {beli.supplier.jarakKm} km · {beli.supplier.kecamatan}
                </p>
                <p className="mt-1 font-bold text-primary">
                  {formatRp(beli.supplier.harga)}
                  <span className="text-xs font-normal text-gray-500">/{beli.bahan.satuan} · {beli.supplier.minOrder}</span>
                </p>
              </div>
            </div>
            <a
              href={linkMaps(beli.supplier)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <BrandIcon brand="googlemaps" size={15} /> Buka rute ke toko di Google Maps
            </a>

            {beli.tahap === "konfirmasi" ? (
              <div className="rounded-2xl bg-primary/5 p-4 text-center">
                <p className="font-semibold text-gray-900">Apakah Anda sudah melakukan pembelian?</p>
                <p className="mt-1 text-xs text-gray-500">
                  Setelah berbelanja, scan struknya supaya stok dan jurnal pembelian tercatat otomatis.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => setBeli(null)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Belum, nanti saja
                  </button>
                  <button onClick={() => setBeli({ ...beli, tahap: "sudah" })} className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold">
                    Sudah
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setBeli(null);
                    scanRef.current?.buka("pembelian");
                  }}
                  className="btn-gradient w-full rounded-2xl p-4 text-left flex items-center gap-3"
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                    <ScanLine className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block font-bold">Scan Struk Pembelian</span>
                    <span className="block text-xs text-white/75">Foto struk dari {beli.supplier.nama}, stok bertambah otomatis.</span>
                  </span>
                </button>
                <button
                  onClick={() => setBeli({ ...beli, tahap: "manual" })}
                  className="w-full text-center text-xs font-medium text-primary hover:underline"
                >
                  Tidak ada struk? Catat manual
                </button>
              </div>
            )}
          </div>
        )}
        {beli && (!beli.supplier || beli.tahap === "manual") && (
          <div className="space-y-4">
            {beli.supplier && (
              <p className="text-sm text-gray-600">
                Dari <b>{beli.supplier.nama}</b> ({beli.supplier.jarakKm} km, {beli.supplier.kecamatan})
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="text-sm text-gray-700">Jumlah ({beli.bahan.satuan})</span>
                <input type="number" min={0} step="any" value={beli.qty} onChange={(e) => setBeli({ ...beli, qty: Number(e.target.value) })} className={input} />
              </label>
              <label>
                <span className="text-sm text-gray-700">Harga per {beli.bahan.satuan}</span>
                <input type="number" min={0} value={beli.harga} onChange={(e) => setBeli({ ...beli, harga: Number(e.target.value) })} className={input} />
              </label>
            </div>
            <div className="rounded-xl bg-primary/5 p-3 text-sm flex justify-between">
              <span>Total pembelian</span>
              <b>{formatRp(Math.round(beli.qty * beli.harga))}</b>
            </div>
            <p className="text-xs text-gray-500">
              Stok bertambah, harga rata-rata diperbarui, dan jurnal pembelian (Persediaan / Kas) dicatat otomatis.
            </p>
            <div className="flex justify-end gap-2">
              {beli.supplier && (
                <a href={linkMaps(beli.supplier)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm">
                  <BrandIcon brand="googlemaps" size={14} /> Rute ke toko
                </a>
              )}
              <button onClick={catatPembelian} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
                Catat Pembelian
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
