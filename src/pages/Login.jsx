import { useState } from "react";
import { useStore } from "../lib/store";
import { IconShield } from "../components/Icons";
import { toast } from "../lib/toast";

export default function Login() {
  const login = useStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Selamat datang, ${user.nama}`);
    } catch (requestError) {
      setError(requestError.message || "Tidak dapat masuk ke aplikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-100 lg:grid-cols-[1fr_30rem]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-500 font-bold text-slate-950">AS</div><div><p className="font-semibold">Ardi Survey</p><p className="text-sm text-slate-400">Operasional SPHP</p></div></div>
        <div className="max-w-xl"><p className="text-sm font-semibold text-emerald-400">SURVEY LAPANGAN</p><h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">Satu alur untuk data outlet, bukti lokasi, dan tindak lanjut master.</h1><p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">Data akun, laporan, outlet, target, dan log tersimpan aman dalam sistem terpusat.</p></div>
        <p className="text-xs text-slate-500">Akses aplikasi mengikuti peran dan kebijakan RLS.</p>
      </section>
      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 lg:hidden"><div className="grid h-11 w-11 place-items-center rounded-md bg-slate-950 font-bold text-emerald-400">AS</div></div>
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-800"><IconShield className="h-5 w-5" /></span><div><h1 className="text-xl font-bold tracking-tight">Masuk ke Ardi Survey</h1><p className="mt-1 text-sm text-slate-600">Gunakan akun yang diberikan oleh master.</p></div></div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label><input id="email" required autoFocus type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.co.id" className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></div>
            <div><label htmlFor="password" className="mb-1.5 block text-sm font-medium">Kata sandi</label><input id="password" required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></div>
            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            <button type="submit" disabled={loading} className="min-h-11 w-full rounded-md bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Memeriksa akun..." : "Masuk"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
