import { Link, useLocation } from "react-router-dom";
import { useStore } from "../lib/store";
import {
  IconBuilding, IconDashboard, IconHistory, IconList, IconPlus, IconTarget, IconUser, IconUserPlus
} from "./Icons";

export default function Layout({ children }) {
  const user = useStore((state) => state.user);
  const { pathname } = useLocation();
  const isMaster = user?.role === "master";

  const nav = isMaster
    ? [
        { to: "/", label: "Dashboard", Icon: IconDashboard },
        { to: "/reports", label: "Laporan", Icon: IconList },
        { to: "/outlets", label: "Data Outlet", Icon: IconBuilding },
        { to: "/surveyors", label: "Akun Surveyor", mobileLabel: "Akun", Icon: IconUserPlus },
        { to: "/targets", label: "Target", Icon: IconTarget },
        { to: "/history", label: "Log Aktivitas", Icon: IconHistory }
      ]
    : [
        { to: "/", label: "Beranda", Icon: IconDashboard },
        { to: "/form", label: "Survey Baru", Icon: IconPlus },
        { to: "/reports", label: "Laporan", Icon: IconList },
        { to: "/history", label: "Riwayat", Icon: IconHistory }
      ];

  const isActive = (to) => to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 md:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-slate-950 text-white md:flex">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500 font-bold text-slate-950">AS</div>
            <div>
              <p className="font-semibold tracking-tight">Ardi Survey</p>
              <p className="text-xs text-slate-400">Operasional SPHP</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Navigasi utama">
          {nav.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition ${isActive(to) ? "bg-emerald-500 font-semibold text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
              <Icon className="h-5 w-5 flex-none" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link to="/profile" className={`m-3 flex min-h-14 items-center gap-3 rounded-md border p-3 transition ${isActive("/profile") ? "border-emerald-400 bg-slate-800" : "border-slate-800 hover:bg-slate-900"}`}>
          <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-800 text-sm font-bold text-emerald-400">{user?.nama?.[0]}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.nama}</p>
            <p className="text-xs text-slate-400">{isMaster ? "Master" : "Surveyor"}</p>
          </div>
        </Link>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:ml-64 md:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-xs font-bold text-emerald-400">AS</div>
            <div><p className="text-sm font-semibold">Ardi Survey</p><p className="text-xs text-slate-500">Operasional SPHP</p></div>
          </div>
          <Link to="/profile" aria-label="Buka profil" className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            <IconUser className="h-5 w-5" />
          </Link>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }} aria-label="Navigasi utama mobile">
        {nav.map(({ to, label, mobileLabel, Icon }) => (
          <Link key={to} to={to} className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] transition ${isActive(to) ? "bg-emerald-50 font-semibold text-emerald-900" : "text-slate-500"}`}>
            <Icon className="h-5 w-5" /><span className="truncate">{mobileLabel || label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
