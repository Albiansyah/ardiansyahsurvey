import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { z } from "zod";
import {
  AlertTriangle,
  Clock,
  DatabaseBackup,
  Download,
  FileWarning,
  Loader2,
  Trash2,
  Upload
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { rpc } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  exportedBy: z.object({ id: z.string(), name: z.string() }),
  counts: z.object({ reports: z.number(), outlets: z.number(), targets: z.number() }),
  checksum: z.string().min(16),
  data: z.object({
    reports: z.array(z.record(z.string(), z.unknown())),
    outlets: z.array(z.record(z.string(), z.unknown())),
    targets: z.array(z.record(z.string(), z.unknown()))
  })
});

const MAX_BACKUP_SIZE = 25 * 1024 * 1024;

export default function BackupRestore() {
  const { user, reports, outlets, targets, surveyors, loadData } = useStore();
  const fileRef = useRef(null);
  const storageKey = `ardi:last-backup:${user.id}`;
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem(storageKey));
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreMode, setRestoreMode] = useState("skip");
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteFrom, setDeleteFrom] = useState(`${todayKey().slice(0, 7)}-01`);
  const [deleteTo, setDeleteTo] = useState(todayKey());
  const [deleteSurveyor, setDeleteSurveyor] = useState("all");
  const [permanent, setPermanent] = useState(false);
  const [backupFirst, setBackupFirst] = useState(true);
  const [deleteCount, setDeleteCount] = useState({ loading: true, value: 0, error: "" });
  const [confirmation, setConfirmation] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const backupAge = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  const deleteRange = useMemo(() => toUtcRange(deleteFrom, deleteTo), [deleteFrom, deleteTo]);

  useEffect(() => {
    if (!deleteRange.valid) {
      setDeleteCount({ loading: false, value: 0, error: deleteRange.error });
      return undefined;
    }
    setDeleteCount((current) => ({ ...current, loading: true, error: "" }));
    const timer = window.setTimeout(async () => {
      try {
        const value = await rpc("preview_survey_delete", {
          p_from: deleteRange.startIso,
          p_to: deleteRange.endExclusiveIso,
          p_surveyor_id: deleteSurveyor === "all" ? null : deleteSurveyor,
          p_permanent: permanent
        });
        setDeleteCount({ loading: false, value: Number(value || 0), error: "" });
      } catch (error) {
        setDeleteCount({
          loading: false,
          value: 0,
          error: error.message || "Jumlah data belum dapat dihitung."
        });
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    deleteRange.endExclusiveIso,
    deleteRange.error,
    deleteRange.startIso,
    deleteRange.valid,
    deleteSurveyor,
    permanent
  ]);

  const createBackup = async () => {
    setBackupBusy(true);
    try {
      const backup = await buildBackup({ user, reports, outlets, targets });
      saveAs(
        new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" }),
        `ardi-survey_cadangan_${todayKey()}.json`
      );
      localStorage.setItem(storageKey, backup.exportedAt);
      setLastBackup(backup.exportedAt);
      toast.success("Cadangan JSON berhasil diunduh.");
      return backup;
    } catch (error) {
      toast.error(error.message || "Cadangan belum dapat dibuat.");
      throw error;
    } finally {
      setBackupBusy(false);
    }
  };

  const readBackup = async (event) => {
    const file = event.target.files?.[0];
    setRestorePreview(null);
    setRestoreFile(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_SIZE) return toast.error("Berkas melebihi batas 25 MB.");
    setRestoreProgress(10);
    try {
      const parsed = backupSchema.parse(JSON.parse(await file.text()));
      const checksum = await checksumFor(parsed.data);
      if (checksum !== parsed.checksum) {
        throw new Error("Checksum tidak cocok. Berkas mungkin berubah atau rusak.");
      }
      setRestoreProgress(45);
      const preview = await rpc("preview_restore_backup", { p_backup: parsed });
      setRestoreFile(parsed);
      setRestorePreview(preview);
      setRestoreProgress(100);
      toast.success("Uji coba pemulihan selesai. Tinjau hasil sebelum melanjutkan.");
    } catch (error) {
      setRestoreProgress(0);
      toast.error(
        error?.issues?.[0]?.message || error.message || "Berkas cadangan tidak valid."
      );
    } finally {
      event.target.value = "";
    }
  };

  const restore = async () => {
    setRestoreOpen(false);
    setRestoreProgress(55);
    try {
      const result = await rpc("restore_backup", {
        p_backup: restoreFile,
        p_mode: restoreMode
      });
      setRestoreProgress(85);
      await loadData();
      setRestoreProgress(100);
      toast.success(
        `${result.reports || 0} laporan, ${result.outlets || 0} outlet, dan ${result.targets || 0} target dipulihkan.`
      );
      setRestoreFile(null);
      setRestorePreview(null);
    } catch (error) {
      toast.error(error.message || "Pemulihan belum dapat diselesaikan.");
    }
  };

  const executeDelete = async () => {
    setDeleteOpen(false);
    setDeleteBusy(true);
    try {
      if (backupFirst) await createBackup();
      const affected = await rpc("delete_surveys_controlled", {
        p_from: deleteRange.startIso,
        p_to: deleteRange.endExclusiveIso,
        p_surveyor_id: deleteSurveyor === "all" ? null : deleteSurveyor,
        p_permanent: permanent
      });
      await loadData();
      setConfirmation("");
      setDeleteCount((current) => ({ ...current, value: 0 }));
      toast.success(
        permanent
          ? `${affected} survei dihapus permanen.`
          : `${affected} survei dipindahkan ke masa pemulihan 30 hari.`
      );
    } catch (error) {
      toast.error(error.message || "Data belum dapat dihapus.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const downloadRejected = () =>
    saveAs(
      new Blob(
        [
          JSON.stringify(
            { generatedAt: new Date().toISOString(), preview: restorePreview },
            null,
            2
          )
        ],
        { type: "application/json" }
      ),
      `ardi-survey_laporan-pemulihan_${todayKey()}.json`
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-emerald-700">Pengelolaan data</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Cadangan dan Pemulihan
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Buat cadangan manual, uji berkas sebelum pemulihan, dan kelola penghapusan terkontrol.
        </p>
      </header>

      {(backupAge == null || backupAge > 30) && (
        <Alert className="flex flex-row items-start gap-3 border-amber-300 bg-amber-50 text-amber-950 [&>svg]:static [&>svg~*]:pl-0 [&>svg+div]:translate-y-0">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <AlertTitle className="mb-0 leading-tight">Cadangan perlu diperbarui</AlertTitle>
            <AlertDescription className="text-sm text-amber-900/90">
              {backupAge == null
                ? "Belum ada riwayat cadangan pada perangkat ini."
                : `Cadangan terakhir dibuat ${backupAge} hari lalu.`}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col border-l-[3px] border-l-emerald-700">
          <CardHeader>
            <CardTitle>Unduh cadangan JSON</CardTitle>
            <CardDescription>
              Berisi survei, outlet, target, metadata, jumlah record, dan checksum.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>Kata sandi dan kredensial akun tidak disertakan.</p>
              <p className="mt-1">
                Foto hanya dicadangkan sebagai referensi lokasi penyimpanan, bukan isi berkas foto.
              </p>
            </div>
            {lastBackup && (
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                Cadangan terakhir: {formatWib(lastBackup)}
              </p>
            )}
            <div className="mt-auto">
              <Button
                type="button"
                onClick={createBackup}
                disabled={backupBusy}
                className="h-11 w-full"
              >
                {backupBusy ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {backupBusy ? "Menyiapkan Cadangan" : "Unduh Cadangan JSON"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Unggah dan uji cadangan</CardTitle>
            <CardDescription>
              Berkas divalidasi dan diuji tanpa menulis data terlebih dahulu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={readBackup}
              className="sr-only"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="h-11 w-full sm:w-auto"
            >
              <Upload aria-hidden="true" />
              Pilih Berkas JSON
            </Button>
            {restoreProgress > 0 && (
              <Progress
                value={restoreProgress}
                aria-label={`Progres pemeriksaan ${restoreProgress}%`}
              />
            )}
            {restorePreview && (
              <RestorePreview
                preview={restorePreview}
                mode={restoreMode}
                setMode={setRestoreMode}
                onRestore={() => setRestoreOpen(true)}
                onDownloadRejected={downloadRejected}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <Trash2 className="size-5 text-red-700" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <CardTitle>Hapus data terkontrol</CardTitle>
              <CardDescription>
                Pilih cakupan, tinjau jumlah, buat cadangan, lalu konfirmasi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Cakupan data</h3>
            
            {/* Perbaikan Grid: 3 kolom sejajar untuk Mulai, Akhir, dan Surveyor */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="delete-from">Tanggal mulai</Label>
                <Input
                  id="delete-from"
                  type="date"
                  value={deleteFrom}
                  onChange={(event) => setDeleteFrom(event.target.value)}
                  className="h-11 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delete-to">Tanggal akhir</Label>
                <Input
                  id="delete-to"
                  type="date"
                  value={deleteTo}
                  onChange={(event) => setDeleteTo(event.target.value)}
                  className="h-11 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delete-surveyor">Surveyor</Label>
                <Select value={deleteSurveyor} onValueChange={setDeleteSurveyor}>
                  <SelectTrigger id="delete-surveyor" className="h-11 w-full">
                    <SelectValue placeholder="Pilih surveyor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua surveyor</SelectItem>
                    {surveyors.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Opsi penghapusan</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3 transition-colors focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 hover:bg-slate-50">
                <Checkbox
                  checked={backupFirst}
                  onCheckedChange={(checked) => setBackupFirst(checked === true)}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-slate-900">
                    Unduh cadangan JSON dulu
                  </span>
                  <span className="block text-xs text-slate-600">
                    Aktif secara default sebelum penghapusan.
                  </span>
                </span>
              </label>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 transition-colors focus-within:ring-2 focus-within:ring-red-600 focus-within:ring-offset-2 hover:bg-red-100">
                <Checkbox
                  checked={permanent}
                  onCheckedChange={(checked) => setPermanent(checked === true)}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-red-900">
                    Hapus permanen
                  </span>
                  <span className="block text-xs text-red-800">
                    Hanya data yang sudah masuk masa pemulihan.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              Jumlah yang akan {permanent ? "dihapus permanen" : "dipindahkan ke masa pemulihan"}
            </p>
            {deleteCount.loading ? (
              <div className="flex items-center gap-2 pt-1 text-2xl font-semibold text-slate-500">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Menghitung
              </div>
            ) : (
              <p className="pt-1 text-3xl font-bold tabular-nums text-slate-950 sm:text-4xl">
                {deleteCount.value.toLocaleString("id-ID")}
              </p>
            )}
            {deleteCount.error && (
              <p className="pt-1 text-sm text-red-700" role="alert">
                {deleteCount.error}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirmation">
                Ketik{" "}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-900">
                  HAPUS
                </span>{" "}
                untuk melanjutkan
              </Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                className="h-11 w-full max-w-sm"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={
                deleteBusy ||
                deleteCount.loading ||
                deleteCount.value === 0 ||
                confirmation !== "HAPUS" ||
                Boolean(deleteCount.error)
              }
              className="h-11 w-full sm:w-auto"
            >
              {deleteBusy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {permanent ? "Hapus Permanen" : "Hapus Data Terpilih"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan data dari cadangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Data akan ditulis sesuai mode{" "}
              {restoreMode === "skip" ? "Lewati duplikat" : "Timpa data yang sama"}. Aktivitas ini
              dicatat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={restore}>Pulihkan Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {permanent ? "Konfirmasi penghapusan permanen" : "Hapus data terpilih?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {permanent
                ? `${deleteCount.value} survei akan dihapus permanen dan tidak dapat dipulihkan.`
                : `${deleteCount.value} survei akan disembunyikan dan dapat dipulihkan selama 30 hari.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={executeDelete}>
              {permanent ? "Ya, Hapus Permanen" : "Hapus Data Terpilih"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RestorePreview({ preview, mode, setMode, onRestore, onDownloadRejected }) {
  const rejected = Object.values(preview.rejected || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid grid-cols-3 gap-2">
        <PreviewNumber label="Data baru" value={sumValues(preview.new)} />
        <PreviewNumber label="Duplikat" value={sumValues(preview.duplicates)} />
        <PreviewNumber
          label="Ditolak"
          value={rejected}
          tone={rejected > 0 ? "danger" : "neutral"}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Mode pemulihan</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="h-11 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Lewati duplikat</SelectItem>
            <SelectItem value="overwrite">Timpa data yang sama</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {rejected > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={onDownloadRejected}
            className="h-11 bg-white"
          >
            <FileWarning aria-hidden="true" />
            Unduh Laporan Penolakan
          </Button>
        )}
        <Button type="button" onClick={onRestore} className="h-11">
          <DatabaseBackup aria-hidden="true" />
          Pulihkan Data
        </Button>
      </div>
    </div>
  );
}

function PreviewNumber({ label, value, tone = "neutral" }) {
  const valueClass = tone === "danger" ? "text-red-700" : "text-slate-950";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

function sumValues(value = {}) {
  return Object.values(value).reduce((sum, item) => sum + Number(item || 0), 0);
}

async function buildBackup({ user, reports, outlets, targets }) {
  const data = {
    outlets: outlets.map((item) => ({
      id: item.id,
      outlet_name: item.outletName,
      pic_name: item.picName,
      store_name: item.storeName,
      address: item.address,
      phone: item.phone,
      email: item.email,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      status: item.status,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    })),
    targets: targets.map((item) => ({
      id: item.id,
      surveyor_id: item.userId,
      period_start: item.periodStart,
      target_count: item.target,
      updated_at: item.updatedAt
    })),
    reports: reports.map((item) => ({
      id: item.id,
      surveyor_id: item.userId,
      surveyor_name: item.userName,
      outlet_id: item.outletId,
      recorded_at: item.recordedAt,
      answers: item.answers,
      evidence_path: item.evidencePath || item.evidence?.path,
      evidence_metadata: item.evidence?.metadata || {},
      team_members: item.presence?.teamMembers || "",
      presence: item.presence || {},
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }))
  };
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: { id: user.id, name: user.nama },
    counts: {
      reports: data.reports.length,
      outlets: data.outlets.length,
      targets: data.targets.length
    },
    checksum: await checksumFor(data),
    data
  };
}

async function checksumFor(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value))
  );
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function toUtcRange(from, to) {
  if (!from || !to) return { valid: false, error: "Lengkapi rentang tanggal." };
  if (from > to) return { valid: false, error: "Tanggal mulai tidak boleh setelah tanggal akhir." };
  const end = new Date(`${to}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    valid: true,
    startIso: new Date(`${from}T00:00:00+07:00`).toISOString(),
    endExclusiveIso: end.toISOString()
  };
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatWib(value) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}