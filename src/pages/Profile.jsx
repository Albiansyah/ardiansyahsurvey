import { useStore } from "../lib/store";
import { LogOut as IconUser, ShieldCheck as IconShield } from "lucide-react";

export default function Profile() {
  const { user, logout } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header><p className="text-sm font-medium text-emerald-800">Akun</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Profil pengguna</h1><p className="mt-1 text-sm text-slate-600">Identitas yang tercatat pada laporan dan log.</p></header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-xl font-bold text-emerald-400">{user.nama[0]}</div><div><h2 className="text-lg font-semibold">{user.nama}</h2><p className="mt-1 text-sm text-slate-600">{user.role === "master" ? "Master" : "Surveyor"}</p></div></div>
        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Email</dt><dd className="mt-1 text-sm font-medium">{user.email}</dd></div><div><dt className="text-xs font-medium text-slate-500">ID akun</dt><dd className="mt-1 text-sm font-medium">{user.id}</dd></div></dl>
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4"><IconShield className="mt-0.5 h-5 w-5 flex-none text-emerald-700" /><div><p className="text-sm font-semibold">Keamanan akun</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Sesi dan hak akses data dikelola berdasarkan peran pengguna di dalam sistem.</p></div></div>
        <button type="button" onClick={logout} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-auto"><IconUser className="h-4 w-4" /> Keluar dari akun</button>
      </section>
    </div>
  );
}
