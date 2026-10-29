import express from "express";
import dotenv from "dotenv";
import scanStruk from "../../api/scan-struk.js";
import chatHandler from "../../api/chat.js";

dotenv.config();

const app = express();
// foto struk dikirim sebagai base64, default 100kb terlalu kecil
app.use(express.json({ limit: "5mb" }));

// Endpoint scan struk & AI bot (memakai model dan API Gemini yang sama)
app.post("/api/scan-struk", scanStruk);
app.post("/api/chat", chatHandler);
app.post("/api/gemini", chatHandler);

const PORT = process.env.PORT || 4000;

app
  .listen(PORT, () => console.log(`Server listening on ${PORT}`))
  // port terpakai (mis. start:server sudah jalan) jangan sampai mematikan Vite
  .on("error", (err) => console.error(`Server API gagal jalan di port ${PORT}:`, err.message));
