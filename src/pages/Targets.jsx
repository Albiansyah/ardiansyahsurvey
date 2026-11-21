import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { getWibPeriod } from "../lib/format";
import { IconSearch, IconTarget } from "../components/Icons";
import { toast } from "../lib/toast";

export default function Targets() {
  const { surveyors, targets, reports, setTarget } = useStore();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const period = getWibPeriod();
  const filtered = useMemo(() => surveyors.filter((surveyor) => surveyor.active && `${surveyor.nama} ${surveyor.email}`.toLowerCase().includes(search.toLowerCase())), [surveyors, search]);

  const valueFor = (surveyor) => drafts[surveyor.id] ?? targets.find((target) => target.userId === surveyor.id)?.target ?? "";
  const save = async (surveyor) => {
    const value = valueFor(surveyor);
    if (value !== "" && Number(value) < 0) return toast.error("Target tidak boleh negatif");
    if (value === "") return toast.error("Isi target sebelum menyimpan");
    try {
      await setTarget(surveyor.id, surveyor.nama, value, period);
      toast.success(`Target ${surveyor.nama} disimpan`);
    } catch (error) {
      toast.error(error.message || "Target gagal disimpan");
    }
  };

  return (
    <div className="space-y-5">
      <header><p className="text-sm font-medium text-emerald-800">Periode {period}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Target surveyor</h1><p className="mt-1 text-sm text-slate-600">Tetapkan target berbeda untuk setiap anggota tim.</p></header>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><label className="relative block"><span className="sr-only">Cari surveyor</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau email surveyor" className="min-h-11 w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((surveyor) => {
          const completed = reports.filter((report) => report.userId === surveyor.id).length;
          const target = Number(valueFor(surveyor));
          const progress = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
          return <section key={surveyor.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{surveyor.nama}</h2><p className="mt-1 text-sm text-slate-600">{surveyor.email}</p></div><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-800"><IconTarget className="h-5 w-5" /></span></div><div className="mt-5 grid grid-cols-[1fr_auto] gap-2"><div><label htmlFor={`target-${surveyor.id}`} className="mb-1.5 block text-sm font-medium">Target laporan</label><input id={`target-${surveyor.id}`} type="number" min="0" inputMode="numeric" value={valueFor(surveyor)} onChange={(event) => setDrafts((current) => ({ ...current, [surveyor.id]: event.target.value }))} placeholder="Belum ditetapkan" className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></div><button type="button" onClick={() => save(surveyor)} className="mt-[1.625rem] min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">Simpan</button></div><div className="mt-4"><div className="flex justify-between text-xs text-slate-600"><span>{completed} laporan selesai</span><span>{target > 0 ? `${progress}%` : "Tanpa target"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-200"><div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} /></div></div></section>;
        })}
      </div>
    </div>
  );
}
