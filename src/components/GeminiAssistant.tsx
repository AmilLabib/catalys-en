import { useState } from "react";

export default function GeminiAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });

      const contentType = res.headers.get("content-type") || "";
      let payload: any = null;
      if (contentType.includes("application/json")) payload = await res.json();
      else payload = { error: await res.text() };

      if (!res.ok) {
        const errMsg =
          payload?.error ?? payload?.details ?? "Unknown server error";
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `Server error: ${errMsg}` },
        ]);
        return;
      }

      const assistantText =
        payload?.reply ?? payload?.replyText ?? "No reply from assistant.";
      setMessages((m) => [...m, { role: "assistant", text: assistantText }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Error contacting assistant: ${err?.message ?? err}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="h-40 overflow-y-auto border border-green-50 rounded p-3 mb-3 bg-white">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">
            Tanya Gemini mengenai penjurnalan keuangan Anda di sini.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block px-3 py-2 rounded max-w-[80%] break-words whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 min-w-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 min-w-0 border border-green-100 rounded px-3 py-2"
          placeholder="Ask Gemini..."
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
