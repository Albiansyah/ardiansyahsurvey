import { useEffect } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useStore } from "./lib/store";
import Layout from "./components/Layout";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import { PageError, PageLoading } from "./components/PageState";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SurveyForm from "./pages/SurveyForm";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import History from "./pages/History";
import Outlets from "./pages/Outlets";
import Targets from "./pages/Targets";
import Surveyors from "./pages/Surveyors";
import Profile from "./pages/Profile";

function SurveyFormRoute() {
  const { id } = useParams();
  return <SurveyForm key={id} />;
}

function MasterOnly({ children }) {
  const user = useStore((state) => state.user);
  return user?.role === "master" ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, hydrated, loadingData, storageError, initialize, loadData } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!hydrated) return <PageLoading label="Menyiapkan data aplikasi" />;
  if (storageError) return <main className="mx-auto max-w-lg p-6"><PageError message={storageError} onRetry={user ? loadData : () => window.location.reload()} /></main>;
  if (user && loadingData) return <Layout><PageLoading label="Mengambil data aplikasi" /></Layout>;

  return (
    <>
      {!user ? <Login /> : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/form" element={user.role === "master" ? <Navigate to="/" replace /> : <SurveyForm key="new" />} />
            <Route path="/edit/:id" element={<SurveyFormRoute />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/outlets" element={<MasterOnly><Outlets /></MasterOnly>} />
            <Route path="/targets" element={<MasterOnly><Targets /></MasterOnly>} />
            <Route path="/surveyors" element={<MasterOnly><Surveyors /></MasterOnly>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
      <Toast />
      <ConfirmDialog />
    </>
  );
}
