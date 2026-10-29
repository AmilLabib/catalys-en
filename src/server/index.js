import express from "express";
import dotenv from "dotenv";
import scanReceipt from "../../api/scan-receipt.js";
import chatHandler from "../../api/chat.js";

dotenv.config();

const app = express();
// receipt photos are sent as base64, the 100kb default is too small
app.use(express.json({ limit: "5mb" }));

// Receipt scan & AI bot endpoints (using the same Gemini model and API)
app.post("/api/scan-receipt", scanReceipt);
app.post("/api/chat", chatHandler);
app.post("/api/gemini", chatHandler);

const PORT = process.env.PORT || 4000;

app
  .listen(PORT, () => console.log(`Server listening on ${PORT}`))
  // a port already in use (e.g. start:server is already running) must not crash Vite
  .on("error", (err) => console.error(`API server failed to start on port ${PORT}:`, err.message));
