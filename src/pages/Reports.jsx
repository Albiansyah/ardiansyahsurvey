import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import ReportCard from "../components/ReportCard";
import { EmptyState } from "../components/PageState";
import {
  FileText as IconList,
  Filter as IconFilter,
  Pencil as IconEdit,
  Plus as IconPlus,
  Search as IconSearch,
  Trash2 as IconTrash,
  Loader2
} from "lucide-react";
import { toast } from "../lib/toast";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function Reports() {
  const { user, reports = [], deleteReport, submitChangeRequest } = useStore();
  const isMaster = user?.role === "master";
  
  const [search, setSearch] = useState("");
  const [surveyor, setSurveyor] = useState("all");
  
  // State untuk Modal Hapus
  const [deleteCandidate, setDeleteCandidate] = useState(null); // Untuk Surveyor (Ajukan Hapus)
  const [masterDeleteCandidate, setMasterDeleteCandidate] = useState(null); // Untuk Master (Hapus Langsung)
  const [deleteBusy, setDeleteBusy] = useState(false);

  const surveyors = useMemo(() => {
    return [...new Map(reports.map((report) => [report.userId, report.userName])).entries()].map(([id, name]) => ({ id, name }));
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      if (!isMaster && report.userId !== user?.id) return false;
      if (isMaster && surveyor !== "all" && report.userId !== surveyor) return false;
      const haystack = [report.outlet?.outletName, report.outlet?.storeName, report.outlet?.picName, report.userName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [reports, isMaster, user?.id, surveyor, search]);

  const handleMasterDeleteSubmit = async () => {
    if (!masterDeleteCandidate) return;
    setDeleteBusy(true);
    try {
      await deleteReport(masterDeleteCandidate.id);
      toast.success("Laporan dihapus permanen");
      setMasterDeleteCandidate(null);
    } catch (error) {
      toast.error(error.message || "Laporan gagal dihapus");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-emerald-700">Data survei</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Laporan</h1>
          <p className="text-sm text-slate-600">{filtered.length} laporan ditampilkan.</p>
        </div>
        {!isMaster && (
          <Button asChild className="h-11 w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
            <Link to="/form">
              <IconPlus className="mr-2 size-4" /> Survei Baru
            </Link>
          </Button>
        )}
      </header>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari outlet, toko, PIC, atau surveyor..."
            className="h-11 pl-9 w-full transition-shadow focus-visible:ring-emerald-600"
          />
        </div>
        
        {isMaster ? (
          <div className="w-full sm:w-[200px]">
            <Select value={surveyor} onValueChange={setSurveyor}>
              <SelectTrigger className="h-11 w-full transition-shadow focus:ring-emerald-600">
                <div className="flex items-center gap-2 text-slate-600">
                  <IconFilter className="size-4 shrink-0" />
                  <SelectValue placeholder="Semua surveyor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua surveyor</SelectItem>
                {surveyors.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 sm:w-auto">
            Hanya laporan akun Anda
          </div>
        )}
      </div>

      {/* Grid Laporan */}
      {filtered.length === 0 ? (
        <div className="w-full animate-in fade-in duration-300">
          <EmptyState 
            Icon={IconList} 
            title={reports.length === 0 ? "Belum ada laporan" : "Laporan tidak ditemukan"} 
            description={reports.length === 0 ? "Data akan muncul setelah survei pertama disimpan." : "Coba ubah kata pencarian atau filter surveyor."} 
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-in fade-in-50 duration-300">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} showUser={isMaster}>
              <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-white/90 backdrop-blur-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors shadow-sm"
                >
                  <Link to={`/edit/${report.id}`} aria-label={`${isMaster ? "Edit" : "Ajukan perubahan"} ${report.outlet?.outletName}`}>
                    <IconEdit className="size-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => isMaster ? setMasterDeleteCandidate(report) : setDeleteCandidate(report)}
                  className="h-10 w-10 bg-white/90 backdrop-blur-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                  aria-label={`${isMaster ? "Hapus" : "Ajukan hapus"} ${report.outlet?.outletName}`}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            </ReportCard>
          ))}
        </div>
      )}

      {/* MODAL HAPUS UNTUK MASTER (Langsung) */}
      <AlertDialog open={!!masterDeleteCandidate} onOpenChange={(open) => !open && setMasterDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus laporan secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Survei untuk outlet <strong>{masterDeleteCandidate?.outlet?.outletName}</strong> akan dihapus dari sistem dan tindakan ini akan tercatat di log aktivitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleMasterDeleteSubmit(); }} 
              disabled={deleteBusy} 
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <IconTrash className="mr-2 size-4" />}
              Ya, Hapus Laporan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL PENGAJUAN HAPUS UNTUK SURVEYOR */}
      <DeleteRequestDialog 
        report={deleteCandidate} 
        onClose={() => setDeleteCandidate(null)} 
        onSubmit={async (reason) => {
          try {
            await submitChangeRequest({ type: "delete", reportId: deleteCandidate.id, proposedData: null, reason });
            setDeleteCandidate(null);
            toast.success("Pengajuan hapus dikirim ke master");
          } catch (error) {
            toast.error(error.message || "Pengajuan gagal dikirim");
            throw error;
          }
        }} 
      />
    </div>
  );
}

// ===================== KOMPONEN MODAL PENGAJUAN HAPUS =====================
function DeleteRequestDialog({ report, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form ketika target berubah
  useEffect(() => {
    if (report) {
      setReason("");
      setSubmitting(false);
    }
  }, [report]);

  if (!report) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } catch {
      // Error ditangani di parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajukan Penghapusan</DialogTitle>
            <DialogDescription>
              Ajukan penghapusan untuk laporan outlet <strong>{report.outlet?.outletName}</strong>. Data tetap tersedia sampai master menyetujui.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="deleteReason">Alasan penghapusan <span className="text-red-700">*</span></Label>
            <Textarea 
              id="deleteReason" 
              required 
              rows={4} 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="Jelaskan mengapa data perlu dihapus..." 
              className="resize-none"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !reason.trim()} className="bg-red-600 hover:bg-red-700">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}