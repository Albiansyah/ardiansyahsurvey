import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { EmptyState } from "../components/PageState";
import { IconCheck, IconFilter, IconHistory, IconSearch, IconX } from "../components/Icons";
import { formatShortWib } from "../lib/format";
import { toast, useConfirmStore } from "../lib/toast";

const statusStyle = {
  pending: "bg-amber-100 text-amber-950",
  approved: "bg-emerald-100 text-emerald-950",
  rejected: "bg-red-100 text-red-900"
};
const statusLabel = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };

export default function History() {
  const { user, changeRequests, auditLogs, resolveChangeRequest } = useStore();
  const confirmStore = useConfirmStore();
  const isMaster = user.role === "master";
  const [tab, setTab] = useState("requests");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [rejecting, setRejecting] = useState(null);

  const requests = useMemo(() => changeRequests.filter((request) => {
    if (!isMaster && request.requesterId !== user.id) return false;
    if (status !== "all" && request.status !== status) return false;
    return [request.requesterName, request.reportLabel, request.reason, request.type].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  }), [changeRequests, isMaster, user.id, status, search]);
  const logs = useMemo(() => auditLogs.filter((log) => {
    if (!isMaster && log.actorId !== user.id && !changeRequests.some((request) => request.id === log.requestId && request.requesterId === user.id)) return false;
    return [log.actorName, log.description, log.action, log.entityType].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  }), [auditLogs, changeRequests, isMaster, user.id, search]);

  const approve = (request) => confirmStore.open({
    title: "Setujui pengajuan?",
    message: request.type === "delete" ? `Laporan ${request.reportLabel} akan dihapus.` : `Perubahan ${request.reportLabel} akan diterapkan.`,
    confirmLabel: "Setujui", cancelLabel: "Batal", variant: "success",
    onConfirm: async () => {
      try { await resolveChangeRequest(request.id, "approved", "Disetujui master"); confirmStore.close(); toast.success("Pengajuan disetujui"); }
      catch (error) { confirmStore.close(); toast.error(error.message || "Pengajuan gagal diproses"); }
    },
    onCancel: () => confirmStore.close()
  });

  return (
    <div className="space-y-5">
      <header><p className="text-sm font-medium text-emerald-800">{isMaster ? "Audit dan persetujuan" : "Jejak pengajuan"}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{isMaster ? "Log aktivitas" : "Riwayat"}</h1><p className="mt-1 text-sm text-slate-600">{isMaster ? "Tinjau pengajuan dan telusuri perubahan data." : "Pantau status perubahan atau penghapusan yang diajukan."}</p></header>

      <div className="border-b border-slate-300"><div className="flex gap-5" role="tablist" aria-label="Jenis riwayat"><button type="button" role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")} className={`min-h-11 border-b-2 text-sm font-semibold ${tab === "requests" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-600"}`}>Pengajuan</button><button type="button" role="tab" aria-selected={tab === "logs"} onClick={() => setTab("logs")} className={`min-h-11 border-b-2 text-sm font-semibold ${tab === "logs" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-600"}`}>Log perubahan</button></div></div>

      <div className={`grid gap-3 rounded-xl border border-slate-200 bg-white p-3 ${tab === "requests" ? "sm:grid-cols-[1fr_13rem]" : ""}`}><label className="relative"><span className="sr-only">Cari riwayat</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "requests" ? "Cari surveyor, outlet, atau alasan" : "Cari pelaku atau aktivitas"} className="min-h-11 w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label>{tab === "requests" && <label className="relative"><span className="sr-only">Filter status</span><IconFilter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></select></label>}</div>

      {tab === "requests" ? (
        requests.length === 0 ? <EmptyState Icon={IconHistory} title="Tidak ada pengajuan" description="Pengajuan edit dan hapus akan tercatat di sini." /> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{request.type === "edit" ? "Perubahan laporan" : "Penghapusan laporan"}</h2><span className={`rounded px-2 py-1 text-xs font-semibold ${statusStyle[request.status]}`}>{statusLabel[request.status]}</span></div><p className="mt-1 text-sm font-medium text-slate-700">{request.reportLabel}</p><p className="mt-1 text-xs text-slate-500">{request.requesterName} · {formatShortWib(request.createdAt)}</p></div>{isMaster && request.status === "pending" && <div className="flex gap-2"><button type="button" onClick={() => setRejecting(request)} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50">Tolak</button><button type="button" onClick={() => approve(request)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"><IconCheck className="h-4 w-4" /> Setujui</button></div>}</div><div className="mt-4 rounded-md bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Alasan pengajuan</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{request.reason}</p></div>{request.status !== "pending" && <div className="mt-3 border-t border-slate-100 pt-3 text-sm"><span className="font-medium">Keputusan {request.resolvedBy}:</span> <span className="text-slate-600">{request.masterNote || statusLabel[request.status]}, {formatShortWib(request.resolvedAt)}</span></div>}</article>)}</div>
      ) : (
        logs.length === 0 ? <EmptyState Icon={IconHistory} title="Belum ada log" description="Aktivitas pembuatan, perubahan, penghapusan, target, dan outlet tercatat otomatis." /> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-200">{logs.map((log) => <div key={log.id} className="grid gap-2 p-4 sm:grid-cols-[10rem_1fr_10rem]"><div><p className="text-sm font-semibold text-slate-900">{log.actorName}</p><p className="text-xs text-slate-500">{log.actorRole === "master" ? "Master" : log.actorRole === "user" ? "Surveyor" : "Sistem"}</p></div><div><p className="text-sm text-slate-800">{log.description}</p><p className="mt-1 text-xs font-medium text-emerald-800">{log.entityType} · {log.action}</p></div><time className="text-xs text-slate-500 sm:text-right">{formatShortWib(log.createdAt)}</time></div>)}</div></div>
      )}

      {rejecting && <RejectDialog request={rejecting} onClose={() => setRejecting(null)} onSubmit={async (note) => {
        try { await resolveChangeRequest(rejecting.id, "rejected", note); setRejecting(null); toast.success("Pengajuan ditolak dan tercatat"); }
        catch (error) { toast.error(error.message || "Pengajuan gagal diproses"); throw error; }
      }} />}
    </div>
  );
}

function RejectDialog({ request, onClose, onSubmit }) {
  const [note, setNote] = useState(""); const [submitting, setSubmitting] = useState(false); const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); const key = (event) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onClose]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title"><form onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); try { await onSubmit(note.trim()); } catch { /* feedback ditampilkan parent */ } finally { setSubmitting(false); } }} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="reject-title" className="font-semibold">Tolak pengajuan</h2><p className="mt-1 text-sm text-slate-600">{request.reportLabel}</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-md hover:bg-slate-100" aria-label="Tutup dialog"><IconX className="h-5 w-5" /></button></div><label htmlFor="rejectNote" className="mt-4 block text-sm font-medium">Catatan penolakan <span className="text-red-700">*</span></label><textarea ref={ref} id="rejectNote" required rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Jelaskan alasan pengajuan ditolak" className="mt-1.5 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /><div className="mt-5 flex gap-2"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 flex-1 rounded-md border border-slate-300 text-sm font-semibold">Batal</button><button type="submit" disabled={submitting} className="min-h-11 flex-1 rounded-md bg-red-700 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">{submitting ? "Memproses..." : "Tolak pengajuan"}</button></div></form></div>;
}
