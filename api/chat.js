// Endpoint AI Bot: chat assistant Catalys via Google Gemini.
// Menggunakan API key dan model yang sama dengan scan struk (gemini-2.5-flash-lite).
// Dipakai dua tempat: Vercel Serverless Function (/api/chat) dan server Express lokal (src/server/index.js).

const MODEL_DEFAULT = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT_DASAR = `Kamu adalah 'catalys bot', asisten AI resmi untuk aplikasi Catalys - platform terpadu manajemen keuangan dan operasional UMKM Indonesia.
Tugasmu adalah membantu pemilik dan pengelola UMKM dengan ramah, praktis, dan profesional.

PENGETAHUAN LENGKAP FITUR CATALYS:
1. Dashboard (/dashboard): Ringkasan performa usaha, grafik tren, total pemasukan, pengeluaran, dan laba bersih.
2. Financial (/financial): Pencatatan transaksi arus kas harian, fitur Scan Struk otomatis (foto struk langsung jadi jurnal/data), laporan laba rugi, neraca, dan rasio keuangan (DER, CR, dll).
3. Kasir POS (/kasir): Sistem kasir cepat untuk transaksi kasir langsung, input produk, dan cetak struk nota pembayaran.
4. Jurnal (/jurnal): Pencatatan jurnal umum akuntansi (debit & kredit) dan buku besar otomatis.
5. Bagan Akun (/chart-of-accounts): Pengaturan struktur akun keuangan (Chart of Accounts / COA) standar UMKM.
6. Manajemen Internal (/internal-management): Kelola stok bahan baku, belanja supplier dengan Scan Struk otomatis, peta supplier terdekat, manajemen karyawan, KPI, serta tracking legalitas & sertifikasi (Halal, BPOM, NIB).
7. Data-Driven AI (/data-driven): Analisis bisnis berbasis AI, audit otomatis laporan keuangan, dan deteksi anomali pengeluaran.
8. Harga Cerdas (/smart-pricing): Rekomendasi harga jual ideal berdasarkan HPP bahan baku, biaya operasional, target margin profit, dan riset pasar.
9. Permodalan (/permodalan): Fasilitas pengajuan pinjaman bank (KUR, BCA, Mandiri, BRI) atau investor dengan simulasi cicilan dan kelayakan usaha.
10. Konsultasi (/konsultasi): Sesi mentoring dan konsultasi langsung dengan praktisi bisnis UMKM.
11. UMKM Berkembang (/umkm-berkembang): Kurikulum edukasi literasi keuangan, roadmap naik kelas UMKM, dan panduan praktis.
12. Profil & Paket (/profil): Pengaturan profil toko/usaha serta pilihan paket langganan (Gratis, Pro, Bisnis).

ATURAN MENJAWAB:
1. JAWAB SECARA SINGKAT, PADAT, RAMAH, DAN LANGSUNG PADA INTINYA (maksimal 2-3 paragraf pendek).
2. DILARANG MENGGUNAKAN FORMATTING MARKDOWN BERLEBIHAN (jangan gunakan tanda pagar #, **, *, -, atau tabel). Gunakan teks biasa (plain text) dengan baris baru agar rapi dan nyaman dibaca di layar chat kecil.
3. Selalu gunakan Bahasa Indonesia yang santun, solutif, dan mudah dipahami pelaku usaha.
4. Jika user bertanya tentang halaman tempat dia berada ("ini halaman apa?", "bagaimana cara pakainya?"), jelaskan secara spesifik sesuai halaman tersebut.`;

import { fetchGeminiWithRotation } from "./gemini-keys.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, message, pathname, system } = req.body ?? {};

  // Normalisasi riwayat pesan ke format Gemini (role: "user" | "model")
  const rawList = Array.isArray(messages) && messages.length > 0
    ? messages
    : typeof message === "string" && message.trim()
      ? [{ role: "user", content: message.trim() }]
      : [];

  const contents = [];
  for (const m of rawList) {
    const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
    const text = typeof m.content === "string" ? m.content.trim() : typeof m.text === "string" ? m.text.trim() : "";
    if (!text) continue;

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n" + text;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // Gemini mengharuskan percakapan dimulai oleh user
  if (contents.length > 0 && contents[0].role === "model") {
    contents.shift();
  }

  if (contents.length === 0) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  // Bangun System Prompt sesuai rute/halaman aktif user
  let systemPrompt = system && typeof system === "string" ? system : SYSTEM_PROMPT_DASAR;
  if (pathname && typeof pathname === "string") {
    systemPrompt += `\n\nSaat ini pengguna sedang membuka halaman dengan path: '${pathname}'. Bila user bertanya hal terkait halaman ini, berikan penjelasan sesuai fitur halaman tersebut.`;
  }

  try {
    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800,
      },
    };

    const { data, model, keyIndex, totalKeys } = await fetchGeminiWithRotation(payload);

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Halo! Saya catalys bot, ada yang bisa saya bantu terkait aplikasi Catalys?";

    return res.status(200).json({
      reply: replyText,
      text: replyText,
      model,
      keyIndex,
      totalKeys,
      usage: data.usageMetadata,
    });
  } catch (err) {
    console.error("AI Bot handler error:", err);
    return res.status(500).json({
      error: err.message || "Gagal menghubungi layanan AI Gemini.",
    });
  }
}
