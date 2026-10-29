import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Boxes, Users, Megaphone, Lock, Building2, Crown } from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAccount } from "../context/AccountContext";
import { useBusinessSector } from "../context/BusinessSectorContext";
import PillTabs from "../components/PillTabs";
import { INTERNAL_TAB_PLAN, PLAN_LABEL, lockedMessage, pesanPeran, planAtLeast } from "../config/access";
import TabInventaris from "./internal/TabInventaris";
import TabPenggajian from "./internal/TabPenggajian";
import TabPemasaran from "./internal/TabPemasaran";

const SEMUA_TAB = [
  { key: "inventaris", label: "Persediaan", icon: Boxes },
  { key: "penggajian", label: "Sumber Daya", icon: Users },
  { key: "pemasaran", label: "Pemasaran", icon: Megaphone },
] as const;

type TabKey = (typeof SEMUA_TAB)[number]["key"];

export default function InternalManagement() {
  usePageTitle("Manajemen Internal");
  const { role, plan, pindahAkun } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tabTerkunci, setTabTerkunci] = useState<TabKey | null>(null);
  const { sector } = useBusinessSector();
  const [params, setParams] = useSearchParams();
  // Akun cabang hanya mengelola persediaannya sendiri; tab lain juga dibuka bertahap per paket
  const kunciPeran = (k: TabKey) => role === "cabang" && k !== "inventaris";
  const tabs = SEMUA_TAB.map((t) => ({
    ...t,
    terkunci: kunciPeran(t.key)
      ? pesanPeran(["induk"])
      : !planAtLeast(plan, INTERNAL_TAB_PLAN[t.key])
        ? lockedMessage(INTERNAL_TAB_PLAN[t.key])
        : undefined,
  }));
  const labelTerkunci = SEMUA_TAB.find((t) => t.key === tabTerkunci)?.label ?? "";
  const minta = params.get("tab") as TabKey | null;
  const aktif: TabKey = tabs.some((t) => t.key === minta && !t.terkunci) ? minta! : "inventaris";

  return (
    <div className="max-w-[80rem] mx-auto">
      <p className="text-sm text-gray-600 mb-4">
        Operasional harian bisnis: persediaan bahan baku dan supplier, sumber daya manusia dan penggajian, serta pemantauan ulasan pelanggan di media sosial dan e-commerce.
      </p>
      <PillTabs tabs={tabs} active={aktif} onChange={(k) => setParams({ tab: k })} onTerkunci={setTabTerkunci} className="mb-6" />
      <Modal isOpen={!!tabTerkunci} onClose={() => setTabTerkunci(null)} title={labelTerkunci}>
        {tabTerkunci && !kunciPeran(tabTerkunci) ? (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-primary">
              {labelTerkunci} belum termasuk paket {PLAN_LABEL[plan]}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {lockedMessage(INTERNAL_TAB_PLAN[tabTerkunci])}. Upgrade langganan untuk membukanya di seluruh usaha.
            </p>
            <button
              onClick={() => {
                setTabTerkunci(null);
                navigate("/profil?tab=paket");
              }}
              className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Crown className="w-4 h-4" /> Lihat & Upgrade Paket
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl chip-gradient flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-primary">Fitur khusus akun Induk</h3>
            <p className="mt-1 text-sm text-gray-600">
              Akun cabang hanya mengelola persediaannya sendiri. Sumber daya dan pemasaran dikelola terpusat oleh akun Induk.
            </p>
            <button
              onClick={() => {
                const t = tabTerkunci;
                setTabTerkunci(null);
                pindahAkun("induk");
                toast("Sekarang di akun Induk", "info");
                if (t) setParams({ tab: t });
              }}
              className="mt-4 btn-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Building2 className="w-4 h-4" /> Pindah ke akun Induk
            </button>
          </div>
        )}
      </Modal>
      {aktif === "inventaris" && <TabInventaris key={sector} />}
      {aktif === "penggajian" && <TabPenggajian key={sector} />}
      {aktif === "pemasaran" && <TabPemasaran />}
    </div>
  );
}
