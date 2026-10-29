import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import Financial from "./pages/Financial";
import Journal from "./pages/Journal";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import { ChartOfAccountsProvider } from "./context/ChartOfAccountsContext";
import { InventoryProvider } from "./context/InventoryContext";
import { RawMaterialProvider } from "./context/RawMaterialContext";
import { JournalProvider } from "./context/JournalContext";
import { AccountProvider } from "./context/AccountContext";
import { ToastProvider } from "./context/ToastContext";
import FeatureGate from "./components/FeatureGate";
import InternalManagement from "./pages/InternalManagement";
import DataDriven from "./pages/DataDriven";
import MsmeGrowth from "./pages/MsmeGrowth";
import Funding from "./pages/Funding";
import Profile from "./pages/Profile";
import Consultation from "./pages/Consultation";
import SmartPricing from "./components/SmartPricing";
import Cashier from "./pages/Cashier";
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
              <RawMaterialProvider>
              <JournalProvider>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/financial" element={gated("financialReports", <Financial />)} />
                    <Route path="/journal" element={gated("journal", <Journal />)} />
                    <Route path="/chart-of-accounts" element={gated("chartOfAccounts", <ChartOfAccounts />)} />
                    <Route path="/internal-management" element={gated("internalManagement", <InternalManagement />)} />
                    <Route path="/data-driven" element={gated("audit", <DataDriven />)} />
                    <Route path="/msme-growth" element={gated("msmeGrowth", <MsmeGrowth />)} />
                    <Route path="/funding" element={gated("funding", <Funding />)} />
                    <Route path="/consultation" element={gated("consultation", <Consultation />)} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/subscription" element={<Navigate to="/profile?tab=plans" replace />} />
                    <Route path="/smart-pricing" element={gated("smartPricing", <SmartPricing />)} />
                    <Route path="/cashier" element={gated("cashier", <Cashier />)} />
                  </Route>
                </Routes>
              </JournalProvider>
              </RawMaterialProvider>
            </InventoryProvider>
          </BusinessSectorProvider>
        </ChartOfAccountsProvider>
      </AccountProvider>
    </ToastProvider>
  );
}
