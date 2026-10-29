import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Boxes,
  CalendarClock,
  ScanLine,
  Store,
  MessageSquare,
  Wallet,
  Landmark,
  TrendingUp,
  CheckCheck,
  MoreHorizontal,
  BellOff,
  type LucideIcon,
} from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useRawMaterials } from "../context/RawMaterialContext";
import { stockStatus } from "../data/rawMaterials";
import { MAIN_BRANCH } from "../config/access";

// Social-media-style notification panel: grouped into "New" and "Earlier",
// can be filtered to unread, clicking opens the related page and marks it as read.

type Notif = {
  id: string;
  icon: LucideIcon;
  avatar?: string; // photo; uses the icon when empty
  title: React.ReactNode;
  minutes: number; // how many minutes ago
  destination: string;
};

const READ_KEY = "catalys_notif_read_v1";

function timeAgo(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / 1440)}d`;
  return `${Math.floor(minutes / 10080)}w`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { role, branch, branchList, sessions, quotaRemaining, quotaPeriod, account } = useAccount();
  const { materials } = useRawMaterials();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [read, setRead] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(read));
    } catch {
      // ignore
    }
  }, [read]);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const list = useMemo<Notif[]>(() => {
    const n: Notif[] = [];

    // raw material stock running low / out
    const runningLow = materials.filter((m) => stockStatus(m) !== "safe");
    runningLow.slice(0, 2).forEach((m, i) =>
      n.push({
        id: `stock-${m.id}-${stockStatus(m)}`,
        icon: Boxes,
        title: (
          <>
            <b>{m.name}</b> stock is {stockStatus(m) === "out of stock" ? "out" : "running low"}. Buy from the nearest supplier before the rush hour.
          </>
        ),
        minutes: 6 + i * 17,
        destination: "/internal-management?tab=inventory",
      }),
    );

    // scheduled consultation sessions
    sessions
      .filter((s) => s.status === "Scheduled")
      .slice(0, 1)
      .forEach((s) =>
        n.push({
          id: `session-${s.id}`,
          icon: CalendarClock,
          title: (
            <>
              Consultation session with <b>{s.expert}</b> on <b>{s.topic}</b> is scheduled for {s.date} at {s.time}.
            </>
          ),
          minutes: 42,
          destination: "/consultation",
        }),
      );

    // receipt scan quota
    const scansLeft = quotaRemaining("receiptScan");
    const scanPeriod = quotaPeriod("receiptScan");
    if (scansLeft !== null && scansLeft > 0 && scansLeft <= 2)
      n.push({
        id: `quota-scan-${account}-${scanPeriod}-${scansLeft <= 1 ? "critical" : "low"}`,
        icon: ScanLine,
        title: (
          <>
            Only <b>{scansLeft}</b> receipt scan tokens left{scanPeriod === "daily" ? " today" : ""}. {role === "parent" ? "Upgrade your plan to add more quota." : "Contact the Parent account to upgrade."}
          </>
        ),
        minutes: 95,
        destination: "/financial",
      });

    // newly opened branches (parent account)
    if (role === "parent")
      branchList
        .filter((c) => c.name !== MAIN_BRANCH)
        .slice(-2)
        .forEach((c, i) =>
          n.push({
            id: `branch-${c.name}`,
            icon: Store,
            title: (
              <>
                <b>{c.name}</b> in {c.city} is now active. Switch accounts from the top-right menu to start managing it.
              </>
            ),
            minutes: 180 + i * 60,
            destination: "/dashboard",
          }),
        );

    // sample operational notifications
    n.push(
      {
        id: "negative-review-1",
        icon: MessageSquare,
        avatar: "https://randomuser.me/api/portraits/women/68.jpg",
        title: (
          <>
            <b>Nadia Putri</b> left a 2-star review on Shopee: "Delivery was a bit slow, but it tastes great." Reply within 24 hours.
          </>
        ),
        minutes: 60 * 5,
        destination: "/internal-management?tab=marketing",
      },
      {
        id: "sales-insight",
        icon: TrendingUp,
        title: (
          <>
            {role === "branch" ? <b>{branch}</b> : "This week's"} sales are up <b>12%</b> from last week. See the full insight.
          </>
        ),
        minutes: 60 * 26,
        destination: "/financial",
      },
      {
        id: "end-of-month-payroll",
        icon: Wallet,
        title: (
          <>
            Reminder: not all employee salaries have been <b>paid out</b> this month. Pay each person from the Human Resources menu.
          </>
        ),
        minutes: 60 * 30,
        destination: "/internal-management?tab=payroll",
      },
      {
        id: "loan-installment",
        icon: Landmark,
        title: (
          <>
            Your <b>KUR Mikro</b> loan installment is due in 5 days. Pay on time to protect your credit score.
          </>
        ),
        minutes: 60 * 24 * 3,
        destination: "/funding",
      },
    );

    return n.sort((a, b) => a.minutes - b.minutes);
  }, [materials, sessions, quotaRemaining, quotaPeriod, account, role, branch, branchList]);

  const unread = list.filter((x) => !read.includes(x.id));
  const shown = unreadOnly ? unread : list;
  const recent = shown.filter((x) => x.minutes < 60 * 24);
  const earlier = shown.filter((x) => x.minutes >= 60 * 24);

  const openNotif = (x: Notif) => {
    setRead((d) => (d.includes(x.id) ? d : [...d, x.id]));
    setOpen(false);
    navigate(x.destination);
  };

  const group = (title: string, items: Notif[]) =>
    items.length > 0 && (
      <div>
        <p className="px-4 pt-3 pb-1 text-sm font-semibold text-gray-900">{title}</p>
        <ul>
          {items.map((x) => {
            const isUnread = !read.includes(x.id);
            const Icon = x.icon;
            return (
              <li key={x.id}>
                <button onClick={() => openNotif(x)} className="group w-full flex items-start gap-3 rounded-xl mx-1 px-3 py-2.5 text-left hover:bg-gray-50" style={{ width: "calc(100% - 0.5rem)" }}>
                  <span className="relative shrink-0">
                    {x.avatar ? (
                      <img src={x.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="w-12 h-12 rounded-full grad-navy flex items-center justify-center text-white">
                        <Icon className="w-5 h-5" />
                      </span>
                    )}
                    {/* small badge in the avatar corner */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#2f6b8f] ring-2 ring-white flex items-center justify-center text-white">
                      <Icon className="w-3 h-3" />
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] leading-snug ${isUnread ? "text-gray-900" : "text-gray-500"}`}>{x.title}</span>
                    <span className={`block mt-0.5 text-xs ${isUnread ? "font-semibold text-[#2f6b8f]" : "text-gray-400"}`}>{timeAgo(x.minutes)}</span>
                  </span>
                  {isUnread && <span className="mt-4 w-2.5 h-2.5 shrink-0 rounded-full bg-[#2f6b8f]" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div ref={ref} className="relative" data-tour="notifications">
      <button
        onClick={() => setOpen((b) => !b)}
        aria-label={`Notifications, ${unread.length} unread`}
        aria-expanded={open}
        className={`relative p-2 rounded-full transition-colors ${open ? "bg-primary/10 text-primary" : "hover:bg-gray-100 text-gray-600"}`}
      >
        <Bell className={`w-5 h-5 ${unread.length ? "bell-shake" : ""}`} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        // on phones the panel spans the screen width (the bell isn't the right-most element), on desktop it sticks to the bell
        <div className="notif-panel fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[22rem] rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
            <button
              onClick={() => setRead(list.map((x) => x.id))}
              title="Mark all as read"
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
            >
              {unread.length ? <CheckCheck className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex gap-2 px-4 pt-2">
            {[
              ["All", false],
              ["Unread", true],
            ].map(([l, v]) => (
              <button
                key={String(l)}
                onClick={() => setUnreadOnly(v as boolean)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  unreadOnly === v ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l}
                {v && unread.length > 0 && <span className="ml-1 text-xs">({unread.length})</span>}
              </button>
            ))}
          </div>

          <div className="notif-scroll max-h-[min(28rem,65vh)] overflow-y-auto pb-2">
            {group("New", recent)}
            {group("Earlier", earlier)}
            {shown.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-gray-500">
                <BellOff className="w-8 h-8 text-gray-300" />
                All notifications have been read.
              </div>
            )}
          </div>

          {unread.length > 0 && (
            <button
              onClick={() => setRead(list.map((x) => x.id))}
              className="w-full border-t border-gray-100 py-2.5 text-sm font-semibold text-primary hover:bg-gray-50"
            >
              Mark all as read
            </button>
          )}
        </div>
      )}
    </div>
  );
}
