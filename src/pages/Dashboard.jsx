import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { EmptyState } from "../components/PageState";
import ReportCard from "../components/ReportCard";
import { IconBuilding, IconCheck, IconHistory, IconList, IconPlus, IconTarget } from "../components/Icons";
import { getWibPeriod } from "../lib/format";

export default function Dashboard() {
  const { user, reports, outlets, targets, changeRequests } = useStore();
  const isMaster = user.role === "master";
  return isMaster
    ? <MasterDashboard reports={reports} outlets={outlets} targets={targets} requests={changeRequests} />
    : <SurveyorDashboard user={user} reports={reports} targets={targets} requests={changeRequests} />;
}

function SurveyorDashboard({ user, reports, targets, requests }) {
  const mine = reports.filter((report) => report.userId === user.id);
  const currentPeriod = getWibPeriod();
  const targetRecord = targets.find((target) => target.userId === user.id);
  const target = targetRecord?.target;
  const progress = Number.isFinite(target) && target > 0 ? Math.min(100, Math.round((mine.length / target) * 100)) : 0;
  const pending = requests.filter((request) => request.requesterId === user.id && request.status === "pending").length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">{currentPeriod}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Halo, {user.nama}</h1>
        <p className="mt-1 text-sm text-slate-600">Pantau target dan lanjutkan survey outlet berikutnya.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl bg-slate-950 p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm text-slate-300">Target survey</p><p className="mt-2 text-3xl font-bold">{target == null ? "Belum ditetapkan" : `${mine.length} dari ${target}`}</p></div>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-emerald-500 text-slate-950"><IconTarget className="h-6 w-6" /></span>
          </div>
          {target == null ? (
            <p className="mt-5 text-sm text-slate-300">Master belum menetapkan target untuk periode ini.</p>
          ) : (
            <div className="mt-5"><div className="h-2 overflow-hidden rounded-sm bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-slate-300">{progress}% target tercapai</p></div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Laporan tersimpan" value={mine.length} Icon={IconList} />
          <Stat label="Pengajuan diproses" value={pending} Icon={IconHistory} />
        </div>
      </section>

      <Link to="/form" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-fit"><IconPlus className="h-5 w-5" /> Mulai survey outlet</Link>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Laporan terbaru</h2><p className="text-sm text-slate-600">Survey yang terakhir dikirim.</p></div>{mine.length > 0 && <Link to="/reports" className="text-sm font-semibold text-emerald-800 hover:underline">Lihat semua</Link>}</div>
        {mine.length === 0 ? (
          <EmptyState Icon={IconList} title="Belum ada laporan" description="Mulai survey pertama setelah target dan data outlet tersedia." action={<Link to="/form" className="inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Buat laporan pertama</Link>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{mine.slice(0, 6).map((report) => <ReportCard key={report.id} report={report} />)}</div>
        )}
      </section>
    </div>
  );
}

function MasterDashboard({ reports, outlets, targets, requests }) {
  const pending = requests.filter((request) => request.status === "pending").length;
  const cleanEvidence = reports.filter((report) => (report.evidence?.metadata?.riskFlags?.length || 0) === 0).length;
  const assignedTargets = targets.filter((target) => target.target != null).length;

  return (
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-emerald-800">Kendali operasional</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard master</h1><p className="mt-1 text-sm text-slate-600">Ringkasan survey, outlet, target, dan pengajuan perubahan.</p></header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total laporan" value={reports.length} Icon={IconList} strong />
        <Stat label="Outlet aktif" value={outlets.filter((outlet) => outlet.status === "aktif").length} Icon={IconBuilding} />
        <Stat label="Target ditetapkan" value={assignedTargets} Icon={IconTarget} />
        <Stat label="Menunggu keputusan" value={pending} Icon={IconHistory} attention={pending > 0} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Kualitas bukti lapangan</h2><p className="mt-1 text-sm text-slate-600">Berdasarkan indikator dasar foto dan GPS.</p></div><IconCheck className="h-6 w-6 text-emerald-700" /></div>
          {reports.length === 0 ? <p className="mt-6 text-sm text-slate-500">Belum ada bukti untuk dinilai.</p> : <div className="mt-6"><p className="text-3xl font-bold">{cleanEvidence} <span className="text-base font-medium text-slate-500">dari {reports.length}</span></p><p className="mt-1 text-sm text-slate-600">laporan tanpa indikator risiko client.</p></div>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tindakan berikutnya</h2>
          <div className="mt-4 space-y-2">
            <QuickLink to="/history" label="Tinjau pengajuan perubahan" meta={`${pending} menunggu`} />
            <QuickLink to="/outlets" label="Kelola data outlet" meta={`${outlets.length} data`} />
            <QuickLink to="/targets" label="Atur target surveyor" meta={`${assignedTargets} ditetapkan`} />
          </div>
        </div>
      </section>
      <section><div className="mb-3"><h2 className="font-semibold">Laporan terbaru</h2><p className="text-sm text-slate-600">Data survey terbaru dari seluruh tim.</p></div>{reports.length === 0 ? <EmptyState Icon={IconList} title="Belum ada laporan masuk" description="Laporan akan muncul setelah surveyor menyelesaikan survey." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{reports.slice(0, 6).map((report) => <ReportCard key={report.id} report={report} showUser />)}</div>}</section>
    </div>
  );
}

function Stat({ label, value, Icon, strong = false, attention = false }) {
  return <div className={`rounded-xl border p-4 ${strong ? "border-slate-950 bg-slate-950 text-white" : attention ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-2"><p className={`text-xs font-medium ${strong ? "text-slate-300" : "text-slate-600"}`}>{label}</p><Icon className={`h-4 w-4 ${strong ? "text-emerald-400" : attention ? "text-amber-800" : "text-emerald-700"}`} /></div><p className="mt-3 text-2xl font-bold">{value}</p></div>;
}

function QuickLink({ to, label, meta }) {
  return <Link to={to} className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 text-sm hover:border-emerald-600 hover:bg-emerald-50"><span className="font-medium text-slate-900">{label}</span><span className="text-xs text-slate-500">{meta}</span></Link>;
}
