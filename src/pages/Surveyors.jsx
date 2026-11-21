import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { EmptyState } from "../components/PageState";
import { IconCheck, IconKey, IconSearch, IconUser, IconUserPlus, IconX } from "../components/Icons";
import { toast } from "../lib/toast";

const inputClass = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
};

export default function Surveyors() {
  const { surveyors, createSurveyorAccount } = useStore();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmation: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredential, setCreatedCredential] = useState(null);

  const filtered = useMemo(() => surveyors.filter((surveyor) => `${surveyor.nama} ${surveyor.email}`.toLowerCase().includes(search.toLowerCase())), [surveyors, search]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleGenerate = () => {
    const password = generatePassword();
    setForm((current) => ({ ...current, password, confirmation: password }));
    setShowPassword(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password.length < 8) return toast.error("Password minimal 8 karakter");
    if (form.password !== form.confirmation) return toast.error("Konfirmasi password tidak sama");
    setSubmitting(true);
    try {
      const user = await createSurveyorAccount(form);
      setCreatedCredential({ fullName: user.fullName, email: user.email, password: form.password });
      setForm({ fullName: "", email: "", password: "", confirmation: "" });
      setShowPassword(false);
      toast.success("Akun surveyor berhasil dibuat");
    } catch (error) {
      toast.error(error.message || "Akun surveyor gagal dibuat");
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
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-emerald-800">Manajemen akses</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Akun surveyor</h1><p className="mt-1 text-sm text-slate-600">Master membuat akun dan memberikan kredensialnya langsung kepada surveyor. Tidak tersedia pendaftaran mandiri.</p></header>

      {createdCredential && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-700 text-white"><IconCheck className="h-5 w-5" /></span><div><h2 className="font-semibold text-emerald-950">Akun berhasil dibuat</h2><p className="mt-1 text-sm text-emerald-900">Salin kredensial berikut dan berikan langsung kepada surveyor.</p></div></div><button type="button" onClick={() => setCreatedCredential(null)} className="grid h-11 w-11 place-items-center rounded-md text-emerald-900 hover:bg-emerald-100" aria-label="Tutup informasi kredensial"><IconX className="h-5 w-5" /></button></div>
          <dl className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-white p-4 sm:grid-cols-3"><Credential label="Nama" value={createdCredential.fullName} /><Credential label="Email" value={createdCredential.email} /><Credential label="Password awal" value={createdCredential.password} mono /></dl>
          <button type="button" onClick={copyCredential} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"><IconKey className="h-4 w-4" /> Salin kredensial</button>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-800"><IconUserPlus className="h-5 w-5" /></span><div><h2 className="font-semibold">Buat akun baru</h2><p className="text-sm text-slate-600">Peran otomatis sebagai surveyor.</p></div></div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div><label htmlFor="surveyorName" className="mb-1.5 block text-sm font-medium">Nama lengkap <span className="text-red-700">*</span></label><input id="surveyorName" required minLength={2} maxLength={100} value={form.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder="Nama surveyor" className={inputClass} /></div>
            <div><label htmlFor="surveyorEmail" className="mb-1.5 block text-sm font-medium">Email login <span className="text-red-700">*</span></label><input id="surveyorEmail" required type="email" autoComplete="off" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="nama@perusahaan.co.id" className={inputClass} /></div>
            <div><div className="mb-1.5 flex items-center justify-between gap-2"><label htmlFor="surveyorPassword" className="text-sm font-medium">Password awal <span className="text-red-700">*</span></label><button type="button" onClick={handleGenerate} className="text-xs font-semibold text-emerald-800 hover:underline">Buat password acak</button></div><div className="relative"><input id="surveyorPassword" required minLength={8} maxLength={72} type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => set("password", event.target.value)} placeholder="Minimal 8 karakter" className={`${inputClass} pr-24`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-1 my-1 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showPassword ? "Sembunyikan" : "Tampilkan"}</button></div></div>
            <div><label htmlFor="surveyorConfirmation" className="mb-1.5 block text-sm font-medium">Ulangi password <span className="text-red-700">*</span></label><input id="surveyorConfirmation" required minLength={8} maxLength={72} type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmation} onChange={(event) => set("confirmation", event.target.value)} className={inputClass} /></div>
            <p className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Email langsung dikonfirmasi oleh sistem. Surveyor dapat masuk memakai email dan password yang diberikan master.</p>
            <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"><IconUserPlus className="h-4 w-4" />{submitting ? "Membuat akun..." : "Buat akun surveyor"}</button>
          </form>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Surveyor terdaftar</h2><p className="mt-1 text-sm text-slate-600">{filtered.length} akun ditampilkan.</p></div><label className="relative block sm:w-72"><span className="sr-only">Cari surveyor</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau email" className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label></div>
          {filtered.length === 0 ? <EmptyState Icon={IconUser} title={surveyors.length ? "Surveyor tidak ditemukan" : "Belum ada akun surveyor"} description={surveyors.length ? "Ubah kata pencarian." : "Gunakan formulir untuk membuat akun surveyor pertama."} /> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-200">{filtered.map((surveyor) => <article key={surveyor.id} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 flex-none place-items-center rounded-md bg-slate-100 font-semibold text-slate-700">{surveyor.nama?.[0]}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-950">{surveyor.nama}</h3><p className="truncate text-sm text-slate-600">{surveyor.email}</p></div></div><span className={`rounded px-2 py-1 text-xs font-semibold ${surveyor.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{surveyor.active ? "Aktif" : "Nonaktif"}</span></article>)}</div></div>}
        </section>
      </div>
    </div>
  );
}

function Credential({ label, value, mono = false }) {
  return <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className={`mt-1 break-all text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
