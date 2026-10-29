import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAccount } from "../context/AccountContext";
import { pesanKuotaHabis } from "../config/access";
import QuotaBadge from "./QuotaBadge";

export default function ClaudeChatBubble() {
  const location = useLocation();
  const { plan, quotaRemaining, pakaiKuota } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: "Halo! Saya catalys bot. Ada yang bisa saya bantu hari ini?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show tooltip after 2.5 seconds
    const showTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 2500);

    // Hide tooltip after 10 seconds (7.5 seconds visible)
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Hide tooltip immediately when chat is opened
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isOpen]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");

    // kuota dipotong hanya bila bot berhasil menjawab
    if (quotaRemaining("aiBot") === 0) {
      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: pesanKuotaHabis("aiBot", plan) },
      ]);
      return;
    }

    // Add user message
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userMessage },
    ];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Exclude initial greeting from user-assistant history context
      const apiMessages = updatedHistory.slice(1).map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));

      // Konteks pengetahuan aplikasi Catalys
      const systemContext = `Kamu adalah 'catalys bot', asisten AI resmi untuk aplikasi Catalys - platform terpadu manajemen keuangan dan operasional UMKM Indonesia.
Tugasmu adalah membantu pemilik dan pengelola UMKM dengan ramah, praktis, dan solutif.

PENGETAHUAN APLIKASI CATALYS:
1. Dashboard (/dashboard): Ringkasan performa bisnis, omzet, laba bersih, dan grafik tren.
2. Financial (/financial): Arus kas, laporan keuangan (laba rugi, neraca), dan fitur Scan Struk otomatis (foto struk belanja langsung terbaca jadi data transaksi).
3. Kasir POS (/kasir): Sistem kasir cepat untuk penjualan langsung dan cetak struk nota belanja.
4. Jurnal (/jurnal): Pencatatan jurnal akuntansi debit & kredit serta buku besar otomatis.
5. Bagan Akun (/chart-of-accounts): Pengaturan struktur akun keuangan (COA) bisnis.
6. Manajemen Internal (/internal-management): Kelola stok bahan baku, belanja supplier dengan Scan Struk otomatis, peta supplier terdekat, karyawan, KPI, serta legalitas & sertifikasi (Halal, BPOM, NIB).
7. Data-Driven AI (/data-driven): Analisis bisnis berbasis kecerdasan buatan, audit otomatis, dan deteksi anomali pengeluaran.
8. Harga Cerdas (/smart-pricing): Rekomendasi harga jual ideal berdasarkan HPP bahan baku, biaya operasional, target margin profit, dan riset pasar.
9. Permodalan (/permodalan): Pengajuan pinjaman bank (KUR, BCA, Mandiri, BRI) atau investor dengan simulasi cicilan.
10. Konsultasi (/konsultasi): Sesi konsultasi & mentoring langsung dengan praktisi bisnis.
11. UMKM Berkembang (/umkm-berkembang): Kurikulum edukasi literasi keuangan dan modul naik kelas UMKM.
12. Profil & Paket (/profil): Pengaturan profil toko dan kuota paket langganan.

Saat ini user sedang berada di halaman: '${location.pathname}'.

ATURAN MENJAWAB:
1. JAWAB SECARA SINGKAT, PADAT, DAN LANGSUNG PADA INTINYA (maksimal 2-3 paragraf pendek).
2. DILARANG KERAS MENGGUNAKAN FORMATTING MARKDOWN BERLEBIHAN (jangan gunakan tanda pagar #, **, *, -, atau tabel). Gunakan teks biasa (plain text) dengan spasi atau baris baru saja agar rapi di chat widget.
3. Selalu gunakan Bahasa Indonesia yang ramah, santun, dan solutif.`;

      // Sertakan riwayat obrolan agar percakapan tetap kontekstual
      const recentChat = updatedHistory
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`)
        .join("\n");

      const fullMessage = `${systemContext}\n\nPercakapan:\n${recentChat}\n\nBot:`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: fullMessage,
          messages:
            apiMessages.length > 0
              ? apiMessages
              : [{ role: "user", content: userMessage }],
          pathname: location.pathname,
        }),
      });

      const response = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(response?.error || `Server error (${res.status})`);
      }

      const replyText =
        response?.reply ||
        response?.text ||
        "Halo! Ada yang bisa saya bantu terkait aplikasi Catalys?";

      pakaiKuota("aiBot");
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: replyText },
      ]);
    } catch (error: any) {
      console.error("AI Bot API Error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Maaf, terjadi kendala: ${error.message || "Gagal terhubung ke AI Bot."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Tooltip Bubble */}
      {!isOpen && showTooltip && (
        <div
          className="absolute bottom-[4.5rem] right-0 mb-2 w-64 bg-white text-gray-800 p-3 rounded-2xl shadow-xl border border-gray-100 z-40 animate-bounce cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-start gap-3 relative">
            <div className="bg-primary/10 text-primary p-2 rounded-full shrink-0">
              <MessageCircle size={20} />
            </div>
            <div className="pr-4">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                Bingung memakai aplikasi ini?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Yuk, tanya catalys bot!
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="absolute -top-1 -right-1 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
          {/* Tail */}
          <div className="absolute -bottom-2 right-5 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-[calc(100vw-2rem)] max-w-sm sm:w-96 h-[min(30rem,70vh)] mb-4 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">catalys bot</h3>
                <p className="text-xs text-white/80">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                  chat.role === "user"
                    ? "bg-primary text-white rounded-tr-none self-end"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-none self-start"
                }`}
              >
                {chat.content}
              </div>
            ))}
            {isLoading && (
              <div className="max-w-[85%] p-3 rounded-xl text-sm bg-white text-gray-800 border border-gray-200 rounded-tl-none self-start flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Mengetik...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-3 pt-2 bg-white border-t border-gray-100">
            <QuotaBadge kuota="aiBot" />
          </div>
          <div className="p-3 pt-2 bg-white flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              disabled={isLoading}
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 size={16} className="ml-0 animate-spin" />
              ) : (
                <Send size={16} className="ml-1" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen
            ? "bg-gray-200 text-gray-600 scale-90"
            : "bg-primary text-white shadow-lg hover:shadow-xl hover:-translate-y-1"
        } w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 z-50`}
        aria-label="Buka atau tutup obrolan"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
