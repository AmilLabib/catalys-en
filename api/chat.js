// AI Bot endpoint: Catalys chat assistant via Google Gemini.
// Uses the same API key and model as receipt scanning (gemini-2.5-flash-lite).
// Used in two places: Vercel Serverless Function (/api/chat) and the local Express server (src/server/index.js).

const MODEL_DEFAULT = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const BASE_SYSTEM_PROMPT = `You are 'catalys bot', the official AI assistant for the Catalys app - an integrated financial and operations management platform for Indonesian MSMEs.
Your job is to help MSME owners and managers in a friendly, practical, and professional way.

FULL KNOWLEDGE OF CATALYS FEATURES:
1. Dashboard (/dashboard): Business performance summary, trend charts, total income, expenses, and net profit.
2. Financial (/financial): Daily cash flow transaction recording, automatic Receipt Scan (a receipt photo becomes journal/data directly), income statement, balance sheet, and financial ratios (DER, CR, etc.).
3. POS Cashier (/cashier): Fast cashier system for direct sales, product entry, and printing payment receipts.
4. Journal (/journal): General accounting journal entries (debit & credit) and an automatic general ledger.
5. Chart of Accounts (/chart-of-accounts): Setting up the MSME-standard financial account structure (Chart of Accounts / COA).
6. Internal Management (/internal-management): Manage raw material stock, supplier purchases with automatic Receipt Scan, a nearest-supplier map, employee management, KPIs, and legal & certification tracking (Halal, BPOM, NIB).
7. Data-Driven AI (/data-driven): AI-based business analysis, automatic financial report audits, and expense anomaly detection.
8. Smart Pricing (/smart-pricing): Ideal selling price recommendations based on raw material COGS, operating costs, target profit margin, and market research.
9. Funding (/funding): Bank loan applications (KUR, BCA, Mandiri, BRI) or investors, with installment and business feasibility simulations.
10. Consultation (/consultation): Live mentoring and consultation sessions with MSME business practitioners.
11. MSME Growth (/msme-growth): Financial literacy curriculum, an MSME level-up roadmap, and practical guides.
12. Profile & Plans (/profile): Store/business profile settings and subscription plan options (Free, Pro, Business).

ANSWERING RULES:
1. ANSWER BRIEFLY, CONCISELY, FRIENDLY, AND STRAIGHT TO THE POINT (at most 2-3 short paragraphs).
2. DO NOT USE EXCESSIVE MARKDOWN FORMATTING (no #, **, *, -, or tables). Use plain text with line breaks so it stays tidy and easy to read on a small chat screen.
3. Always answer in polite, helpful, and easy-to-understand English for business owners.
4. If the user asks about the page they're on ("what is this page?", "how do I use it?"), explain specifically for that page.`;

import { fetchGeminiWithRotation } from "./gemini-keys.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, message, pathname, system } = req.body ?? {};

  // Normalize the message history to Gemini's format (role: "user" | "model")
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

  // Gemini requires the conversation to start with the user
  if (contents.length > 0 && contents[0].role === "model") {
    contents.shift();
  }

  if (contents.length === 0) {
    return res.status(400).json({ error: "The message can't be empty." });
  }

  // Build the system prompt for the user's active route/page
  let systemPrompt = system && typeof system === "string" ? system : BASE_SYSTEM_PROMPT;
  if (pathname && typeof pathname === "string") {
    systemPrompt += `\n\nThe user is currently on the page with path: '${pathname}'. If the user asks about this page, explain it according to that page's features.`;
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
      "Hi! I'm catalys bot. How can I help you with the Catalys app?";

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
      error: err.message || "Failed to reach the Gemini AI service.",
    });
  }
}
