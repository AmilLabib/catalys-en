import { useMemo, useState } from "react";
import { RefreshCw, Star, MessageCircle, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import BrandIcon, { type Brand } from "../../components/BrandIcon";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useToast } from "../../context/ToastContext";
import { NEW_REVIEWS, initialReviews, type Platform, type Sentiment, type Topic, type Review } from "../../data/internal";

// chart colors per platform use navy tones; platform logos keep their original colors
const PLATFORM: Record<Platform, { color: string; chip: string; brand: Brand }> = {
  Instagram: { color: "#012a3d", chip: "bg-pink-50 text-pink-700 ring-pink-200", brand: "instagram" },
  TikTok: { color: "#2f6b8f", chip: "bg-gray-100 text-gray-800 ring-gray-300", brand: "tiktok" },
  Shopee: { color: "#5487ab", chip: "bg-orange-50 text-orange-700 ring-orange-200", brand: "shopee" },
  Tokopedia: { color: "#9cb2c1", chip: "bg-green-50 text-green-700 ring-green-200", brand: "tokopedia" },
};
const SENTIMENT: Record<Sentiment, { label: string; color: string }> = {
  positive: { label: "Positive", color: "#2f6b8f" },
  neutral: { label: "Neutral", color: "#c6d8e4" },
  negative: { label: "Negative", color: "#012a3d" },
};
const TOPICS: Topic[] = ["Taste / Quality", "Price", "Delivery", "Service", "Packaging"];

export default function MarketingTab() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filter, setFilter] = useState<Platform | "All">("All");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [pending, setPending] = useState(NEW_REVIEWS);

  const data = filter === "All" ? reviews : reviews.filter((u) => u.platform === filter);

  const stats = useMemo(() => {
    const n = data.length || 1;
    const avg = data.reduce((s, u) => s + u.rating, 0) / n;
    const sentiment = (Object.keys(SENTIMENT) as Sentiment[]).map((k) => ({
      name: SENTIMENT[k].label,
      key: k,
      value: data.filter((u) => u.sentiment === k).length,
    }));
    const topics = TOPICS.map((t) => ({
      topic: t,
      positive: data.filter((u) => u.topics.includes(t) && u.sentiment === "positive").length,
      negative: data.filter((u) => u.topics.includes(t) && u.sentiment === "negative").length,
    }));
    const perPlatform = (Object.keys(PLATFORM) as Platform[]).map((p) => {
      const xs = reviews.filter((u) => u.platform === p);
      return { platform: p, count: xs.length, avg: xs.length ? xs.reduce((s, u) => s + u.rating, 0) / xs.length : 0 };
    });
    return { avg, sentiment, topics, perPlatform, nps: ((sentiment[0].value - sentiment[2].value) / n) * 100 };
  }, [data, reviews]);

  // Rule-based insights (no AI)
  const insights = useMemo(() => {
    const out: { title: string; text: string; tone: "good" | "bad" | "info" }[] = [];
    const complaint = [...stats.topics].sort((a, b) => b.negative - a.negative)[0];
    if (complaint && complaint.negative > 0) {
      const complaintPlatform = (Object.keys(PLATFORM) as Platform[])
        .map((p) => ({ p, n: reviews.filter((u) => u.platform === p && u.sentiment === "negative" && u.topics.includes(complaint.topic)).length }))
        .sort((a, b) => b.n - a.n)[0];
      out.push({
        title: `Top complaint: ${complaint.topic}`,
        text: `${complaint.negative} negative reviews mention ${complaint.topic.toLowerCase()}, mostly on ${complaintPlatform.p}. ${
          complaint.topic === "Delivery"
            ? "Consider switching couriers or showing a clearer delivery time estimate."
            : complaint.topic === "Service"
              ? "Set up auto-replies and aim for chat responses under 1 hour."
              : complaint.topic === "Price"
                ? "Explain the reason for price increases or offer value bundles."
                : "Recheck quality and packaging standards before shipping."
        }`,
        tone: "bad",
      });
    }
    const praise = [...stats.topics].sort((a, b) => b.positive - a.positive)[0];
    if (praise && praise.positive > 0) {
      out.push({
        title: `Main strength: ${praise.topic}`,
        text: `${praise.positive} positive reviews praise the ${praise.topic.toLowerCase()}. Make it the key message in captions and ads.`,
        tone: "good",
      });
    }
    const best = [...stats.perPlatform].filter((p) => p.count > 0).sort((a, b) => b.avg - a.avg)[0];
    const worst = [...stats.perPlatform].filter((p) => p.count > 0).sort((a, b) => a.avg - b.avg)[0];
    if (best && worst && best.platform !== worst.platform) {
      out.push({
        title: "Channel comparison",
        text: `Highest rating on ${best.platform} (${best.avg.toFixed(1)}), lowest on ${worst.platform} (${worst.avg.toFixed(
          1,
        )}). Focus service improvements on ${worst.platform}.`,
        tone: "info",
      });
    }
    const social = reviews.filter((u) => u.platform === "TikTok" || u.platform === "Instagram").length;
    out.push({
      title: "Content opportunity",
      text: `${social} mentions came from Instagram and TikTok. Invite happy customers to repost content to grow your organic reach.`,
      tone: "info",
    });
    return out;
  }, [stats, reviews]);

  const fetchReviews = () => {
    setLoading(true);
    setTimeout(() => {
      if (pending.length === 0) {
        toast("No new reviews yet", "info");
      } else {
        const fetched = pending.slice(0, 2).map((u, i) => ({
          ...u,
          id: `new-${Date.now()}-${i}`,
          date: new Date().toISOString().slice(0, 10),
        }));
        setReviews((p) => [...fetched, ...p]);
        setPending((p) => p.slice(2));
        toast(`${fetched.length} new reviews fetched`);
      }
      setLastUpdated(new Date());
      setLoading(false);
    }, 1200);
  };

  const toneCls = {
    good: "border-emerald-200 bg-emerald-50/60",
    bad: "border-red-200 bg-red-50/60",
    info: "border-blue-200 bg-blue-50/60",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["All", ...Object.keys(PLATFORM)] as (Platform | "All")[]).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                filter === p ? "bg-primary text-white ring-primary" : p === "All" ? "bg-white ring-gray-200" : PLATFORM[p as Platform].chip
              }`}
            >
              {p !== "All" && (
                <span className={filter === p ? "rounded bg-white p-0.5" : ""}>
                  <BrandIcon brand={PLATFORM[p as Platform].brand} size={14} />
                </span>
              )}
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Fetching..." : "Fetch Latest Reviews"}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total reviews", String(data.length), MessageCircle],
          ["Average rating", `${stats.avg.toFixed(1)} / 5`, Star],
          ["Positive sentiment", `${Math.round((stats.sentiment[0].value / (data.length || 1)) * 100)}%`, ThumbsUp],
          ["Negative sentiment", `${Math.round((stats.sentiment[2].value / (data.length || 1)) * 100)}%`, ThumbsDown],
        ].map(([k, v, Icon], i) => {
          const I = Icon as typeof Star;
          return (
            <div key={k as string} className={`card-gradient ${["grad-navy", "grad-ocean", "grad-indigo", "grad-steel"][i]} p-4`}>
              <div className="relative flex items-center justify-between">
                <p className="text-xs text-white/75">{k as string}</p>
                <I className="w-4 h-4 text-white/80" />
              </div>
              <p className="relative mt-1 text-xl font-bold">{v as string}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="card-elegant lg:col-span-4 p-5">
          <h3 className="font-semibold text-gray-900">Sentiment Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.sentiment} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {stats.sentiment.map((s) => (
                    <Cell key={s.key} fill={SENTIMENT[s.key].color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-elegant lg:col-span-8 p-5">
          <h3 className="font-semibold text-gray-900">Most Discussed Topics</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                <XAxis dataKey="topic" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="positive" name="Positive" fill="#2f6b8f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" name="Negative" fill="#9cb2c1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card-elegant p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Review Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((x) => (
            <div key={x.title} className={`rounded-xl border p-4 ${toneCls[x.tone]}`}>
              <p className="font-semibold text-gray-900 text-sm">{x.title}</p>
              <p className="text-sm text-gray-700 mt-1">{x.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.perPlatform.map((p) => (
            <div key={p.platform} className="rounded-xl border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: PLATFORM[p.platform].color }}>
                <BrandIcon brand={PLATFORM[p.platform].brand} size={16} /> {p.platform}
              </p>
              <p className="text-lg font-bold text-gray-900">{p.count ? p.avg.toFixed(1) : "—"}</p>
              <p className="text-[11px] text-gray-500">{p.count} reviews</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card-elegant p-6">
        <h3 className="text-lg font-semibold mb-4">Latest Reviews</h3>
        <ul className="divide-y">
          {loading &&
            Array.from({ length: 2 }, (_, i) => (
              <li key={`loading-${i}`} className="py-3 flex gap-3" aria-hidden>
                <span className="shimmer w-24 h-6 rounded-full" />
                <span className="flex-1 space-y-2">
                  <span className="block shimmer h-4 w-1/3" />
                  <span className="block shimmer h-4 w-3/4" />
                </span>
              </li>
            ))}
          {data.map((u) => (
            <li key={u.id} className="py-3 flex gap-3">
              <span className={`shrink-0 h-fit w-24 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${PLATFORM[u.platform].chip}`}>
                <BrandIcon brand={PLATFORM[u.platform].brand} size={14} /> {u.platform}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{u.user}</span>
                  <span className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < u.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(u.date).toLocaleDateString("en-US")}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{u.text}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: SENTIMENT[u.sentiment].color }}>
                    {SENTIMENT[u.sentiment].label}
                  </span>
                  {u.topics.map((t) => (
                    <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-gray-400">
          Review data in demo mode is sample data. Data collection integrations (scraping/official platform APIs) can be connected in a later phase.
        </p>
      </section>
    </div>
  );
}
