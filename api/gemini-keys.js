// Central utility for managing a pool of 5 Gemini API keys with automatic rotation.
// If the active key hits a limit (429/Resource Exhausted), the system immediately tries the next key.

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Reads all Gemini API keys from the environment.
 * Supports GEMINI_API_KEY_1 to GEMINI_API_KEY_5 plus a GEMINI_API_KEY fallback.
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
 * Calls the Gemini API with automatic rotation across API keys (up to 5 keys)
 * and fallback across models if needed.
 */
export async function fetchGeminiWithRotation(bodyPayload, preferredModel) {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY is configured in .env.");
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

  // Try the priority model first, rotating through all 5 API keys
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
          `[Gemini Rotation] Key #${i + 1} (${maskedKey}) on model ${model} failed (${res.status}): ${errMsg}.` +
          (i < keys.length - 1 ? ` Trying Key #${i + 2}...` : ` All keys for model ${model} have been tried.`)
        );

        lastError = errMsg;
      } catch (err) {
        console.warn(`[Gemini Rotation] Key #${i + 1} network error:`, err.message);
        lastError = err.message;
      }
    }
  }

  throw new Error(
    `All (${keys.length}) Gemini API keys hit their quota limit or failed: ${lastError || "No response"}`
  );
}
