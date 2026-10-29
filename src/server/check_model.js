// Run with: GEMINI_API_KEY=<key> node src/server/check_model.js
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in the environment.");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;

console.log("🔍 Listing available models with the key...");

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.log("❌ Error from Google:", data.error.message);
      // If the error is 'API key not valid' again, the key really is dead/blocked.
    } else {
      console.log("\n✅ KEY VALID! HERE ARE YOUR MODELS:");
      console.log("-----------------------------------");

      // Filter models that can generate text
      const available = data.models.filter((m) =>
        m.supportedGenerationMethods.includes("generateContent")
      );

      if (available.length === 0) {
        console.log("⚠️ Key is valid, but no models are available. Strange.");
      }

      available.forEach((m) => {
        const cleanName = m.name.replace("models/", "");
        console.log(`👉 ${cleanName}`);
      });
      console.log("-----------------------------------");
    }
  } catch (err) {
    console.error("❌ Connection error:", err);
  }
}

checkModels();
