import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { createEvidenceUrl } from "../lib/supabase"; // Import fungsi untuk mengambil URL foto
import { EmptyState } from "../components/PageState";
import {
  CheckCircle2 as IconCheck,
  Filter as IconFilter,
  History as IconHistory,
  Search as IconSearch,
  Loader2,
  Image as IconImage,
  Users as IconUsers,
  FileText as IconFileText,
  Eye as IconEye,
  ExternalLink
} from "lucide-react";
import { formatShortWib } from "../lib/format";
import { toast } from "../lib/toast";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const statusStyle = {
  pending: "bg-amber-100 text-amber-950 border-amber-200",
  approved: "bg-emerald-100 text-emerald-950 border-emerald-200",
  rejected: "bg-red-100 text-red-900 border-red-200"
};

const statusLabel = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak"
};

export default function History() {
  const { user, reports = [], questions = [], changeRequests = [], auditLogs = [], resolveChangeRequest } = useStore();
  const isMaster = user?.role === "master";
  
  const [tab, setTab] = useState("requests");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  
  // State untuk Modal Aksi
  const [rejecting, setRejecting] = useState(null);
  const [approving, setApproving] = useState(null);
  const [viewing, setViewing] = useState(null); // State untuk melihat detail
  const [busy, setBusy] = useState(false);

  const requests = useMemo(() => {
    return changeRequests.filter((request) => {
      if (!isMaster && request.requesterId !== user?.id) return false;
      if (status !== "all" && request.status !== status) return false;
      const text = [request.requesterName, request.reportLabel, request.reason, request.type].filter(Boolean).join(" ").toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [changeRequests, isMaster, user?.id, status, search]);

  const logs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (!isMaster && log.actorId !== user?.id && !changeRequests.some((request) => request.id === log.requestId && request.requesterId === user?.id)) return false;
      const text = [log.actorName, log.description, log.action, log.entityType].filter(Boolean).join(" ").toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [auditLogs, changeRequests, isMaster, user?.id, search]);

  const handleApproveSubmit = async () => {
    if (!approving) return;
    setBusy(true);
    try {
      await resolveChangeRequest(approving.id, "approved", "Disetujui master");
      toast.success("Pengajuan disetujui");
      setApproving(null);
    } catch (error) {
      toast.error(error.message || "Pengajuan gagal diproses");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-emerald-700">{isMaster ? "Audit dan persetujuan" : "Jejak pengajuan"}</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{isMaster ? "Log Aktivitas" : "Riwayat Pengajuan"}</h1>
        <p className="text-sm text-slate-600">
          {isMaster ? "Tinjau perbandingan data sebelum menyetujui perubahan." : "Pantau status perubahan atau penghapusan yang diajukan."}
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col space-y-4">
        
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:w-[400px] p-1 bg-slate-100 rounded-lg">
            <TabsTrigger 
              value="requests" 
              className="h-9 rounded-md text-sm font-medium transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Pengajuan
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="h-9 rounded-md text-sm font-medium transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Log Perubahan
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <IconSearch className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "requests" ? "Cari surveyor atau laporan..." : "Cari pelaku atau aktivitas..."}
                className="h-11 pl-9 w-full transition-shadow focus-visible:ring-emerald-600"
              />
            </div>
            {tab === "requests" && (
              <div className="w-full sm:w-[180px]">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 w-full transition-shadow focus:ring-emerald-600">
                    <div className="flex items-center gap-2 text-slate-600">
                      <IconFilter className="size-4 shrink-0" />
                      <SelectValue placeholder="Semua Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Menunggu</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <TabsContent value="requests" className="w-full m-0 space-y-4 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-300">
          {requests.length === 0 ? (
            <div className="w-full">
              <EmptyState Icon={IconHistory} title="Tidak ada pengajuan" description="Pengajuan edit dan hapus akan tercatat di sini." />
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {requests.map((request) => (
                <Card key={request.id} className="p-4 sm:p-5 w-full transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">
                          {request.type === "edit" ? "Perubahan Laporan" : "Penghapusan Laporan"}
                        </h2>
                        <Badge variant="outline" className={`${statusStyle[request.status]} font-semibold`}>
                          {statusLabel[request.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700">{request.reportLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.requesterName} • {formatShortWib(request.createdAt)}</p>
                    </div>
                    
                    {isMaster && request.status === "pending" && (
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button 
                          variant="outline" 
                          onClick={() => setRejecting(request)} 
                          className="flex-1 h-10 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors"
                        >
                          Tolak
                        </Button>
                        <Button 
                          onClick={() => setApproving(request)} 
                          className="flex-1 h-10 bg-emerald-700 hover:bg-emerald-800 transition-colors"
                        >
                          <IconCheck className="mr-2 size-4" /> Setujui
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Alasan pengajuan</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{request.reason}</p>
                  </div>

                  {/* TOMBOL LIHAT DETAIL PERUBAHAN */}
                  {request.type === "edit" && (
                    <div className="mt-3 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setViewing(request)}
                        className="w-full sm:w-auto text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <IconEye className="mr-2 size-4" /> Lihat Detail Data & Foto
                      </Button>
                    </div>
                  )}

                  {request.status !== "pending" && (
                    <div className="mt-3 border-t border-slate-100 pt-3 text-sm flex items-start gap-1">
                      <span className="font-medium text-slate-700">Keputusan {request.resolvedBy}:</span>
                      <span className="text-slate-600">{request.masterNote || statusLabel[request.status]}, {formatShortWib(request.resolvedAt)}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="w-full m-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-300">
          {logs.length === 0 ? (
            <div className="w-full">
              <EmptyState Icon={IconHistory} title="Belum ada log" description="Aktivitas pembuatan, perubahan, penghapusan, target, dan outlet tercatat otomatis." />
            </div>
          ) : (
            <Card className="overflow-hidden w-full">
              <div className="divide-y divide-slate-100 w-full">
                {logs.map((log) => (
                  <div key={log.id} className="grid gap-3 p-4 sm:grid-cols-[12rem_1fr_10rem] sm:items-start hover:bg-slate-50/80 transition-colors w-full">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{log.actorName}</p>
                      <p className="text-xs text-slate-500">{log.actorRole === "master" ? "Master" : log.actorRole === "user" ? "Surveyor" : "Sistem"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">{log.description}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-800">{log.entityType} • {log.action}</p>
                    </div>
                    <time className="text-xs text-slate-500 sm:text-right">{formatShortWib(log.createdAt)}</time>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= MODAL LIHAT DETAIL PERUBAHAN ================= */}
      <ViewChangeDetailDialog 
        request={viewing} 
        onClose={() => setViewing(null)} 
        originalReport={reports.find(r => r.id === viewing?.reportId)}
        questions={questions}
      />

      {/* ================= MODAL APPROVE ================= */}
      <AlertDialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui pengajuan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {approving?.type === "delete" 
                ? `Laporan ${approving?.reportLabel} akan dihapus permanen dari sistem.` 
                : `Perubahan pada laporan ${approving?.reportLabel} akan langsung diterapkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleApproveSubmit(); }} 
              disabled={busy} 
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <IconCheck className="mr-2 size-4" />}
              Ya, Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================= MODAL REJECT ================= */}
      <RejectDialog 
        request={rejecting} 
        onClose={() => setRejecting(null)} 
        onSubmit={async (note) => {
          try {
            await resolveChangeRequest(rejecting.id, "rejected", note); 
            setRejecting(null); 
            toast.success("Pengajuan ditolak dan tercatat"); 
          } catch (error) { 
            toast.error(error.message || "Pengajuan gagal diproses"); 
            throw error; 
          }
        }} 
      />
    </div>
  );
}

// ===================== KOMPONEN MODAL LIHAT DETAIL =====================
function ViewChangeDetailDialog({ request, originalReport, questions, onClose }) {
  const [newPhotoUrl, setNewPhotoUrl] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // Ambil Signed URL untuk foto baru dari Supabase Storage
  useEffect(() => {
    if (request?.proposedData?.evidence_path) {
      setLoadingPhoto(true);
      createEvidenceUrl(request.proposedData.evidence_path)
        .then(url => setNewPhotoUrl(url))
        .catch(() => toast.error("Gagal memuat foto bukti baru"))
        .finally(() => setLoadingPhoto(false));
    } else {
      setNewPhotoUrl(null);
    }
  }, [request]);

  if (!request || !originalReport) return null;

  const proposed = request.proposedData;

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Perubahan Data</DialogTitle>
          <DialogDescription>
            Laporan: <strong>{request.reportLabel}</strong> oleh {request.requesterName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* PERBANDINGAN JAWABAN */}
          <div>
            <h4 className="font-semibold text-slate-900 border-b pb-2 mb-3 flex items-center gap-2">
              <IconFileText className="size-4 text-emerald-600" /> Jawaban Survei
            </h4>
            <div className="space-y-4">
              {proposed.answers?.map((newAns, idx) => {
                const oldAns = originalReport.answers?.[idx];
                const hasChanged = newAns !== oldAns;
                const questionText = questions[idx]?.text || `Pertanyaan ${idx + 1}`;

                return (
                  <div key={idx} className={`p-3 rounded-lg border ${hasChanged ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
                    <p className="font-medium text-slate-800 text-sm mb-2">{idx + 1}. {questionText}</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 mb-1 block">Sebelumnya:</span>
                        <div className={`p-2 rounded border ${hasChanged ? "bg-red-50 border-red-100 text-red-800" : "bg-white border-slate-200 text-slate-700"}`}>
                          {oldAns || <span className="italic opacity-50">(Kosong)</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-emerald-700 mb-1 block">Diajukan:</span>
                        <div className={`p-2 rounded border ${hasChanged ? "bg-emerald-100 border-emerald-300 font-medium text-emerald-900" : "bg-white border-slate-200 text-slate-700"}`}>
                          {newAns}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PERBANDINGAN TIM */}
          <div>
            <h4 className="font-semibold text-slate-900 border-b pb-2 mb-3 flex items-center gap-2">
              <IconUsers className="size-4 text-emerald-600" /> Anggota Tim
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 mb-1 block">Sebelumnya:</span>
                <p className="text-slate-800">{originalReport.presence?.teamMembers || "-"}</p>
              </div>
              <div className={`p-3 rounded-lg border ${proposed.team_members !== originalReport.presence?.teamMembers ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-xs font-semibold text-emerald-700 mb-1 block">Diajukan:</span>
                <p className={proposed.team_members !== originalReport.presence?.teamMembers ? "font-medium text-emerald-900" : "text-slate-800"}>
                  {proposed.team_members || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* PERBANDINGAN FOTO BUKTI */}
          <div>
            <h4 className="font-semibold text-slate-900 border-b pb-2 mb-3 flex items-center gap-2">
              <IconImage className="size-4 text-emerald-600" /> Bukti Foto
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Foto Lama */}
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Foto Lama:</span>
                {originalReport.evidence?.dataUrl ? (
                  <img src={originalReport.evidence.dataUrl} alt="Foto Lama" className="w-full h-48 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">Tidak ada foto</div>
                )}
              </div>
              
              {/* Foto Baru */}
              <div>
                <span className="text-xs font-semibold text-emerald-700 mb-1 block">Foto Baru (Diajukan):</span>
                {loadingPhoto ? (
                  <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="size-6 text-emerald-600 animate-spin" />
                  </div>
                ) : newPhotoUrl ? (
                  <div className="relative group">
                    <img src={newPhotoUrl} alt="Foto Baru" className="w-full h-48 object-cover rounded-lg border-2 border-emerald-400 shadow-sm" />
                    <a href={newPhotoUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded hover:bg-black/80" title="Buka gambar penuh">
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-300">
                    Foto tidak berubah / kosong
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== KOMPONEN FORM PENOLAKAN =====================
function RejectDialog({ request, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) {
      setNote("");
      setSubmitting(false);
    }
  }, [request]);

  if (!request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(note.trim());
    } catch {
      // Error ditangani di parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan</DialogTitle>
            <DialogDescription>
              Berikan alasan yang jelas mengapa pengajuan untuk laporan <strong>{request.reportLabel}</strong> ditolak.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectNote">Catatan Penolakan <span className="text-red-700">*</span></Label>
            <Textarea 
              id="rejectNote" 
              required 
              rows={4} 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Jelaskan alasan pengajuan ditolak..." 
              className="resize-none"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !note.trim()} className="bg-red-600 hover:bg-red-700">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Tolak Pengajuan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}