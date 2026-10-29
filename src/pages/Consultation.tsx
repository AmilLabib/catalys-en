import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Star, Video, MapPin, XCircle, ShoppingBag, CheckCircle2, Clock } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import QuotaBadge from "../components/QuotaBadge";
import { SESSION_PACK } from "../config/access";
import { celebrate } from "../utils/effects";

const EXPERTS = [
  { name: "Dewi Kartika, S.E., Ak.", field: "MSME Finance & Tax", experience: "9 years", rating: 4.9, initials: "DK" },
  { name: "Raka Pratama, M.M.", field: "Digital Marketing", experience: "7 years", rating: 4.8, initials: "RP" },
  { name: "Sinta Maharani, S.H.", field: "Legal & Licensing", experience: "6 years", rating: 4.7, initials: "SM" },
  { name: "Bayu Nugroho, M.B.A.", field: "Operations & Funding", experience: "11 years", rating: 4.9, initials: "BN" },
];

const TOPICS = [
  "Finance & Tax",
  "Audit Findings",
  "Digital Marketing",
  "Operations & HR",
  "Funding",
  "Legal & Licensing",
];

const TIMES = ["09:00", "10:30", "13:00", "15:00", "19:00"];

function tomorrow() {
  const d = new Date(Date.now() + 86_400_000);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Consultation() {
  usePageTitle("Consultation");
  const [params] = useSearchParams();
  const { sessions, scheduleSession, cancelSession, buyExtraSessions, quotaRemaining } = useAccount();
  const { toast } = useToast();

  const [form, setForm] = useState({
    expert: EXPERTS[0].name,
    topic: params.get("topic") && TOPICS.includes(params.get("topic")!) ? params.get("topic")! : TOPICS[0],
    date: tomorrow(),
    time: TIMES[1],
    mode: "Online" as "Online" | "In Person",
    notes: params.get("notes") ?? "",
  });
  const remaining = quotaRemaining("consultation") ?? 0;

  const scheduled = sessions
    .filter((s) => s.status === "Scheduled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const history = sessions.filter((s) => s.status !== "Scheduled");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.date < tomorrow()) return toast("Choose a date from tomorrow onward.", "warning");
    const clash = scheduled.some((s) => s.date === form.date && s.time === form.time);
    if (clash) return toast("You already have a session at that time.", "warning");
    const ok = scheduleSession({
      expert: form.expert,
      topic: form.topic,
      date: form.date,
      time: form.time,
      mode: form.mode,
      notes: form.notes.trim(),
    });
    if (!ok) return toast("Your consultation quota is used up. Buy extra sessions to schedule more.", "warning");
    toast(`Session with ${form.expert.split(",")[0]} scheduled`);
    celebrate();
    setForm((f) => ({ ...f, notes: "" }));
  };

  const input = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary">Consult an Expert</h2>
          <p className="text-sm text-gray-500">Schedule a 60-minute session with a Catalys MSME mentor.</p>
        </div>
        <QuotaBadge quota="consultation" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scheduling form */}
        <form onSubmit={submit} className="card-elegant lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Schedule a Session</h3>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Choose an expert</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPERTS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => setForm((f) => ({ ...f, expert: p.name }))}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                    form.expert === p.name ? "border-primary bg-primary/[0.03]" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#012a3d] to-[#2f6b8f] text-white text-sm font-bold flex items-center justify-center">
                    {p.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{p.name}</span>
                    <span className="block text-xs text-gray-500">{p.field}</span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {p.rating} · {p.experience}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Topic</span>
              <select className={input} value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Date</span>
              <input
                type="date"
                min={tomorrow()}
                className={input}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Time (WIB)</p>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((j) => (
                <button
                  type="button"
                  key={j}
                  onClick={() => setForm((f) => ({ ...f, time: j }))}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    form.time === j ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Method</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Online", Video, "Video call"],
                  ["In Person", MapPin, "At the nearest partner office"],
                ] as const
              ).map(([m, Icon, desc]) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, mode: m }))}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left ${
                    form.mode === m ? "border-primary bg-primary/[0.03]" : "border-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">{m}</span>
                    <span className="block text-[11px] text-gray-500">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Notes for the expert (optional)</span>
            <textarea
              rows={3}
              className={input}
              value={form.notes}
              placeholder="Briefly describe the issue you'd like to discuss"
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <QuotaBadge quota="consultation" />
            <button
              disabled={remaining === 0}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              Schedule Session
            </button>
          </div>
        </form>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-6">
          <section className="card-elegant p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-500">No sessions scheduled yet.</p>
            ) : (
              <ul className="space-y-3">
                {scheduled.map((s) => (
                  <li key={s.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.topic}</p>
                        <p className="text-xs text-gray-500">{s.expert}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{s.mode}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5" /> {formatDate(s.date)}, {s.time} WIB
                    </p>
                    {s.notes && <p className="mt-1 text-xs text-gray-500 italic">"{s.notes}"</p>}
                    <button
                      onClick={() => {
                        if (confirm("Cancel this session? The quota will be returned.")) {
                          cancelSession(s.id);
                          toast("Session cancelled, quota returned", "info");
                        }
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && (
              <p className="mt-4 text-xs text-gray-400">{history.length} sessions cancelled.</p>
            )}
          </section>

          <section className="rounded-2xl p-6 text-white bg-gradient-to-br from-[#012a3d] via-[#0b3f5c] to-[#2f6b8f] shadow-[0_18px_40px_-18px_rgba(1,42,61,0.6)]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h3 className="font-semibold">Buy Extra Sessions</h3>
            </div>
            <p className="mt-2 text-sm text-white/80">
              A pack of {SESSION_PACK.count} business consultation sessions, available on every subscription plan, with email follow-up.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-white/90">
              {[`${SESSION_PACK.count}x consultation sessions`, "Priority scheduling", "Session summary via email"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xl font-extrabold">
                {SESSION_PACK.price} <span className="text-xs font-medium text-white/70">/ {SESSION_PACK.count} sessions</span>
              </p>
              <button
                onClick={() => {
                  buyExtraSessions(SESSION_PACK.count);
                  toast(`${SESSION_PACK.count} extra sessions added (demo mode)`);
                }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-white/90"
              >
                Buy Now
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
