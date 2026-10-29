import { useMemo, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Calendar, MapPin, Trophy, BookOpen, ExternalLink, PlayCircle } from "lucide-react";
import PillTabs from "../components/PillTabs";

type Opportunity = {
  id: string;
  title: string;
  category: "Events & Competitions" | "Finance Training" | "Export Training";
  date: string;
  time: string;
  location: string;
  image?: string;
  short: string;
};

const opportunities: Opportunity[] = [
  {
    id: "evt-1",
    title: "National Business Competition 2026",
    category: "Events & Competitions",
    date: "2026-11-14",
    time: "09:00 WIB",
    location: "Jakarta (Offline)",
    image: "/competition-1.png",
    short:
      "A national business plan competition for MSME owners & startups.",
  },
  {
    id: "evt-2",
    title: "Nusantara MSME Expo",
    category: "Events & Competitions",
    date: "2026-12-05",
    time: "10:00 WIB",
    location: "Bandung (Offline)",
    image: "/competition-2.png",
    short:
      "An exhibition of top MSME products. Expand your network and find potential buyers.",
  },
  {
    id: "fin-1",
    title: "Financial Statements for Beginners",
    category: "Finance Training",
    date: "2026-11-06",
    time: "19:00 WIB",
    location: "Online (Zoom)",
    image: "/finance-1.png",
    short:
      "Learn to build an Income Statement & Balance Sheet with a practical approach.",
  },
  {
    id: "fin-2",
    title: "COGS & Cash Flow Management Class",
    category: "Finance Training",
    date: "2026-11-20",
    time: "19:30 WIB",
    location: "Online (Google Meet)",
    image: "/finance-2.png",
    short:
      "Set the right Cost of Goods Manufactured and manage your MSME's daily cash flow.",
  },
  {
    id: "exp-1",
    title: "Breaking Into the European Market: Packaging Standards",
    category: "Export Training",
    date: "2026-11-12",
    time: "13:00 WIB",
    location: "Jakarta (Offline)",
    image: "/export-1.png",
    short: "Learn packaging standards and regulations for exporting to the European Union.",
  },
  {
    id: "exp-2",
    title: "Finding Buyers & Customs Documents",
    category: "Export Training",
    date: "2026-12-03",
    time: "14:00 WIB",
    location: "Online (Webinar)",
    image: "/export-2.png",
    short:
      "Strategies for finding international buyers and completing export documents.",
  },
  {
    id: "evt-3",
    title: "Product Innovation Competition 2027",
    category: "Events & Competitions",
    date: "2027-01-23",
    time: "09:30 WIB",
    location: "Surabaya (Offline)",
    image: "/competition-3.png",
    short:
      "Pitch MSME product ideas and prototypes. Judged by academics and industry.",
  },
  {
    id: "evt-4",
    title: "Digital MSME Pitch Day",
    category: "Events & Competitions",
    date: "2027-02-20",
    time: "13:00 WIB",
    location: "Online (Live Stream)",
    image: "/competition-4.png",
    short: "A pitching session for digital MSMEs in front of mentors and investors.",
  },
  {
    id: "fin-3",
    title: "Accounting Fundamentals for MSMEs",
    category: "Finance Training",
    date: "2026-12-11",
    time: "19:00 WIB",
    location: "Online (Zoom)",
    image: "/finance-3.png",
    short: "Understand basic bookkeeping, journals, and simple financial statements.",
  },
  {
    id: "fin-4",
    title: "MSME Tax Optimization",
    category: "Finance Training",
    date: "2027-01-15",
    time: "19:30 WIB",
    location: "Online (Webinar)",
    image: "/finance-4.png",
    short:
      "A practical guide to MSME tax obligations and legal ways to be more efficient.",
  },
  {
    id: "exp-3",
    title: "Halal Certification & Global Standards",
    category: "Export Training",
    date: "2027-01-28",
    time: "10:00 WIB",
    location: "Jakarta (Offline)",
    image: "/export-3.png",
    short:
      "Steps to obtain certification and meet Middle East market standards.",
  },
  {
    id: "exp-4",
    title: "Export Logistics: Incoterms & Freight",
    category: "Export Training",
    date: "2027-02-11",
    time: "14:00 WIB",
    location: "Online (Webinar)",
    image: "/export-4.png",
    short:
      "Understand Incoterms, freight negotiation, and a smooth shipping process.",
  },
];

// Learning videos per category (real YouTube video IDs; the videos themselves are in Indonesian)
const VIDEOS: Record<Opportunity["category"], { id: string; title: string; channel: string }[]> = {
  "Events & Competitions": [
    { id: "BCNVt9maaOg", title: "How to Make an Easy Business Plan in 10 Minutes", channel: "Kelly Patricia" },
    { id: "WQ0CpAKdCAk", title: "Examples of a Good Startup Pitch Deck", channel: "BRI Ventures" },
  ],
  "Finance Training": [
    { id: "Gpxd-zSthGg", title: "Small Business Bookkeeping in 5 Steps", channel: "Kelly Patricia" },
    { id: "03m82d6TUOk", title: "An Easy Way to Calculate COGS for Small Businesses", channel: "Kelly Patricia" },
  ],
  "Export Training": [
    { id: "R5NqM3hafPo", title: "How to Export Goods Abroad for Beginners", channel: "Belajar Ekspor Impor" },
    { id: "cln1EOfb9VY", title: "Just Starting to Export? Watch This First", channel: "UKM Eksporter Indonesia" },
  ],
};

const tabs = [
  { key: "Events & Competitions", label: "Events & Competitions", icon: Trophy },
  { key: "Finance Training", label: "Finance Training", icon: BookOpen },
  { key: "Export Training", label: "Export Training", icon: ExternalLink },
] as const;

function MsmeGrowth() {
  usePageTitle("MSME Growth");
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["key"]>("Events & Competitions");

  const filtered = useMemo(
    () => opportunities.filter((o) => o.category === activeTab),
    [activeTab],
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-[80rem] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 bg-transparent">
        <p className="text-sm text-gray-600 mb-6 mt-1">
          Curated MSME development content: training, competitions, and export
          opportunities from our internal research team.
        </p>

        <PillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Learning videos */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-primary">Learning Videos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VIDEOS[activeTab].map((v) => (
              <div key={v.id} className="card-elegant overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0`}
                    title={v.title}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 line-clamp-2">{v.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.channel}</p>
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <h2 className="text-lg font-semibold text-primary mb-3">Programs & Events</h2>
        {/* Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="card-elegant hover-lift overflow-hidden"
            >
              {/* Poster / Banner */}
              <div className="relative aspect-video bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-gray-400 text-sm">Poster</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-primary line-clamp-2">
                  {item.title}
                </h3>

                {/* Meta */}
                <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-500" />{" "}
                    {new Date(item.date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon /> {item.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-500" /> {item.location}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                  {item.short}
                </p>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button className="px-3 py-2 rounded-md bg-primary text-white text-sm transition-colors">
                    View Details
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm transition-colors hover:bg-gray-50">
                    Register Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// Small clock icon
function ClockIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8v5l3 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default MsmeGrowth;
