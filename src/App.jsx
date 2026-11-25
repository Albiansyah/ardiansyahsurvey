import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { ShieldX } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Layout from "@/components/Layout";
import { PageError, PageLoading } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import Login from "@/pages/Login";

const BackupRestore = lazy(() => import("@/pages/BackupRestore"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ExportData = lazy(() => import("@/pages/ExportData"));
const History = lazy(() => import("@/pages/History"));
const Outlets = lazy(() => import("@/pages/Outlets"));
const Profile = lazy(() => import("@/pages/Profile"));
const ReportDetail = lazy(() => import("@/pages/ReportDetail"));
const Reports = lazy(() => import("@/pages/Reports"));
const SurveyForm = lazy(() => import("@/pages/SurveyForm"));
const Targets = lazy(() => import("@/pages/Targets"));

const SurveyorList = lazy(() => import("@/pages/SurveyorList"));
const SurveyorCreate = lazy(() => import("@/pages/SurveyorCreate"));
const Questions = lazy(() => import("@/pages/Questions")); // <-- Tambahan: Import halaman Questions

function SurveyFormRoute() {
  const { id } = useParams();
  return <SurveyForm key={id} />;
}

function MasterOnly({ children }) {
  const user = useStore((state) => state.user);
  return user?.role === "master" ? children : <AccessDenied />;
}

function SurveyorOnly({ children }) {
  const user = useStore((state) => state.user);
  return user?.role !== "master" ? children : <AccessDenied />;
}

function AccessDenied() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
      <ShieldX className="mx-auto size-8 text-red-700" aria-hidden="true" />
      <h1 className="mt-3 text-lg font-semibold text-slate-950">Akses ditolak</h1>
      <p className="mt-1 text-sm text-slate-600">Peran akun Anda tidak memiliki izin untuk membuka halaman ini.</p>
      <Button asChild className="mt-5"><Link to="/">Kembali ke Beranda</Link></Button>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
      <h1 className="text-lg font-semibold text-slate-950">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-slate-600">Alamat yang Anda buka tidak tersedia.</p>
      <Button asChild className="mt-5"><Link to="/">Kembali ke Beranda</Link></Button>
    </div>
  );
}

export default function App() {
  const { user, hydrated, loadingData, storageError, initialize, loadData } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!hydrated) return <main className="min-h-dvh p-6"><PageLoading label="Menyiapkan data aplikasi" /></main>;
  if (storageError) return <main className="mx-auto min-h-dvh max-w-lg p-6"><PageError message={storageError} onRetry={user ? loadData : () => window.location.reload()} /></main>;

  return (
    <>
      {!user ? <Login /> : (
        <Layout>
          {loadingData ? <PageLoading label="Mengambil data aplikasi" /> : (
            <Suspense fallback={<PageLoading label="Membuka halaman" />}><Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/form" element={<SurveyorOnly><SurveyForm key="new" /></SurveyorOnly>} />
              <Route path="/edit/:id" element={<SurveyFormRoute />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/export" element={<ExportData />} />
              <Route path="/backup" element={<MasterOnly><BackupRestore /></MasterOnly>} />
              <Route path="/history" element={<History />} />
              <Route path="/outlets" element={<MasterOnly><Outlets /></MasterOnly>} />
              <Route path="/targets" element={<MasterOnly><Targets /></MasterOnly>} />
              
              <Route path="/surveyors" element={<MasterOnly><SurveyorList /></MasterOnly>} />
              <Route path="/surveyors/tambah" element={<MasterOnly><SurveyorCreate /></MasterOnly>} />
              <Route path="/questions" element={<MasterOnly><Questions /></MasterOnly>} /> {/* <-- Tambahan: Rute Questions */}
              
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes></Suspense>
          )}
        </Layout>
      )}
      <Toaster position="top-center" richColors closeButton />
      <ConfirmDialog />
    </>
  );
}