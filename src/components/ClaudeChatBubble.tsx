import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAccount } from "../context/AccountContext";
import { quotaExhaustedMessage } from "../config/access";
import QuotaBadge from "./QuotaBadge";

export default function ClaudeChatBubble() {
  const location = useLocation();
  const { plan, quotaRemaining, consumeQuota } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: "Hi! I'm catalys bot. How can I help you today?",
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

    // the quota is only deducted when the bot answers successfully
    if (quotaRemaining("aiBot") === 0) {
      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: quotaExhaustedMessage("aiBot", plan) },
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

      // Catalys app knowledge context
      const systemContext = `You are 'catalys bot', the official AI assistant for the Catalys app - an integrated financial and operations management platform for Indonesian MSMEs.
Your job is to help MSME owners and managers in a friendly, practical, and solution-oriented way.

CATALYS APP KNOWLEDGE:
1. Dashboard (/dashboard): Business performance summary, turnover, net profit, and trend charts.
2. Financial (/financial): Cash flow, financial reports (income statement, balance sheet), and automatic Receipt Scan (a photo of a shopping receipt is read straight into transaction data).
3. POS Cashier (/cashier): Fast cashier system for direct sales and printing receipts.
4. Journal (/journal): Debit & credit accounting journal entries and an automatic general ledger.
5. Chart of Accounts (/chart-of-accounts): Setting up the business's financial account structure (COA).
6. Internal Management (/internal-management): Manage raw material stock, supplier purchases with automatic Receipt Scan, a nearest-supplier map, employees, KPIs, and legal & certifications (Halal, BPOM, NIB).
7. Data-Driven AI (/data-driven): AI-based business analysis, automatic audits, and expense anomaly detection.
8. Smart Pricing (/smart-pricing): Ideal selling price recommendations based on raw material COGS, operating costs, target profit margin, and market research.
9. Funding (/funding): Bank loan applications (KUR, BCA, Mandiri, BRI) or investors, with installment simulations.
10. Consultation (/consultation): Live consultation & mentoring sessions with business practitioners.
11. MSME Growth (/msme-growth): Financial literacy curriculum and MSME level-up modules.
12. Profile & Plans (/profile): Store profile settings and subscription plan quotas.

The user is currently on the page: '${location.pathname}'.

ANSWERING RULES:
1. ANSWER BRIEFLY, CONCISELY, AND STRAIGHT TO THE POINT (at most 2-3 short paragraphs).
2. DO NOT USE EXCESSIVE MARKDOWN FORMATTING (no #, **, *, -, or tables). Use plain text with spaces or line breaks only so it looks tidy in the chat widget.
3. Always answer in friendly, polite, and helpful English.`;

      // Include the chat history so the conversation stays in context
      const recentChat = updatedHistory
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`)
        .join("\n");

      const fullMessage = `${systemContext}\n\nConversation:\n${recentChat}\n\nBot:`;

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
        "Hi! How can I help you with the Catalys app?";

      consumeQuota("aiBot");
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
          content: `Sorry, something went wrong: ${error.message || "Couldn't connect to the AI Bot."}`,
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
                Not sure how to use this app?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ask catalys bot!
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
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-3 pt-2 bg-white border-t border-gray-100">
            <QuotaBadge quota="aiBot" />
          </div>
          <div className="p-3 pt-2 bg-white flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
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
        aria-label="Open or close chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
