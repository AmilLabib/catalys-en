import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ScanLine,
  Lock,
  Camera,
  ShoppingBag,
  PackagePlus,
  ListChecks,
  FileCheck2,
  Upload,
  Check,
  Circle,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Tag,
} from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { useToast } from "../context/ToastContext";
import { useJournal, type JournalEntry } from "../context/JournalContext";
import { useChartOfAccounts } from "../context/ChartOfAccountsContext";
import { useInventory } from "../context/InventoryContext";
import { useRawMaterials } from "../context/RawMaterialContext";
import QuotaBadge from "./QuotaBadge";
import { formatRp } from "../data/reports";
import { lockedMessage, quotaExhaustedMessage } from "../config/access";
import Overlay from "../components/Overlay";
import ReceiptIllustration from "./ReceiptIllustration";

// One receipt line. For purchase receipts, lines matched to a raw material
// (materialId) increase inventory stock by `qty`.
type ReceiptItem = { name: string; price: number; discount: number; qty: number; materialId: string };

type ReceiptKind = "sale" | "purchase";

// Handle so other components can open the scan camera directly (e.g. after shopping at a supplier)
export type ReceiptScannerHandle = { open: (kind: ReceiptKind) => void };

// The photo's longest side is capped so requests stay light and Gemini image tokens are saved
const MAX_SIDE = 1280;

// Stages shown during analysis; the active one is determined from the progress percentage
const STEPS = ["Uploading photo", "AI reading receipt", "Matching items"];
const stepFrom = (p: number) => (p < 18 ? 0 : p < 65 ? 1 : 2);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Stage = "idle" | "processing" | "success" | "failed";

const ReceiptScanner = forwardRef<ReceiptScannerHandle, { purchaseOnly?: boolean; className?: string }>(function ReceiptScanner(
  { purchaseOnly = false, className = "" },
  ref,
) {
  const { canUse, quotaLimit, quotaRemaining, consumeQuota, role, plan } = useAccount();
  const { toast } = useToast();
  const { entries, setEntries } = useJournal();
  const { accounts } = useChartOfAccounts();
  const { products } = useInventory();
  const { materials, addStock, matchMaterial, getMaterial } = useRawMaterials();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraModal, setCameraModal] = useState(false);
  const [kind, setKind] = useState<ReceiptKind | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [failMessage, setFailMessage] = useState("");
  const [itemsRead, setItemsRead] = useState(0);
  // incremented each time the modal closes, so a late analysis result doesn't open the confirmation
  const sessionRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<ReceiptItem[] | null>(null);
  const [receiptDiscount, setReceiptDiscount] = useState<number>(0);

  const available = (quotaLimit("receiptScan") ?? 1) > 0 && canUse("financialReports");
  const remaining = quotaRemaining("receiptScan");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Fake progress: approaches 92% while waiting, only completes when the result arrives
  useEffect(() => {
    if (stage !== "processing") return;
    const t = setInterval(() => setProgress((p) => p + (92 - p) * 0.05), 120);
    return () => clearInterval(t);
  }, [stage]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser, or continue with a sample receipt."
          : "The camera can't be accessed. You can still use a sample receipt.",
      );
    }
  };

  const open = (k: ReceiptKind) => {
    if (remaining === 0) return toast(quotaExhaustedMessage("receiptScan", plan), "warning");
    setKind(k);
    setPhoto(null);
    setCameraModal(true);
    startCamera();
  };

  useImperativeHandle(ref, () => ({
    open: (k) => {
      if (!available) return toast(`Receipt scan: ${lockedMessage("pro").toLowerCase()}.`, "info");
      open(k);
    },
  }));

  const close = () => {
    sessionRef.current++;
    setCameraModal(false);
    stopCamera();
    setPhoto(null);
    setStage("idle");
  };

  const downscale = (src: CanvasImageSource, w: number, h: number) => {
    const c = canvasRef.current;
    if (!c) return null;
    const s = Math.min(1, MAX_SIDE / Math.max(w, h));
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  };

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setPhoto(downscale(v, v.videoWidth, v.videoHeight));
  };

  const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setPhoto(downscale(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      toast("The image file can't be read.", "warning");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Sample receipt for demos without a photo (or when the camera isn't available)
  const sampleData = (): { items: ReceiptItem[]; receiptDiscount: number } => {
    if (kind === "sale") {
      return {
        items: products.slice(0, 3).map((p, i) => ({
          name: p.name,
          price: p.sellingPrice * (i + 1),
          discount: i === 0 ? 5_000 : 0,
          qty: i + 1,
          materialId: "",
        })),
        receiptDiscount: 5_000,
      };
    }
    // shopping receipt: the lowest-stock materials + one non-inventory item
    const needed = [...materials].sort((a, b) => a.stock / (a.minStock || 1) - b.stock / (b.minStock || 1)).slice(0, 3);
    return {
      items: [
        ...needed.map((m, i) => {
          const qty = Math.max(1, Math.round(m.minStock));
          const price = Math.round((qty * m.price * 1.02) / 100) * 100;
          return {
            name: m.name,
            qty,
            price,
            discount: i === 1 ? Math.round(price * 0.1) : 0,
            materialId: m.id,
          };
        }),
        { name: "Thermal receipt paper", qty: 2, price: 34_000, discount: 0, materialId: "" },
      ],
      receiptDiscount: 4_000,
    };
  };

  const readReceipt = async (): Promise<{ items: ReceiptItem[]; receiptDiscount: number }> => {
    if (!photo) {
      await delay(1600);
      return sampleData();
    }
    // the catalog helps Gemini match item names on the receipt to the store's data
    const catalog = kind === "purchase" ? materials.map((m) => m.name) : products.map((p) => p.name);
    const res = await fetch("/api/scan-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo, kind, catalog }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(result.items)) throw new Error(result.error || "The API server isn't responding. Restart npm run dev.");
    const items: { name: string; qty: number; price: number; discount?: number }[] = result.items;
    if (!items.length) throw new Error("No items could be read. Retake the photo closer and with better lighting.");
    const mapped = items.map((i) => {
      const m =
        kind === "purchase" ? (materials.find((x) => x.name.toLowerCase() === i.name.toLowerCase()) ?? matchMaterial(i.name)) : undefined;
      return {
        name: i.name,
        qty: Number(i.qty) || 1,
        price: Number(i.price) || 0,
        discount: Number(i.discount) || 0,
        materialId: m?.id ?? "",
      };
    });
    return {
      items: mapped,
      receiptDiscount: Number(result.receiptDiscount) || 0,
    };
  };

  const analyze = async () => {
    if (remaining === 0) return toast(quotaExhaustedMessage("receiptScan", plan), "warning");
    const session = sessionRef.current;
    setProgress(0);
    setFailMessage("");
    setStage("processing");
    try {
      const result = await readReceipt();
      if (session !== sessionRef.current) return;
      // the quota is only deducted after the receipt is read successfully
      consumeQuota("receiptScan");
      setItemsRead(result.items.length);
      setProgress(100);
      setStage("success");
      // give the checkmark animation time before moving to the confirmation
      await delay(1300);
      if (session !== sessionRef.current) return;
      setData(result.items);
      setReceiptDiscount(result.receiptDiscount);
      close();
    } catch (err) {
      if (session !== sessionRef.current) return;
      setFailMessage((err instanceof Error && err.message) || "Failed to analyze the receipt.");
      setStage("failed");
    }
  };

  const save = () => {
    if (!data || !kind) return;
    const subtotal = data.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const itemDiscount = data.reduce((s, i) => s + (Number(i.discount) || 0), 0);
    const totalDiscount = itemDiscount + (Number(receiptDiscount) || 0);
    const total = Math.max(0, subtotal - totalDiscount);

    if (total <= 0 && subtotal <= 0) return toast("The receipt total must be greater than 0.", "warning");
    const byCode = (code: string) => accounts.find((a) => a.code === code)?.id;
    const cash = byCode("1.1.1.01");
    const day = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const created: JournalEntry[] = [];
    const discountNote = totalDiscount > 0 ? ` (Discount: ${formatRp(totalDiscount)})` : "";

    if (kind === "sale") {
      const revenue = byCode("4.2.1.01");
      const cogs = byCode("5.1.1.01");
      const inventory = byCode("1.1.4.01");
      if (!cash || !revenue) return toast("Cash/revenue account not found in the Chart of Accounts.", "warning");
      created.push({
        id: `${now}-sale`,
        date: day,
        description: `Sales receipt scan${discountNote}`,
        lines: [
          { id: `${now}-1`, side: "debit", accountId: cash, amount: total },
          { id: `${now}-2`, side: "credit", accountId: revenue, amount: total },
        ],
      });
      // COGS from inventory data; if the product isn't found, estimate 60% of the net price
      const cost = data.reduce((s, i) => {
        const p = products.find((x) => x.name.toLowerCase() === i.name.toLowerCase());
        const netItem = Math.max(0, (Number(i.price) || 0) - (Number(i.discount) || 0));
        return s + (p ? p.unitCost * (i.qty || 1) : Math.round(netItem * 0.6));
      }, 0);
      if (cogs && inventory && cost > 0) {
        created.push({
          id: `${now}-cogs`,
          date: day,
          description: "COGS from sales receipt scan",
          lines: [
            { id: `${now}-3`, side: "debit", accountId: cogs, amount: cost },
            { id: `${now}-4`, side: "credit", accountId: inventory, amount: cost },
          ],
        });
      }
    } else {
      const inventory = byCode("1.1.4.01");
      const supplies = byCode("1.1.4.03");
      if (!cash || !inventory || !supplies) return toast("Cash/inventory account not found in the Chart of Accounts.", "warning");

      // Compute each item's net price after item discounts & proportional allocation of the receipt discount
      const netItemSubtotal = Math.max(1, subtotal - itemDiscount);
      const netRatio = Math.max(0, total / netItemSubtotal);

      const netPrice = (i: ReceiptItem) => {
        const netPerItem = Math.max(0, (Number(i.price) || 0) - (Number(i.discount) || 0));
        return Math.round(netPerItem * netRatio);
      };

      const toMaterials = data.filter((i) => i.materialId && i.qty > 0);
      const materialsValue = toMaterials.reduce((s, i) => s + netPrice(i), 0);
      const otherValue = Math.max(0, total - materialsValue);
      const lines: JournalEntry["lines"] = [];
      if (materialsValue > 0) lines.push({ id: `${now}-5`, side: "debit", accountId: inventory, amount: materialsValue });
      if (otherValue > 0) lines.push({ id: `${now}-6`, side: "debit", accountId: supplies, amount: otherValue });
      lines.push({ id: `${now}-7`, side: "credit", accountId: cash, amount: total });
      created.push({ id: `${now}-purchase`, date: day, description: `Purchase receipt scan${discountNote}`, lines });
      toMaterials.forEach((i) => addStock(i.materialId, i.qty, netPrice(i)));
      if (toMaterials.length) toast(`Stock increased for ${toMaterials.length} raw materials`, "info");
    }
    setEntries([...created, ...entries]);
    setData(null);
    setReceiptDiscount(0);
    toast("Receipt recorded as a journal entry");
  };

  const updateItem = (i: number, p: Partial<ReceiptItem>) => setData((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className={`card-elegant p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl chip-gradient flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{purchaseOnly ? "Purchase Receipt Scan" : "Receipt Scan"}</h3>
            <p className="text-xs text-gray-500">
              {purchaseOnly
                ? "Snap a shopping receipt and raw material stock increases automatically."
                : "Snap a purchase or sales receipt and the journal is recorded automatically."}
            </p>
          </div>
        </div>
        {available && <QuotaBadge quota="receiptScan" />}
      </div>

      {available && !purchaseOnly ? (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <button
              onClick={() => open("sale")}
              disabled={remaining === 0}
              className="btn-gradient group rounded-2xl p-4 text-left flex flex-col justify-between gap-2 disabled:opacity-50"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <ReceiptIllustration kind="sale" dark />
              </span>
              <span>
                <span className="block text-base font-bold">Sales Receipt</span>
                <span className="block text-xs text-white/75 mt-0.5">Revenue and COGS are recorded, product stock decreases.</span>
              </span>
            </button>
            <button
              onClick={() => open("purchase")}
              disabled={remaining === 0}
              className="group rounded-2xl border-2 border-primary/80 bg-white p-4 text-left flex flex-col justify-between gap-2 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 shrink-0 rounded-xl chip-gradient flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </span>
                <ReceiptIllustration kind="purchase" />
              </span>
              <span>
                <span className="block text-base font-bold">Purchase Receipt</span>
                <span className="block text-xs text-gray-500 mt-0.5">Raw material stock increases, the purchase is recorded.</span>
              </span>
            </button>
          </div>
          {/* quick overview of how receipt scanning works */}
          <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
            {[
              { Icon: Camera, t: "Snap receipt" },
              { Icon: ListChecks, t: "Check contents" },
              { Icon: FileCheck2, t: "Auto journal" },
            ].map(({ Icon, t }, i) => (
              <li key={t} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-primary">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>
                  <span className="font-semibold text-gray-700">{i + 1}.</span> {t}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : available ? (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {!purchaseOnly && (
            <button onClick={() => open("sale")} disabled={remaining === 0} className="flex-1 rounded-xl btn-gradient px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              Sales Receipt
            </button>
          )}
          <button
            onClick={() => open("purchase")}
            disabled={remaining === 0}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
              purchaseOnly ? "btn-gradient" : "border-2 border-primary text-primary"
            }`}
          >
            Purchase Receipt
          </button>
        </div>
      ) : (
        <Link
          to={role === "parent" ? "/profile?tab=plans" : "#"}
          className="mt-4 flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-500"
        >
          <Lock className="w-4 h-4 shrink-0" /> {lockedMessage("pro")}
          {role === "branch" && ". Ask the Parent account to upgrade."}
        </Link>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {cameraModal && (
        <Overlay className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{kind === "sale" ? "Sales" : "Purchase"} Receipt Scan</h3>
              <button onClick={close} className="text-sm text-gray-500 hover:text-gray-800">
                Close
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <motion.div
                animate={stage === "failed" ? { x: [0, -12, 12, -8, 8, -3, 0] } : { x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-black rounded-lg overflow-hidden aspect-[3/4] sm:aspect-video relative flex items-center justify-center"
              >
                {photo && <img src={photo} alt="Captured receipt photo" className="w-full h-full object-contain" />}
                {/* the video stays mounted so the camera stream isn't lost on "Retake" */}
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${photo ? "hidden" : ""}`} />
                {cameraError && !photo && stage === "idle" && (
                  <div className="absolute inset-x-4 top-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{cameraError}</div>
                )}

                <AnimatePresence>
                  {stage === "processing" && (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/30">
                      {/* scanner frame corners */}
                      {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
                        <motion.span
                          key={c}
                          className={`absolute w-7 h-7 rounded-sm border-cyan-300 ${c}`}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        />
                      ))}
                      {!reduceMotion && (
                        <motion.div
                          className="absolute inset-x-4 h-0.5 rounded-full bg-cyan-300 shadow-[0_0_16px_5px_rgba(103,232,249,0.55)]"
                          animate={{ top: ["6%", "94%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        />
                      )}
                    </motion.div>
                  )}

                  {stage === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white"
                    >
                      <span className="relative flex items-center justify-center">
                        <motion.span
                          className="absolute w-20 h-20 rounded-full bg-emerald-400"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 1.9, opacity: 0 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                        <motion.span
                          className="relative w-20 h-20 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 320, damping: 16 }}
                        >
                          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.4 }} />
                          </svg>
                        </motion.span>
                      </span>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 font-semibold">
                        Receipt read successfully!
                      </motion.p>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-xs text-white/80">
                        {itemsRead} items found
                      </motion.p>
                    </motion.div>
                  )}

                  {stage === "failed" && (
                    <motion.div
                      key="failed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white"
                    >
                      <motion.span
                        className="w-20 h-20 rounded-full bg-red-500 shadow-lg flex items-center justify-center"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                          <motion.path d="M7 7l10 10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.25 }} />
                          <motion.path d="M17 7L7 17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.25 }} />
                        </svg>
                      </motion.span>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 font-semibold">
                        Receipt analysis failed
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {(stage === "processing" || stage === "success") && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span>{stage === "success" ? "Done" : `${STEPS[stepFrom(progress)]}...`}</span>
                    <span className="tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${stage === "success" ? "bg-emerald-500" : "bg-primary"}`}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                  </div>
                  <ol className="grid grid-cols-3 gap-2 text-[11px]">
                    {STEPS.map((t, i) => {
                      const active = stepFrom(progress);
                      const done = stage === "success" || i < active;
                      return (
                        <li
                          key={t}
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
                            done ? "bg-emerald-50 text-emerald-700" : i === active ? "bg-white text-gray-800 ring-1 ring-gray-200" : "text-gray-400"
                          }`}
                        >
                          {done ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : i === active ? (
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {t}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {stage === "failed" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-sm">The receipt couldn't be read</p>
                      <p className="mt-0.5">{failMessage}</p>
                      <p className="mt-1 text-red-500">No scan token was used.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setPhoto(null);
                        setStage("idle");
                      }}
                      className="rounded-full border bg-white px-4 py-2 text-sm"
                    >
                      Retake Photo
                    </button>
                    <button onClick={analyze} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white">
                      <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                  </div>
                </motion.div>
              )}

              {stage === "idle" && (
              <>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!photo && (
                  <button
                    onClick={takePhoto}
                    disabled={!cameraActive}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                )}
                {!photo && (
                  <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm">
                    <Upload className="w-4 h-4" /> Upload Photo
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
                {photo && (
                  <button onClick={() => setPhoto(null)} className="rounded-full border bg-white px-4 py-2 text-sm">
                    Retake
                  </button>
                )}
                <button onClick={analyze} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white">
                  {photo ? "Analyze Receipt" : "Use Sample Receipt"}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-500">Each analysis uses 1 receipt scan token.</p>
              </>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {data && (() => {
        const grossSubtotal = data.reduce((s, i) => s + (Number(i.price) || 0), 0);
        const totalItemDiscount = data.reduce((s, i) => s + (Number(i.discount) || 0), 0);
        const totalDiscount = totalItemDiscount + (Number(receiptDiscount) || 0);
        const netTotal = Math.max(0, grossSubtotal - totalDiscount);

        return (
          <Overlay className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Confirm {kind === "purchase" ? "Purchase" : "Sales"} Receipt Contents</h3>
                  <p className="text-xs text-gray-500">Check the item details, discounts, and total before recording to the journal.</p>
                </div>
                <button
                  onClick={() => {
                    setData(null);
                    setReceiptDiscount(0);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {kind === "purchase" && (
                  <p className="text-xs text-gray-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                    💡 Lines matched to a raw material will increase inventory stock. The stock acquisition cost is automatically adjusted proportionally to the price after discounts.
                  </p>
                )}

                {data.map((item, i) => {
                  const m = item.materialId ? getMaterial(item.materialId) : undefined;
                  const itemNet = Math.max(0, (item.price || 0) - (item.discount || 0));
                  return (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 shadow-xs hover:border-gray-300 transition-colors">
                      <div className="flex gap-2 items-center">
                        <input
                          value={item.name}
                          onChange={(e) => {
                            const match = kind === "purchase" ? matchMaterial(e.target.value) : undefined;
                            updateItem(i, { name: e.target.value, ...(match && !item.materialId ? { materialId: match.id } : {}) });
                          }}
                          className="border rounded-lg px-3 py-1.5 flex-1 text-sm font-medium focus:ring-1 focus:ring-primary"
                          placeholder="Item name"
                        />
                        {kind === "purchase" && (
                          <select
                            value={item.materialId}
                            onChange={(e) => updateItem(i, { materialId: e.target.value })}
                            className="border rounded-lg px-2 py-1.5 text-xs text-gray-700 max-w-[140px] sm:max-w-[170px]"
                          >
                            <option value="">Not a raw material</option>
                            {materials.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => setData(data.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          aria-label="Remove"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Qty:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                            className="border rounded-md px-2 py-1 w-16 text-right font-medium"
                          />
                          <span className="text-gray-500">{m?.unit ?? "pcs"}</span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Price:</span>
                            <input
                              type="number"
                              min={0}
                              value={item.price}
                              onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                              className="border rounded-md px-2 py-1 w-24 text-right font-medium"
                              placeholder="0"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-amber-600 font-medium" title="Price reduction for this item only">
                              Disc:
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={item.discount || ""}
                              onChange={(e) => updateItem(i, { discount: Math.max(0, Number(e.target.value)) })}
                              className={`border rounded-md px-2 py-1 w-20 text-right ${
                                (item.discount || 0) > 0 ? "border-amber-300 bg-amber-50 text-amber-700 font-semibold" : "text-gray-700"
                              }`}
                              placeholder="0"
                            />
                          </div>

                          <div className="text-right pl-1 min-w-[70px]">
                            <span className="text-[10px] block text-gray-400 leading-tight">Net</span>
                            <span className="font-semibold text-gray-800">{formatRp(itemNet)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setData([...data, { name: "", price: 0, discount: 0, qty: 1, materialId: "" }])}
                  className="text-sm font-medium text-primary hover:underline py-1 inline-flex items-center gap-1"
                >
                  + Add item
                </button>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal ({data.length} items)</span>
                    <span className="tabular-nums font-medium">{formatRp(grossSubtotal)}</span>
                  </div>

                  {totalItemDiscount > 0 && (
                    <div className="flex justify-between text-xs text-amber-600">
                      <span>Total Item Discounts</span>
                      <span className="tabular-nums font-medium">-{formatRp(totalItemDiscount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Receipt Discount / Shopping Voucher</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-700 text-xs">- Rp</span>
                      <input
                        type="number"
                        min={0}
                        value={receiptDiscount || ""}
                        onChange={(e) => setReceiptDiscount(Math.max(0, Number(e.target.value)))}
                        className="border border-amber-300 rounded-lg px-2 py-1 w-28 text-right text-xs font-bold text-amber-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-baseline font-bold">
                    <div>
                      <span className="text-sm text-gray-900">Final Total</span>
                      {totalDiscount > 0 && (
                        <span className="block text-[11px] font-normal text-emerald-600">
                          You save {formatRp(totalDiscount)}
                        </span>
                      )}
                    </div>
                    <span className="text-lg text-primary tabular-nums">{formatRp(netTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {totalDiscount > 0 ? `Total discount: ${formatRp(totalDiscount)}` : "No discount"}
                </span>
                <button onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm">
                  Record as Journal
                </button>
              </div>
            </div>
          </Overlay>
        );
      })()}
    </div>
  );
});

export default ReceiptScanner;
