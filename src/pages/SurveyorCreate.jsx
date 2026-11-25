import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { toast } from "../lib/toast";
import { CheckCircle2 as IconCheck, KeyRound as IconKey, X as IconX, ArrowLeft, UserPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
};

export default function SurveyorCreate() {
  const { createSurveyorAccount } = useStore();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmation: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredential, setCreatedCredential] = useState(null);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleGenerate = () => {
    const password = generatePassword();
    setForm((current) => ({ ...current, password, confirmation: password }));
    setShowPassword(true);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (form.password.length < 8) return toast.error("Password minimal 8 karakter");
    if (form.password !== form.confirmation) return toast.error("Konfirmasi password tidak sama");
    if (typeof createSurveyorAccount !== "function") return toast.error("Fungsi pembuatan akun tidak tersedia.");
    
    setSubmitting(true);
    try {
      const user = await createSurveyorAccount(form);
      setCreatedCredential({ 
        fullName: user?.fullName || form.fullName, 
        email: user?.email || form.email, 
        password: form.password 
      });
      setForm({ fullName: "", email: "", password: "", confirmation: "" });
      setShowPassword(false);
      toast.success("Akun surveyor berhasil dibuat");
    } catch (error) {
      toast.error(error?.message || "Akun surveyor gagal dibuat");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredential = async () => {
    if (!createdCredential) return;
    try {
      await navigator.clipboard.writeText(`Nama: ${createdCredential.fullName}\nEmail: ${createdCredential.email}\nPassword awal: ${createdCredential.password}`);
      toast.success("Kredensial disalin");
    } catch {
      toast.error("Kredensial gagal disalin");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <Button variant="link" asChild className="p-0 h-auto text-slate-500 hover:text-emerald-700 mb-2">
          <Link to="/surveyors"><ArrowLeft className="mr-2 size-4" /> Kembali ke Daftar</Link>
        </Button>
        <p className="text-sm font-medium text-emerald-700">Manajemen akses</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Tambah Surveyor Baru</h1>
        <p className="text-sm text-slate-600">Buat akun dan berikan kredensialnya langsung kepada surveyor.</p>
      </header>

      {createdCredential && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white"><IconCheck className="size-5" /></span>
              <div>
                <h2 className="font-semibold text-emerald-950">Akun berhasil dibuat</h2>
                <p className="mt-1 text-sm text-emerald-900">Salin kredensial berikut dan berikan langsung kepada surveyor.</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setCreatedCredential(null)} className="text-emerald-900 hover:bg-emerald-100"><IconX className="size-5" /></Button>
          </div>
          <dl className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-white p-4 sm:grid-cols-3">
            <div><dt className="text-xs font-medium text-slate-500">Nama</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-950">{createdCredential.fullName}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-950">{createdCredential.email}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Password awal</dt><dd className="mt-1 break-all text-sm font-mono font-semibold text-slate-950">{createdCredential.password}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={copyCredential} className="h-11 bg-emerald-800 hover:bg-emerald-900"><IconKey className="mr-2 size-4" /> Salin Kredensial</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/surveyors')} className="h-11 bg-white">Selesai & Kembali</Button>
          </div>
        </section>
      )}

      {!createdCredential && (
        <Card>
          <CardHeader>
            <CardTitle>Formulir Akun Baru</CardTitle>
            <CardDescription>Peran otomatis sebagai surveyor dengan akses ke aplikasi lapangan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nama lengkap <span className="text-red-700">*</span></Label>
                <Input id="fullName" required minLength={2} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Nama surveyor" className="h-11" />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="email">Email login <span className="text-red-700">*</span></Label>
                <Input id="email" type="email" required autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nama@perusahaan.co.id" className="h-11" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password awal <span className="text-red-700">*</span></Label>
                  <Button type="button" variant="link" onClick={handleGenerate} className="h-auto p-0 text-xs font-semibold text-emerald-700">Buat password acak</Button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Minimal 8 karakter" className="h-11 pr-24" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-1 my-1 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showPassword ? "Sembunyikan" : "Tampilkan"}</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmation">Ulangi password <span className="text-red-700">*</span></Label>
                <Input id="confirmation" type={showPassword ? "text" : "password"} required minLength={8} value={form.confirmation} onChange={(e) => set("confirmation", e.target.value)} className="h-11" />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                Email langsung dikonfirmasi oleh sistem. Surveyor dapat masuk memakai email dan password yang diberikan master.
              </div>

              <Button type="submit" disabled={submitting} className="h-11 w-full bg-emerald-700 hover:bg-emerald-800">
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                {submitting ? "Membuat akun..." : "Buat akun surveyor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}