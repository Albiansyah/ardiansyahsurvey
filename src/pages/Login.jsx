import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Brand from "@/components/Brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

export default function Login() {
  const login = useStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Selamat datang, ${user.nama}.`);
    } catch (requestError) {
      setError(requestError.message || "Akun tidak dapat diperiksa. Periksa email, kata sandi, dan koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh bg-slate-50 lg:grid-cols-[1fr_30rem]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-label="Pengantar aplikasi">
        <Brand inverse />
        <div className="max-w-xl border-l-[3px] border-emerald-500 pl-6">
          <p className="text-sm font-semibold text-emerald-300">Survei lapangan SPHP</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">Catat kondisi outlet dan bukti lapangan dalam satu alur kerja.</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">Masuk menggunakan akun yang diberikan oleh master untuk mengakses pekerjaan sesuai peran Anda.</p>
        </div>
        <p className="text-xs text-slate-400">Akses data disesuaikan dengan peran akun.</p>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-7 lg:hidden"><Brand /></div>
          <div className="flex items-start gap-3">
            <span className="grid size-10 flex-none place-items-center rounded-md bg-emerald-100 text-emerald-900"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">Masuk ke Ardi Survey</h1>
              <p className="mt-1 text-sm text-slate-600">Gunakan akun yang diberikan oleh master.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="h-11 text-base md:text-sm" aria-invalid={Boolean(error)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <div className="relative">
                <Input id="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="h-11 pr-12 text-base md:text-sm" aria-invalid={Boolean(error)} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-0 top-0 grid size-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                  {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
              <p className="text-xs text-slate-600">Hubungi master untuk mengatur ulang kata sandi.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Belum dapat masuk</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {loading ? "Memeriksa akun" : "Masuk"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
