// Endpoint scan struk: foto struk -> daftar barang (nama, qty, total harga) via Gemini.
// Dipakai dua tempat: Vercel Function (file ini otomatis jadi /api/scan-struk)
// dan server Express lokal (src/server/index.js).

// Flash-Lite: model Gemini termurah yang tetap bisa membaca gambar & keluaran JSON
const MODEL_DEFAULT = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAKS_KATALOG = 60;
const MAKS_FOTO = 4_000_000; // panjang data URL, batas body Vercel 4,5 MB

const skema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          qty: { type: "NUMBER" },
          // teks apa adanya: model sering membaca "112.500" sebagai 112,5
          price: { type: "STRING" },
          discount: { type: "STRING" },
        },
        required: ["name", "qty", "price"],
      },
    },
    receiptDiscount: { type: "STRING" },
  },
  required: ["items"],
};

// "112.500" / "Rp 112.500,00" / "-10.000" -> 112500 (titik & koma Rupiah = pemisah ribuan, sen dibuang, nilai selalu positif)
const keRupiah = (teks) => Number(String(teks ?? "").replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "")) || 0;

import { fetchGeminiWithRotation } from "./gemini-keys.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { foto, jenis, katalog } = req.body ?? {};
  const cocok = typeof foto === "string" && foto.length <= MAKS_FOTO && /^data:(image\/[a-z+]+);base64,(.+)$/.exec(foto);
  if (!cocok) return res.status(400).json({ error: "Foto struk tidak valid atau terlalu besar." });

  const daftar = Array.isArray(katalog) ? katalog.filter((x) => typeof x === "string").slice(0, MAKS_KATALOG) : [];
  // Prompt dibuat terarah agar mendeteksi diskon per item & diskon total struk
  const prompt =
    `Baca foto struk ${jenis === "penjualan" ? "penjualan" : "pembelian"} ini secara teliti. ` +
    "Ekstrak setiap barang yang dibeli/dijual ke dalam items: " +
    "- name: nama barang. " +
    "- qty: kuantitas/jumlah barang (angka, default 1). " +
    "- price: total harga baris barang sebelum dipotong diskon barang (salin angka persis seperti tertulis; titik adalah pemisah ribuan). " +
    "- discount: nominal diskon atau potongan harga khusus untuk barang tersebut bila ada (misal baris Disc/Promo/Hemat di bawah item), atau '0' jika tidak ada diskon per barang. " +
    "Jika ada diskon keseluruhan transaksi, voucher, promo member, kupon, atau potongan belanja di bagian bawah/subtotal struk, masukkan nominalnya ke receiptDiscount (atau '0' bila tidak ada). " +
    "Jangan masukkan baris diskon/voucher sebagai barang di items. " +
    "Abaikan subtotal, total akhir, pajak, kembalian, dan metode pembayaran. " +
    (daftar.length ? `Bila barang sama dengan nama di katalog, pakai nama katalog persis. Katalog: ${daftar.join("; ")}. ` : "") +
    "Bila gambar bukan struk, kembalikan items kosong dan receiptDiscount '0'.";

  let data = null;
  try {
    const payload = {
      contents: [{ parts: [{ inline_data: { mime_type: cocok[1], data: cocok[2] } }, { text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: skema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const result = await fetchGeminiWithRotation(payload);
    data = result.data;
  } catch (err) {
    console.error("Scan struk error:", err);
    return res.status(500).json({ error: err.message || "Gagal membaca struk." });
  }

  try {
    const teks = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[],"receiptDiscount":"0"}';
    let parsed = { items: [], receiptDiscount: "0" };
    try {
      parsed = JSON.parse(teks);
    } catch {
      parsed = { items: [] };
    }

    let receiptDiscount = keRupiah(parsed.receiptDiscount);
    const items = [];

    for (const i of parsed.items ?? []) {
      const rawName = String(i.name ?? "").trim();
      if (!rawName) continue;

      const p = keRupiah(i.price);
      const d = keRupiah(i.discount);

      // Tangani kasus jika model memasukkan baris diskon umum/voucher sebagai item
      if (/^(diskon|disc|voucher|potongan|hemat|cashback|promo)\b/i.test(rawName)) {
        receiptDiscount += p || d;
        continue;
      }

      items.push({
        name: rawName,
        qty: Number(i.qty) || 1,
        price: p,
        discount: d,
      });
    }

    res.status(200).json({
      items,
      receiptDiscount,
      token: data.usageMetadata?.totalTokenCount,
    });
  } catch (err) {
    console.error("Scan struk error:", err);
    res.status(500).json({ error: "Gagal membaca struk." });
  }
}
