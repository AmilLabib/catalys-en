import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import Financial from "./pages/Financial";
import Jurnal from "./pages/Jurnal";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import { ChartOfAccountsProvider } from "./context/ChartOfAccountsContext";
import { InventoryProvider } from "./context/InventoryContext";
import { BahanBakuProvider } from "./context/BahanBakuContext";
import { JournalProvider } from "./context/JournalContext";
import { AccountProvider } from "./context/AccountContext";
import { ToastProvider } from "./context/ToastContext";
import FeatureGate from "./components/FeatureGate";
import InternalManagement from "./pages/InternalManagement";
import DataDriven from "./pages/DataDriven";
import UmkmBerkembang from "./pages/UmkmBerkembang";
import Permodalan from "./pages/Permodalan";
import Profil from "./pages/Profil";
import Konsultasi from "./pages/Konsultasi";
import SmartPricing from "./components/SmartPricing";
import Kasir from "./pages/Kasir";
import { BusinessSectorProvider } from "./context/BusinessSectorContext";
import type { FeatureKey } from "./config/access";

function gated(feature: FeatureKey, el: React.ReactNode) {
  return <FeatureGate feature={feature}>{el}</FeatureGate>;
}

export default function App() {
  return (
    <ToastProvider>
      <AccountProvider>
        <ChartOfAccountsProvider>
          <BusinessSectorProvider>
            <InventoryProvider>
              <BahanBakuProvider>
              <JournalProvider>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/financial" element={gated("laporanKeuangan", <Financial />)} />
                    <Route path="/jurnal" element={gated("jurnal", <Jurnal />)} />
                    <Route path="/chart-of-accounts" element={gated("baganAkun", <ChartOfAccounts />)} />
                    <Route path="/internal-management" element={gated("manajemenInternal", <InternalManagement />)} />
                    <Route path="/data-driven" element={gated("audit", <DataDriven />)} />
                    <Route path="/umkm-berkembang" element={gated("umkmBerkembang", <UmkmBerkembang />)} />
                    <Route path="/permodalan" element={gated("permodalan", <Permodalan />)} />
                    <Route path="/konsultasi" element={gated("konsultasi", <Konsultasi />)} />
                    <Route path="/profil" element={<Profil />} />
                    <Route path="/subscription" element={<Navigate to="/profil?tab=paket" replace />} />
                    <Route path="/smart-pricing" element={gated("hargaCerdas", <SmartPricing />)} />
                    <Route path="/kasir" element={gated("kasir", <Kasir />)} />
                  </Route>
                </Routes>
              </JournalProvider>
              </BahanBakuProvider>
            </InventoryProvider>
          </BusinessSectorProvider>
        </ChartOfAccountsProvider>
      </AccountProvider>
    </ToastProvider>
  );
}
