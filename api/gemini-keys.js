// Utilitas sentral untuk mengelola pool 5 API Key Gemini dengan rotasi otomatis.
// Jika key aktif terkena limit (429/Resource Exhausted), sistem langsung mencoba key berikutnya.

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Mengambil daftar seluruh API key Gemini dari environment.
 * Mendukung GEMINI_API_KEY_1 s/d GEMINI_API_KEY_5 serta fallback GEMINI_API_KEY.
 */
export function getGeminiKeys() {
  const candidates = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(",") : []),
  ];

  return Array.from(
    new Set(
      candidates
        .filter((k) => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    )
  );
}

/**
 * Memanggil Gemini API dengan rotasi otomatis antar API key (hingga 5 key)
 * serta fallback antar model bila perlu.
 */
export async function fetchGeminiWithRotation(bodyPayload, preferredModel) {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error("Tidak ada GEMINI_API_KEY yang terdaftar di .env.");
  }

  const modelCandidates = Array.from(
    new Set([
      preferredModel,
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash-lite",
    ].filter(Boolean))
  );

  let lastError = null;

  // Coba model prioritas terlebih dahulu, lakukan rotasi ke seluruh 5 API key
  for (const model of modelCandidates) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const maskedKey = key.slice(0, 6) + "..." + key.slice(-4);

      try {
        const url = `${BASE_URL}/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(bodyPayload),
        });

        const data = await res.json();

        if (res.ok) {
          return {
            data,
            model,
            keyIndex: i + 1,
            totalKeys: keys.length,
          };
        }

        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        console.warn(
          `[Gemini Rotation] Key #${i + 1} (${maskedKey}) pada model ${model} gagal (${res.status}): ${errMsg}.` +
          (i < keys.length - 1 ? ` Mencoba Key #${i + 2}...` : ` Seluruh key pada model ${model} telah dicoba.`)
        );

        lastError = errMsg;
      } catch (err) {
        console.warn(`[Gemini Rotation] Key #${i + 1} network error:`, err.message);
        lastError = err.message;
      }
    }
  }

  throw new Error(
    `Seluruh (${keys.length}) API Key Gemini terkena batas kuota atau gagal: ${lastError || "Tidak ada respon"}`
  );
}
