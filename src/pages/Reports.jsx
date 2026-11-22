import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import ReportCard from "../components/ReportCard";
import { EmptyState } from "../components/PageState";
import { FileText as IconList, Filter as IconFilter, Pencil as IconEdit, Plus as IconPlus, Search as IconSearch, Trash2 as IconTrash, X as IconX } from "lucide-react";
import { toast, useConfirmStore } from "../lib/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reports() {
  const { user, reports, deleteReport, submitChangeRequest } = useStore();
  const confirmStore = useConfirmStore();
  const isMaster = user.role === "master";
  const [search, setSearch] = useState("");
  const [surveyor, setSurveyor] = useState("all");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const surveyors = useMemo(() => [...new Map(reports.map((report) => [report.userId, report.userName])).entries()].map(([id, name]) => ({ id, name })), [reports]);
  const filtered = useMemo(() => reports.filter((report) => {
    if (!isMaster && report.userId !== user.id) return false;
    if (isMaster && surveyor !== "all" && report.userId !== surveyor) return false;
    const haystack = [report.outlet?.outletName, report.outlet?.storeName, report.outlet?.picName, report.userName].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [reports, isMaster, user.id, surveyor, search]);

  const handleMasterDelete = (report) => confirmStore.open({
    title: "Hapus laporan?",
    message: `Survei ${report.outlet?.outletName} akan dihapus permanen dan tercatat di log.`,
    confirmLabel: "Hapus laporan",
    cancelLabel: "Batal",
    variant: "danger",
    onConfirm: async () => {
      try {
        await deleteReport(report.id);
        confirmStore.close();
        toast.success("Laporan dihapus");
      } catch (error) {
        confirmStore.close();
        toast.error(error.message || "Laporan gagal dihapus");
      }
    },
    onCancel: () => confirmStore.close()
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-emerald-800">Data survei</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Laporan</h1><p className="mt-1 text-sm text-slate-600">{filtered.length} laporan ditampilkan.</p></div>
        {!isMaster && <Link to="/form" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><IconPlus className="h-4 w-4" /> Survei Baru</Link>}
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_14rem]">
        <label className="relative"><span className="sr-only">Cari laporan</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari outlet, toko, PIC, atau surveyor" className="min-h-11 w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label>
        {isMaster ? <div className="relative"><span className="sr-only">Filter surveyor</span><IconFilter className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-slate-500" /><Select value={surveyor} onValueChange={setSurveyor}><SelectTrigger className="h-11 w-full pl-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua surveyor</SelectItem>{surveyors.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div> : <div className="flex min-h-11 items-center rounded-md bg-slate-100 px-3 text-sm text-slate-600">Hanya laporan akun Anda</div>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={IconList} title={reports.length === 0 ? "Belum ada laporan" : "Laporan tidak ditemukan"} description={reports.length === 0 ? "Data akan muncul setelah survei pertama disimpan." : "Ubah kata pencarian atau filter surveyor."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} showUser={isMaster}>
              <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                <Link to={`/edit/${report.id}`} aria-label={`${isMaster ? "Edit" : "Ajukan perubahan"} ${report.outlet?.outletName}`} className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800"><IconEdit className="h-4 w-4" /></Link>
                <button type="button" onClick={() => isMaster ? handleMasterDelete(report) : setDeleteCandidate(report)} aria-label={`${isMaster ? "Hapus" : "Ajukan hapus"} ${report.outlet?.outletName}`} className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-red-700 shadow-sm hover:bg-red-50"><IconTrash className="h-4 w-4" /></button>
              </div>
            </ReportCard>
          ))}
        </div>
      )}

      {deleteCandidate && <DeleteRequestDialog report={deleteCandidate} onClose={() => setDeleteCandidate(null)} onSubmit={async (reason) => {
        try {
          await submitChangeRequest({ type: "delete", reportId: deleteCandidate.id, proposedData: null, reason });
          setDeleteCandidate(null);
          toast.success("Pengajuan hapus dikirim ke master");
        } catch (error) {
          toast.error(error.message || "Pengajuan gagal dikirim");
        }
      }} />}
    </div>
  );
}

function DeleteRequestDialog({ report, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);
  useEffect(() => {
    textareaRef.current?.focus();
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-request-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={async (event) => { event.preventDefault(); if (!reason.trim()) return; setSubmitting(true); try { await onSubmit(reason.trim()); } finally { setSubmitting(false); } }} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3"><div><h2 id="delete-request-title" className="font-semibold text-slate-950">Ajukan penghapusan</h2><p className="mt-1 text-sm text-slate-600">{report.outlet?.outletName}</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100" aria-label="Tutup dialog"><IconX className="h-5 w-5" /></button></div>
        <label htmlFor="deleteReason" className="mt-4 block text-sm font-medium text-slate-800">Alasan penghapusan <span className="text-red-700">*</span></label>
        <textarea ref={textareaRef} id="deleteReason" required rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Jelaskan mengapa data perlu dihapus" className="mt-1.5 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" />
        <p className="mt-2 text-xs text-slate-600">Data tetap tersedia sampai master menyetujui pengajuan.</p>
        <div className="mt-5 flex gap-2"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 flex-1 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button><button type="submit" disabled={submitting} className="min-h-11 flex-1 rounded-md bg-red-700 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">{submitting ? "Mengirim..." : "Kirim pengajuan"}</button></div>
      </form>
    </div>
  );
}
