import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { getWibPeriod } from "../lib/format";
import { Search as IconSearch, Target as IconTarget, Loader2, Users, AlertTriangle } from "lucide-react";
import { toast } from "../lib/toast";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Targets() {
  const { surveyors = [], targets = [], reports = [], setTarget } = useStore();
  
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  
  // State untuk Bulk / Global Target
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkOnlyFiltered, setBulkOnlyFiltered] = useState(true);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const period = getWibPeriod();

  const filtered = useMemo(() => {
    return surveyors.filter((surveyor) => 
      surveyor.active && `${surveyor.nama} ${surveyor.email}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [surveyors, search]);

  const valueFor = (surveyor) => {
    return drafts[surveyor.id] ?? targets.find((target) => target.userId === surveyor.id)?.target ?? "";
  };

  const save = async (surveyor) => {
    const value = valueFor(surveyor);
    if (value !== "" && Number(value) < 0) return toast.error("Target tidak boleh negatif");
    if (value === "") return toast.error("Isi target sebelum menyimpan");
    
    setSavingId(surveyor.id);
    try {
      await setTarget(surveyor.id, surveyor.nama, value, period);
      toast.success(`Target ${surveyor.nama} disimpan`);
      setDrafts((current) => {
        const next = { ...current };
        delete next[surveyor.id];
        return next;
      });
    } catch (error) {
      toast.error(error.message || "Target gagal disimpan");
    } finally {
      setSavingId(null);
    }
  };

  const openBulkDialog = () => {
    setBulkValue("");
    setBulkOnlyFiltered(search.length > 0); // Default ke true jika sedang mencari
    setBulkDialogOpen(true);
  };

  const handleBulkSavePrompt = (e) => {
    e.preventDefault();
    if (bulkValue === "" || Number(bulkValue) < 0) {
      return toast.error("Masukkan angka target yang valid (minimal 0)");
    }
    setBulkDialogOpen(false);
    setBulkConfirmOpen(true);
  };

  const executeBulkSave = async () => {
    const targetSurveyors = bulkOnlyFiltered ? filtered : surveyors.filter(s => s.active);
    if (targetSurveyors.length === 0) return;

    setBulkBusy(true);
    try {
      // Eksekusi berurutan atau paralel. Di sini kita pakai Promise.all agar cepat.
      await Promise.all(
        targetSurveyors.map((surveyor) => 
          setTarget(surveyor.id, surveyor.nama, bulkValue, period)
        )
      );
      toast.success(`Target berhasil diterapkan ke ${targetSurveyors.length} surveyor`);
      setDrafts({}); // Bersihkan draft karena data sudah di-update
      setBulkConfirmOpen(false);
    } catch (error) {
      toast.error(error.message || "Gagal menerapkan target massal");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-emerald-700">Periode {period}</p>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900 text-[10px] px-1.5 py-0">
              Aktif
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Target Surveyor</h1>
          <p className="text-sm text-slate-600">Tetapkan target jumlah laporan secara individual atau massal.</p>
        </div>
        <Button onClick={openBulkDialog} variant="outline" className="h-11 w-full sm:w-auto border-emerald-200 text-emerald-800 hover:bg-emerald-50">
          <Users className="mr-2 size-4" /> Atur Target Massal
        </Button>
      </header>

      {/* SEARCH BAR */}
      <div className="relative w-full sm:max-w-md">
        <IconSearch className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" />
        <Input 
          type="search" 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
          placeholder="Cari nama atau email surveyor..." 
          className="h-11 pl-9 w-full transition-shadow focus-visible:ring-emerald-600" 
        />
      </div>

      {/* GRID TARGET */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((surveyor) => {
          const completed = reports.filter((report) => report.userId === surveyor.id).length;
          const target = Number(valueFor(surveyor));
          const progress = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
          const isSaving = savingId === surveyor.id;

          return (
            <Card key={surveyor.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">{surveyor.nama}</CardTitle>
                  <CardDescription className="text-xs">{surveyor.email}</CardDescription>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <IconTarget className="size-5 text-emerald-800" />
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`target-${surveyor.id}`}>Target laporan</Label>
                    <Input 
                      id={`target-${surveyor.id}`} 
                      type="number" 
                      min="0" 
                      inputMode="numeric" 
                      value={valueFor(surveyor)} 
                      onChange={(event) => setDrafts((current) => ({ ...current, [surveyor.id]: event.target.value }))} 
                      placeholder="Belum ditetapkan" 
                      className="h-11" 
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => save(surveyor)} 
                    disabled={isSaving}
                    className="h-11 w-full bg-slate-900 hover:bg-slate-800 sm:w-auto"
                  >
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Simpan
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{completed} laporan selesai</span>
                    <span className="font-semibold text-slate-900">
                      {target > 0 ? `${progress}%` : "Tanpa target"}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <IconTarget className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">Surveyor tidak ditemukan</h3>
          <p className="mt-1 text-sm text-slate-600">Coba ubah kata kunci pencarian Anda.</p>
        </div>
      )}

      {/* ================= MODAL INPUT BULK ================= */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleBulkSavePrompt}>
            <DialogHeader>
              <DialogTitle>Atur Target Massal</DialogTitle>
              <DialogDescription>
                Terapkan nilai target yang sama untuk beberapa surveyor sekaligus.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="bulkTarget">Nilai Target</Label>
                <Input 
                  id="bulkTarget" 
                  type="number" 
                  min="0" 
                  inputMode="numeric" 
                  value={bulkValue} 
                  onChange={(e) => setBulkValue(e.target.value)} 
                  placeholder="Contoh: 50" 
                  className="h-11" 
                  required
                />
              </div>

              {search.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-900">Filter Pencarian Aktif</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Saat ini Anda mencari "{search}". Apakah target massal hanya diterapkan ke {filtered.length} surveyor yang muncul?
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="bulkFiltered" 
                      checked={bulkOnlyFiltered} 
                      onChange={(e) => setBulkOnlyFiltered(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <label htmlFor="bulkFiltered" className="text-xs font-medium text-amber-900 cursor-pointer">
                      Ya, hanya terapkan ke hasil filter
                    </label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">
                Lanjutkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL KONFIRMASI BULK ================= */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              Timpa Target yang Ada?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengatur target menjadi <strong>{bulkValue}</strong> untuk <strong>{bulkOnlyFiltered ? filtered.length : surveyors.filter(s => s.active).length} surveyor</strong>.
              <br /><br />
              Tindakan ini akan <strong>menimpa target</strong> yang sebelumnya sudah diatur secara individual pada periode ini. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); executeBulkSave(); }} 
              disabled={bulkBusy} 
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {bulkBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Ya, Terapkan Massal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}