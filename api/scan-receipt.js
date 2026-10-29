// Receipt scan endpoint: receipt photo -> item list (name, qty, line total) via Gemini.
// Used in two places: Vercel Function (this file automatically becomes /api/scan-receipt)
// and the local Express server (src/server/index.js).

// Flash-Lite: the cheapest Gemini model that can still read images & output JSON
const MODEL_DEFAULT = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_CATALOG = 60;
const MAX_PHOTO = 4_000_000; // data URL length, Vercel body limit is 4.5 MB

const schema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          qty: { type: "NUMBER" },
          // raw text: the model often reads "112.500" as 112.5
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

// "112.500" / "Rp 112.500,00" / "-10.000" -> 112500 (Rupiah dots & commas = thousands separators, cents dropped, value always positive)
const toRupiah = (text) => Number(String(text ?? "").replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "")) || 0;

import { fetchGeminiWithRotation } from "./gemini-keys.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { photo, kind, catalog } = req.body ?? {};
  const match = typeof photo === "string" && photo.length <= MAX_PHOTO && /^data:(image\/[a-z+]+);base64,(.+)$/.exec(photo);
  if (!match) return res.status(400).json({ error: "The receipt photo is invalid or too large." });

  const list = Array.isArray(catalog) ? catalog.filter((x) => typeof x === "string").slice(0, MAX_CATALOG) : [];
  // The prompt is targeted so it detects per-item discounts & whole-receipt discounts
  const prompt =
    `Read this ${kind === "sale" ? "sales" : "purchase"} receipt photo carefully. ` +
    "Extract every item bought/sold into items: " +
    "- name: item name. " +
    "- qty: item quantity (number, default 1). " +
    "- price: the item line total before the item discount (copy the number exactly as written; dots are thousands separators). " +
    "- discount: the discount or price reduction for that item if any (e.g. a Disc/Promo/Hemat line under the item), or '0' if there is no per-item discount. " +
    "If there is a whole-transaction discount, voucher, member promo, coupon, or shopping discount at the bottom/subtotal of the receipt, put its amount in receiptDiscount (or '0' if none). " +
    "Do not include discount/voucher lines as items. " +
    "Ignore subtotal, grand total, tax, change, and payment method. " +
    (list.length ? `If an item matches a name in the catalog, use the exact catalog name. Catalog: ${list.join("; ")}. ` : "") +
    "If the image is not a receipt, return empty items and receiptDiscount '0'.";

  let data = null;
  try {
    const payload = {
      contents: [{ parts: [{ inline_data: { mime_type: match[1], data: match[2] } }, { text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const result = await fetchGeminiWithRotation(payload);
    data = result.data;
  } catch (err) {
    console.error("Receipt scan error:", err);
    return res.status(500).json({ error: err.message || "Failed to read the receipt." });
  }

  try {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[],"receiptDiscount":"0"}';
    let parsed = { items: [], receiptDiscount: "0" };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { items: [] };
    }

    let receiptDiscount = toRupiah(parsed.receiptDiscount);
    const items = [];

    for (const i of parsed.items ?? []) {
      const rawName = String(i.name ?? "").trim();
      if (!rawName) continue;

      const p = toRupiah(i.price);
      const d = toRupiah(i.discount);

      // Handle the case where the model puts a general discount/voucher line in as an item
      // (keywords include Indonesian terms because receipts are usually printed in Indonesian)
      if (/^(discount|diskon|disc|voucher|potongan|hemat|cashback|promo)\b/i.test(rawName)) {
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
    console.error("Receipt scan error:", err);
    res.status(500).json({ error: "Failed to read the receipt." });
  }
}
