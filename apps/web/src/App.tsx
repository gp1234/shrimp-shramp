import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { FarmProvider } from "./contexts/FarmContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PondsPage } from "./pages/PondsPage";
import { CyclesPage } from "./pages/CyclesPage";
import { FeedingPage } from "./pages/FeedingPage";
import { WaterQualityPage } from "./pages/WaterQualityPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PersonnelPage } from "./pages/PersonnelPage";
import { FinancialPage } from "./pages/FinancialPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PopulationSamplingList } from "./pages/sampling/PopulationSamplingList";
import { PopulationSamplingForm } from "./pages/sampling/PopulationSamplingForm";
import { PreweightList } from "./pages/sampling/PreweightList";
import { PreweightForm } from "./pages/sampling/PreweightForm";
import { DailyWaterControlList } from "./pages/water-control/DailyWaterControlList";
import { DailyWaterControlForm } from "./pages/water-control/DailyWaterControlForm";
import { Box, CircularProgress } from "@mui/material";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return user ? (
    <FarmProvider>{children}</FarmProvider>
  ) : (
    <Navigate to="/login" />
  );
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return user ? <Navigate to="/" /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/ponds" element={<PondsPage />} />
                <Route path="/cycles" element={<CyclesPage />} />
                <Route path="/feeding" element={<FeedingPage />} />
                <Route path="/water-quality" element={<WaterQualityPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/personnel" element={<PersonnelPage />} />
                <Route path="/financial" element={<FinancialPage />} />
                <Route path="/sampling/preweight" element={<PreweightList />} />
                <Route path="/sampling/preweight/new" element={<PreweightForm />} />
                <Route path="/sampling/preweight/:id" element={<PreweightForm />} />
                <Route path="/sampling/population" element={<PopulationSamplingList />} />
                <Route path="/sampling/population/new" element={<PopulationSamplingForm />} />
                <Route path="/sampling/population/:id" element={<PopulationSamplingForm />} />
                <Route path="/water-control" element={<DailyWaterControlList />} />
                <Route path="/water-control/new" element={<DailyWaterControlForm />} />
                <Route path="/water-control/:id" element={<DailyWaterControlForm />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
