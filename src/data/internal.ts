// Internal Management sample data (inventory, payroll, marketing) per sector.
import { MAIN_BRANCH, HEAD_OFFICE } from "../config/access";
import type { BusinessSector } from "../context/BusinessSectorContext";

export type Supplier = { name: string; materials: string[] };

type SectorMock = {
  wip: { name: string; qty: number; unit: string; unitCost: number }[];
  finishedGoods: { name: string; qty: number; unit: string; unitCost: number }[];
  cogsThisMonth: number;
  suppliers: Supplier[];
  roles: [string, string, string, string];
  materialFlow: Record<string, string[]>;
  productFlow: Record<string, string[]>;
};

export const SECTORS: Record<BusinessSector, SectorMock> = {
  culinary: {
    wip: [
      { name: "Marinated Rendang", qty: 25, unit: "kg", unitCost: 160_000 },
      { name: "Base Broth", qty: 40, unit: "kg", unitCost: 40_000 },
    ],
    finishedGoods: [
      { name: "Beef Rendang", qty: 180, unit: "servings", unitCost: 35_000 },
      { name: "Chicken Soto", qty: 220, unit: "servings", unitCost: 18_000 },
    ],
    cogsThisMonth: 48_500_000,
    suppliers: [
      { name: "Meat Supplier A", materials: ["Beef"] },
      { name: "Central Market", materials: ["Spices", "Mixed Vegetables"] },
      { name: "Sejahtera Poultry Farm", materials: ["Chicken"] },
    ],
    roles: ["Cook", "Cashier", "Waiter", "Courier"],
    materialFlow: { Beef: ["Marinated Rendang"], Spices: ["Marinated Rendang", "Base Broth"], Chicken: ["Base Broth"] },
    productFlow: { "Marinated Rendang": ["Beef Rendang"], "Base Broth": ["Chicken Soto"] },
  },
  agribusiness: {
    wip: [{ name: "Fermented Organic Fertilizer", qty: 120, unit: "sacks", unitCost: 75_000 }],
    finishedGoods: [{ name: "Fresh Vegetables", qty: 1200, unit: "kg", unitCost: 6_000 }],
    cogsThisMonth: 12_500_000,
    suppliers: [
      { name: "Partner Farm", materials: ["Seeds", "Compost"] },
      { name: "Makmur Farm Store", materials: ["NPK Fertilizer", "Pesticide"] },
    ],
    roles: ["Farmer", "Warehouse Staff", "Sales Admin", "Driver"],
    materialFlow: { Compost: ["Fermented Organic Fertilizer"], Seeds: ["Fermented Organic Fertilizer"] },
    productFlow: { "Fermented Organic Fertilizer": ["Fresh Vegetables"] },
  },
  fashion: {
    wip: [{ name: "Cut Batik Fabric", qty: 60, unit: "meters", unitCost: 45_000 }],
    finishedGoods: [{ name: "Batik Shirt", qty: 300, unit: "pcs", unitCost: 85_000 }],
    cogsThisMonth: 22_000_000,
    suppliers: [
      { name: "Jaya Garment", materials: ["Fabric", "Zippers"] },
      { name: "Rapi Packaging Store", materials: ["Packaging"] },
    ],
    roles: ["Tailor", "Store Staff", "Online Admin", "Designer"],
    materialFlow: { Fabric: ["Cut Batik Fabric"], Zippers: ["Cut Batik Fabric"] },
    productFlow: { "Cut Batik Fabric": ["Batik Shirt"] },
  },
  manufacturing: {
    wip: [{ name: "Feed Mix", qty: 400, unit: "kg", unitCost: 12_000 }],
    finishedGoods: [{ name: "Packaged Livestock Feed", qty: 1200, unit: "sacks", unitCost: 45_000 }],
    cogsThisMonth: 142_000_000,
    suppliers: [
      { name: "Nusantara Corn Mill", materials: ["Ground Corn"] },
      { name: "Livestock Vitamin Distributor", materials: ["Vitamin Premix"] },
    ],
    roles: ["Production Operator", "QC Staff", "Warehouse Staff", "Driver"],
    materialFlow: { "Ground Corn": ["Feed Mix"], "Vitamin Premix": ["Feed Mix"] },
    productFlow: { "Feed Mix": ["Packaged Livestock Feed"] },
  },
  trade: {
    wip: [],
    finishedGoods: [{ name: "Staple Food Package", qty: 900, unit: "packages", unitCost: 25_000 }],
    cogsThisMonth: 32_000_000,
    suppliers: [
      { name: "Sentral Distributor", materials: ["Consumer Goods"] },
      { name: "Cianjur Rice Agent", materials: ["Rice"] },
    ],
    roles: ["Cashier", "Shop Assistant", "Warehouse Staff", "Courier"],
    materialFlow: {},
    productFlow: {},
  },
};

// ---------- Payroll & KPIs ----------

export type EmployeeKpi = {
  id: string;
  name: string;
  target: number;
  achieved: number;
  unit: string;
  weight: number; // percent, all KPIs should ideally total 100
};

export type Employee = {
  id: string;
  name: string;
  position: string;
  unit: string; // "Head Office" or a branch name
  photo: string;
  baseSalary: number;
  allowance: number;
  overtime: number;
  performance: number; // 0-100
  attendance: number; // 0-100 (% of days present on time)
  target: number; // 0-120 (% weighted KPI achievement), computed from kpi
  phone: string;
  checkIn: string; // today's check-in time, "" = not present yet
  checkOut: string;
  kpi: EmployeeKpi[];
};

export { HEAD_OFFICE };

// Work units: without branches only the original store; once there are branches = Head Office + all branches
export function workUnits(branches: string[]) {
  return branches.length ? [HEAD_OFFICE, ...branches] : [MAIN_BRANCH];
}

const MALE_NAMES = ["Budi Santoso", "Andi Wijaya", "Dimas Prakoso", "Fajar Nugraha", "Rahmat Hasan", "Agus Setiawan", "Hendra Gunawan", "Yusuf Hidayat", "Rizky Pratama", "Bayu Saputra", "Arief Kurniawan", "Galih Ramadhan", "Wahyu Firmansyah", "Ilham Maulana", "Taufik Hidayat", "Eko Prasetyo"];
const FEMALE_NAMES = ["Siti Aminah", "Rina Lestari", "Maya Sari", "Lia Kurniawati", "Nur Aisyah", "Ratna Dewi", "Dewi Anggraini", "Putri Ayu", "Fitri Handayani", "Indah Permata", "Sari Wulandari", "Anisa Rahma", "Yuni Astuti", "Nadia Safitri", "Melati Kusuma", "Tari Oktaviani"];
const HEAD_OFFICE_POSITIONS = ["Operations Manager", "Finance Staff", "HR Staff"];
const MALE_PHOTOS = [32, 45, 12, 75, 22, 36, 51, 68, 15, 83, 41, 57, 3, 27, 64, 90];
const FEMALE_PHOTOS = [44, 65, 21, 33, 57, 79, 12, 90, 8, 26, 49, 71, 3, 37, 62, 85];

// Stable pseudo-random numbers per index so sample data is always the same
const pseudo = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const hashText = (t: string) => Array.from(t).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// Attendance is computed from check-in/out times, the rest from KPIs
export function kpiProgress(kpi: EmployeeKpi[]) {
  const totalWeight = kpi.reduce((s, x) => s + x.weight, 0) || 1;
  const score = kpi.reduce((s, x) => s + Math.min(1.2, x.achieved / (x.target || 1)) * x.weight, 0);
  return Math.round((score / totalWeight) * 100);
}

function initialKpi(i: number, headOffice: boolean, present: number): EmployeeKpi[] {
  const achieve = (t: number, min: number, range: number) => Math.round(t * (min + pseudo(i, t) * range) * 10) / 10;
  const list: Omit<EmployeeKpi, "id">[] = headOffice
    ? [
        { name: "Reports completed on time", target: 12, achieved: achieve(12, 0.75, 0.3), unit: "reports", weight: 40 },
        { name: "On-time attendance", target: 100, achieved: present, unit: "%", weight: 30 },
        { name: "Cost efficiency initiatives", target: 4, achieved: Math.round(achieve(4, 0.5, 0.8)), unit: "programs", weight: 30 },
      ]
    : [
        { name: "Monthly sales target", target: 60, achieved: achieve(60, 0.75, 0.4), unit: "million Rp", weight: 50 },
        { name: "On-time attendance", target: 100, achieved: present, unit: "%", weight: 30 },
        { name: "Customer service rating", target: 5, achieved: Math.round((4 + pseudo(i, 9) * 0.9) * 10) / 10, unit: "/5", weight: 20 },
      ];
  return list.map((x, j) => ({ ...x, id: `kpi-${i + 1}-${j + 1}` }));
}

// Sample employees per work unit: Head Office 3 staff, Main Branch 4 people, other branches 3 people.
// IDs are stable per unit so data the user has edited still matches as branches are added.
export function sectorEmployees(sector: BusinessSector, units: string[] = [MAIN_BRANCH]): Employee[] {
  const roles = SECTORS[sector].roles;
  const result: Employee[] = [];
  const used = new Set<string>();
  units.forEach((unit) => {
    const headOffice = unit === HEAD_OFFICE;
    const count = headOffice ? 3 : unit === MAIN_BRANCH ? 4 : 3;
    const hu = hashText(unit);
    for (let j = 0; j < count; j++) {
      const i = (hu % 997) + j * 13;
      const male = (hu + j) % 2 === 0;
      const pool = male ? MALE_NAMES : FEMALE_NAMES;
      let n = (hu + j * 5) % pool.length;
      while (used.has(pool[n])) n = (n + 1) % pool.length;
      used.add(pool[n]);
      const present = Math.round(82 + pseudo(i, 5) * 18);
      const kpi = initialKpi(i, headOffice, present);
      const baseSalary = headOffice ? [6_500_000, 4_800_000, 4_600_000][j] : [4_200_000, 3_600_000, 3_400_000, 3_300_000][j % 4];
      const notYetPresent = pseudo(i, 8) < 0.12;
      const m = Math.round(-12 + pseudo(i, 3) * 30); // minutes relative to 08:00
      const photo = male ? MALE_PHOTOS[(hu + j) % MALE_PHOTOS.length] : FEMALE_PHOTOS[(hu + j) % FEMALE_PHOTOS.length];
      result.push({
        id: `emp-${slug(unit)}-${j + 1}`,
        name: pool[n],
        position: headOffice ? HEAD_OFFICE_POSITIONS[j] : roles[j % 4],
        unit,
        photo: `https://randomuser.me/api/portraits/${male ? "men" : "women"}/${photo}.jpg`,
        baseSalary,
        allowance: Math.round((baseSalary * 0.13) / 50_000) * 50_000,
        overtime: Math.round((pseudo(i, 6) * 500_000) / 50_000) * 50_000,
        performance: Math.round(70 + pseudo(i, 7) * 26),
        attendance: present,
        target: kpiProgress(kpi),
        phone: `08${12 + (i % 8)}-${String(1000 + Math.floor(pseudo(i, 1) * 8999))}-${String(1000 + Math.floor(pseudo(i, 2) * 8999))}`,
        checkIn: notYetPresent ? "" : `0${7 + (m >= 0 ? 1 : 0)}:${String((60 + m) % 60).padStart(2, "0")}`,
        checkOut: notYetPresent || j % 3 === 1 ? "" : `17:${String(Math.floor(pseudo(i, 4) * 25)).padStart(2, "0")}`,
        kpi,
      });
    }
  });
  return result;
}

// Employee share of BPJS contributions: Health 1%, JHT 2%, JP 1% of base salary + fixed allowance
export const BPJS_DEDUCTION = 0.04;

export function computePay(e: Employee) {
  const gross = e.baseSalary + e.allowance + e.overtime;
  const deduction = Math.round((e.baseSalary + e.allowance) * BPJS_DEDUCTION);
  return { gross, deduction, net: gross - deduction };
}

// Leaderboard score: performance 50%, attendance 30%, target achievement 20% (target capped at 100)
export function employeeScore(e: Employee) {
  return Math.round(e.performance * 0.5 + e.attendance * 0.3 + Math.min(100, e.target) * 0.2);
}

export type Attendance = {
  name: string;
  role: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "On time" | "Slightly late" | "Early";
};

export function initialAttendance(sector: BusinessSector): Attendance[] {
  const roles = SECTORS[sector].roles;
  const day = new Date().toISOString().slice(0, 10);
  return [
    { name: "Budi Santoso", role: roles[0], date: day, checkIn: "08:03", checkOut: "17:15", status: "On time" },
    { name: "Siti Aminah", role: roles[1], date: day, checkIn: "08:10", checkOut: "17:20", status: "Slightly late" },
    { name: "Andi Wijaya", role: roles[2], date: day, checkIn: "07:55", checkOut: "16:50", status: "Early" },
    { name: "Rina Lestari", role: roles[0], date: day, checkIn: "08:05", checkOut: "17:05", status: "On time" },
  ];
}

// ---------- Marketing: social media & e-commerce reviews ----------

export type Platform = "Instagram" | "TikTok" | "Shopee" | "Tokopedia";
export type Sentiment = "positive" | "neutral" | "negative";
export type Topic = "Taste / Quality" | "Price" | "Delivery" | "Service" | "Packaging";

export type Review = {
  id: string;
  platform: Platform;
  user: string;
  rating: number; // 1-5 (Instagram/TikTok: rating converted from sentiment)
  text: string;
  date: string;
  sentiment: Sentiment;
  topics: Topic[];
};

const BASE_REVIEWS: Omit<Review, "id" | "date">[] = [
  { platform: "Shopee", user: "dian***", rating: 5, text: "Item matches the photos, really great quality. Will definitely order again!", sentiment: "positive", topics: ["Taste / Quality"] },
  { platform: "Shopee", user: "arif_k", rating: 2, text: "Delivery took forever, almost a week to arrive.", sentiment: "negative", topics: ["Delivery"] },
  { platform: "Shopee", user: "nina.s", rating: 4, text: "Friendly price, neat packaging. The courier was a bit late.", sentiment: "positive", topics: ["Price", "Packaging", "Delivery"] },
  { platform: "Shopee", user: "bagas99", rating: 3, text: "Not bad, but the packaging was a little dented on arrival.", sentiment: "neutral", topics: ["Packaging"] },
  { platform: "Tokopedia", user: "Rudi H.", rating: 5, text: "Seller replied fast and was friendly, original product.", sentiment: "positive", topics: ["Service", "Taste / Quality"] },
  { platform: "Tokopedia", user: "Melati", rating: 4, text: "Cheaper than other stores, worth it.", sentiment: "positive", topics: ["Price"] },
  { platform: "Tokopedia", user: "Yoga P.", rating: 2, text: "Order arrived incomplete, had to file a complaint first.", sentiment: "negative", topics: ["Service", "Delivery"] },
  { platform: "Instagram", user: "@kulinerhunter.id", rating: 5, text: "A must-try! Amazing taste, and the portion is just right.", sentiment: "positive", topics: ["Taste / Quality"] },
  { platform: "Instagram", user: "@sarahkitchen", rating: 4, text: "Beautiful packaging, perfect for gift hampers.", sentiment: "positive", topics: ["Packaging"] },
  { platform: "Instagram", user: "@budget.mama", rating: 3, text: "Tasty, but the price went up compared to last month.", sentiment: "neutral", topics: ["Price"] },
  { platform: "TikTok", user: "@reviewjujur", rating: 5, text: "Viral for a reason, lived up to expectations!", sentiment: "positive", topics: ["Taste / Quality"] },
  { platform: "TikTok", user: "@anakkos.hemat", rating: 4, text: "Cheap and cheerful for students, recommended.", sentiment: "positive", topics: ["Price"] },
  { platform: "TikTok", user: "@keluhan.ku", rating: 1, text: "Admin never replied to my chat, order cancelled unilaterally.", sentiment: "negative", topics: ["Service"] },
  { platform: "Shopee", user: "fitri_a", rating: 5, text: "Packed safely with bubble wrap, great.", sentiment: "positive", topics: ["Packaging"] },
  { platform: "Tokopedia", user: "Hendra", rating: 3, text: "Product is okay, standard delivery.", sentiment: "neutral", topics: ["Taste / Quality", "Delivery"] },
];

export function initialReviews(): Review[] {
  const now = Date.now();
  return BASE_REVIEWS.map((r, i) => ({
    ...r,
    id: `rv-${i}`,
    date: new Date(now - (i * 1.7 + 0.4) * 86_400_000).toISOString().slice(0, 10),
  }));
}

// "New" reviews that appear when Fetch Latest Reviews is pressed (simulated scraping)
export const NEW_REVIEWS: Omit<Review, "id" | "date">[] = [
  { platform: "Shopee", user: "wulan.d", rating: 2, text: "Courier was late a second time, please switch shipping services.", sentiment: "negative", topics: ["Delivery"] },
  { platform: "TikTok", user: "@foodie.bdg", rating: 5, text: "Yesterday's live stream was fun, the promo was so worth it!", sentiment: "positive", topics: ["Price", "Service"] },
  { platform: "Instagram", user: "@ibu.rumahan", rating: 4, text: "The kids love it, consistent quality.", sentiment: "positive", topics: ["Taste / Quality"] },
  { platform: "Tokopedia", user: "Agus S.", rating: 3, text: "Price went up a little, but still okay.", sentiment: "neutral", topics: ["Price"] },
];
