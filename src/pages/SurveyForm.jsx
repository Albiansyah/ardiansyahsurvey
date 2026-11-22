import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Building2, CheckCircle2, Clock3, Info, MapPin, ShieldCheck, User } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { surveyQuestions } from "@/lib/dummyData";
import { formatWibDateTime, haversineMeters } from "@/lib/format";
import { enqueueReport, readDraft, removeDraft, saveDraft } from "@/lib/offline";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

const surveySchema = z.object({
  outletId: z.string().min(1, "Pilih outlet yang disurvei."),
  answers: z.array(z.string().trim().min(1, "Jawaban wajib diisi.")).length(9),
  evidence: z.any().refine(Boolean, "Foto dan lokasi wajib diambil."),
  teamMembers: z.string().trim().min(1, "Isi anggota tim atau tulis Mandiri."),
  attendanceConfirmed: z.boolean().refine(Boolean, "Konfirmasi kehadiran wajib dipilih."),
  changeReason: z.string().optional()
});

const emptyValues = {
  outletId: "",
  answers: surveyQuestions.map(() => ""),
  evidence: null,
  teamMembers: "",
  attendanceConfirmed: false,
  changeReason: ""
};

export default function SurveyForm() {
  const { user, reports, outlets, addReport, updateReport, submitChangeRequest } = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const existing = isEdit ? reports.find((report) => report.id === id) : null;
  const [now, setNow] = useState(new Date());
  const [draftReady, setDraftReady] = useState(isEdit);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [success, setSuccess] = useState(null);
  const draftKey = `survey:${user.id}:${id || "new"}`;

  const form = useForm({
    resolver: zodResolver(surveySchema),
    defaultValues: existing ? valuesFromReport(existing) : emptyValues,
    mode: "onTouched"
  });
  const { control, formState: { errors, isDirty, isSubmitting }, getValues, handleSubmit, register, reset, setError, setValue } = form;
  const values = useWatch({ control });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (existing) {
      reset(valuesFromReport(existing));
      setDraftReady(true);
      return;
    }
    let active = true;
    readDraft(draftKey).then((draft) => {
      if (!active) return;
      if (draft?.values) {
        reset({ ...emptyValues, ...draft.values });
        setDraftSavedAt(draft.savedAt);
        toast.info("Draf survei dari perangkat telah dipulihkan.");
      }
      setDraftReady(true);
    }).catch(() => setDraftReady(true));
    return () => { active = false; };
  }, [draftKey, existing, reset]);

  useEffect(() => {
    if (!draftReady || isEdit || success) return undefined;
    let timer;
    const subscription = form.watch((nextValues) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await saveDraft(draftKey, { values: nextValues });
        setDraftSavedAt(new Date().toISOString());
      }, 650);
    });
    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [draftKey, draftReady, form, isEdit, success]);

  useEffect(() => {
    if (!isDirty || isSubmitting || success) return undefined;
    const warning = "Survei belum dikirim. Tinggalkan halaman dan pertahankan draf di perangkat?";
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = warning;
    };
    const beforeLink = (event) => {
      const anchor = event.target.closest("a[href]");
      if (!anchor || anchor.target === "_blank") return;
      if (!window.confirm(warning)) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [isDirty, isSubmitting, success]);

  const selectedOutlet = useMemo(() => outlets.find((outlet) => outlet.id === values?.outletId), [outlets, values?.outletId]);
  const responsibleUser = isEdit && existing ? { id: existing.userId, nama: existing.userName } : user;
  const distance = useMemo(() => {
    if (!selectedOutlet || !values?.evidence?.metadata) return null;
    return haversineMeters(values.evidence.metadata.latitude, values.evidence.metadata.longitude, selectedOutlet.latitude, selectedOutlet.longitude);
  }, [selectedOutlet, values?.evidence]);
  const completed = (values?.outletId ? 1 : 0)
    + (values?.answers?.filter((answer) => answer?.trim()).length || 0)
    + (values?.evidence ? 1 : 0)
    + (values?.teamMembers?.trim() ? 1 : 0)
    + (values?.attendanceConfirmed ? 1 : 0);
  const progress = Math.round((completed / 13) * 100);

  if (isEdit && !existing) return <MissingReport />;
  if (isEdit && existing.userId !== user.id && user.role !== "master") return <MissingReport />;
  if (success) return <SuccessState result={success} onAgain={() => { reset(emptyValues); setSuccess(null); setDraftSavedAt(null); }} />;

  const submit = async (data) => {
    if (isEdit && user.role !== "master" && !data.changeReason?.trim()) {
      setError("changeReason", { message: "Alasan perubahan wajib diisi." });
      return;
    }
    if (!navigator.onLine && isEdit) {
      toast.error("Perubahan laporan memerlukan koneksi. Draf tetap tersimpan di perangkat.");
      return;
    }

    const payload = {
      outletId: data.outletId,
      answers: data.answers.map((answer) => answer.trim()),
      evidence: data.evidence,
      presence: {
        ...(existing?.presence || {}),
        surveyorId: responsibleUser.id,
        surveyorName: responsibleUser.nama,
        teamMembers: data.teamMembers.trim(),
        statement: "Saya menyatakan tim berada di lokasi outlet saat survei dilakukan.",
        confirmedAt: data.evidence?.metadata?.capturedAt || existing?.presence?.confirmedAt || new Date().toISOString(),
        distanceToOutletMeters: distance,
        lastSubmittedById: user.id,
        lastSubmittedByName: user.nama,
        lastSubmittedAt: new Date().toISOString()
      }
    };

    try {
      if (!navigator.onLine) {
        await enqueueReport(user.id, { ...payload, recordedAt: new Date().toISOString() });
        await removeDraft(draftKey);
        reset(emptyValues);
        setSuccess({ queued: true });
        toast.success("Survei tersimpan di perangkat dan akan dikirim saat koneksi kembali.");
      } else if (isEdit && user.role !== "master") {
        await submitChangeRequest({ type: "edit", reportId: id, proposedData: payload, reason: data.changeReason.trim() });
        toast.success("Pengajuan perubahan dikirim ke master.");
        navigate("/history");
      } else if (isEdit) {
        await updateReport(id, payload);
        toast.success("Laporan berhasil diperbarui.");
        navigate(`/reports/${id}`);
      } else {
        const reportId = await addReport({ recordedAt: new Date().toISOString(), ...payload });
        await removeDraft(draftKey);
        reset(emptyValues);
        setSuccess({ queued: false, reportId });
        toast.success("Survei berhasil dikirim.");
      }
    } catch (error) {
      toast.error(error.message || "Survei belum dapat disimpan. Periksa koneksi lalu coba lagi.");
    }
  };

  const cancel = () => {
    if (!isDirty || window.confirm("Survei belum dikirim. Tinggalkan halaman dan pertahankan draf di perangkat?")) navigate(-1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-sm font-medium text-emerald-800">{isEdit ? "Perubahan data" : "Survei lapangan"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{isEdit ? "Edit laporan survei" : "Survei baru"}</h1>
        <p className="mt-1 text-sm text-slate-600">Lengkapi outlet, sembilan jawaban, dan bukti kehadiran.</p>
      </header>

      <div className="rounded-xl border-l-[3px] border-emerald-700 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-800">Kelengkapan {completed} dari 13 bagian</span>
          <span className="tabular-nums text-slate-600">{progress}%</span>
        </div>
        <Progress value={progress} aria-label={`${progress}% survei telah dilengkapi`} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><Clock3 className="size-4" aria-hidden="true" /> {formatWibDateTime(now)}</span>
          {!isEdit && <span aria-live="polite">{draftSavedAt ? `Draf tersimpan pukul ${formatDraftTime(draftSavedAt)}` : "Draf akan tersimpan otomatis"}</span>}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          <FormSection icon={Building2} title="Identitas Outlet" description="Pilih outlet dari data yang dikelola master.">
            <FormField control={control} name="outletId" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama outlet</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="h-11 text-base md:text-sm"><SelectValue placeholder="Pilih outlet" /></SelectTrigger></FormControl>
                  <SelectContent>{outlets.filter((outlet) => outlet.status !== "nonaktif").map((outlet) => <SelectItem key={outlet.id} value={outlet.id}>{outlet.outletName}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {selectedOutlet ? (
              <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                <DataItem label="Nama PIC" value={selectedOutlet.picName} />
                <DataItem label="Nama toko" value={selectedOutlet.storeName} />
                <DataItem label="Nomor HP" value={selectedOutlet.phone} />
                <DataItem label="Email" value={selectedOutlet.email} />
                <div className="sm:col-span-2"><DataItem label="Alamat" value={selectedOutlet.address} /></div>
              </dl>
            ) : <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Info className="size-4" aria-hidden="true" /> Detail outlet muncul setelah dipilih.</p>}
          </FormSection>

          <FormSection icon={Info} title="Kondisi Lapangan" description="Jawab berdasarkan wawancara dan observasi di outlet.">
            <div className="space-y-6">
              {surveyQuestions.map((question, index) => (
                <div key={question} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
                  <span className="grid size-8 place-items-center rounded-md bg-slate-900 text-sm font-semibold text-white" aria-hidden="true">{index + 1}</span>
                  <div className="space-y-2">
                    <Label htmlFor={`answer-${index}`} className={errors.answers?.[index] ? "text-red-700" : "text-slate-900"}>{question}</Label>
                    <Textarea id={`answer-${index}`} rows={3} placeholder="Tulis jawaban hasil survei" className="min-h-24 resize-y text-base md:text-sm" aria-invalid={Boolean(errors.answers?.[index])} {...register(`answers.${index}`)} />
                    {errors.answers?.[index] && <p className="text-sm font-medium text-red-700" role="alert">{errors.answers[index].message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection icon={MapPin} title="Bukti dan Konfirmasi" description="Ambil foto dengan lokasi, lalu konfirmasi anggota tim.">
            <FormField control={control} name="evidence" render={({ field }) => (
              <FormItem>
                <FormLabel>Foto dan lokasi</FormLabel>
                <FormControl><ImageUploader value={field.value} onChange={(value) => field.onChange(value)} /></FormControl>
                <FormDescription>Foto dikompresi di perangkat sebelum diunggah.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            {distance !== null && <p className={`mt-3 rounded-md px-3 py-2 text-sm ${distance <= 250 ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-800"}`}>Jarak titik foto ke koordinat outlet: <strong className="tabular-nums">{Math.round(distance)} meter</strong>.</p>}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Surveyor penanggung jawab</Label>
                <div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700"><User className="size-4" aria-hidden="true" />{responsibleUser.nama}</div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teamMembers" className={errors.teamMembers ? "text-red-700" : undefined}>Anggota tim di lokasi</Label>
                <Input id="teamMembers" placeholder="Nama anggota atau tulis Mandiri" className="h-11 text-base md:text-sm" aria-invalid={Boolean(errors.teamMembers)} {...register("teamMembers")} />
                {errors.teamMembers && <p className="text-sm font-medium text-red-700" role="alert">{errors.teamMembers.message}</p>}
              </div>
            </div>

            <FormField control={control} name="attendanceConfirmed" render={({ field }) => (
              <FormItem className="mt-4 rounded-lg border border-slate-300 p-4">
                <div className="flex items-start gap-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1">
                    <FormLabel>Pernyataan kehadiran</FormLabel>
                    <FormDescription>Saya menyatakan tim berada di lokasi outlet saat survei dilakukan dan data dapat dipertanggungjawabkan.</FormDescription>
                    <FormMessage />
                  </div>
                </div>
              </FormItem>
            )} />
          </FormSection>

          {isEdit && user.role !== "master" && (
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-6">
              <Label htmlFor="changeReason" className={errors.changeReason ? "text-red-700" : "text-amber-950"}>Alasan pengajuan perubahan</Label>
              <Textarea id="changeReason" rows={3} placeholder="Jelaskan bagian yang perlu dikoreksi" className="mt-2 bg-white text-base md:text-sm" aria-invalid={Boolean(errors.changeReason)} {...register("changeReason")} />
              {errors.changeReason && <p className="mt-2 text-sm font-medium text-red-700" role="alert">{errors.changeReason.message}</p>}
              <p className="mt-2 text-xs text-amber-950">Perubahan berlaku setelah disetujui master.</p>
            </section>
          )}

          <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:bottom-4">
            <Button type="button" variant="outline" onClick={cancel} className="flex-1">Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-[2]">
              {isSubmitting ? "Menyimpan" : !navigator.onLine && !isEdit ? "Simpan di Perangkat" : isEdit && user.role !== "master" ? "Ajukan Perubahan" : isEdit ? "Simpan Perubahan" : "Kirim Survei"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function valuesFromReport(report) {
  return {
    outletId: report.outletId,
    answers: report.answers?.length === surveyQuestions.length ? report.answers : surveyQuestions.map(() => ""),
    evidence: report.evidence || null,
    teamMembers: report.presence?.teamMembers || "",
    attendanceConfirmed: false,
    changeReason: ""
  };
}

function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-l-[3px] border-emerald-700 pl-3">
        <Icon className="size-5 flex-none text-emerald-800" aria-hidden="true" />
        <div><h2 className="font-semibold text-slate-950">{title}</h2><p className="text-sm text-slate-600">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

function DataItem({ label, value }) {
  return <div><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-950">{value || "Belum tersedia"}</dd></div>;
}

function SuccessState({ result, onAgain }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border-l-[3px] border-emerald-700 bg-white p-6 text-center sm:p-8">
      {result.queued ? <ShieldCheck className="mx-auto size-10 text-amber-700" aria-hidden="true" /> : <CheckCircle2 className="mx-auto size-10 text-emerald-700" aria-hidden="true" />}
      <h1 className="mt-4 text-xl font-semibold text-slate-950">{result.queued ? "Survei tersimpan di perangkat" : "Survei berhasil dikirim"}</h1>
      <p className="mt-2 text-sm text-slate-600">{result.queued ? "Data akan dikirim secara berurutan saat koneksi kembali." : "Laporan telah tersimpan dan dapat dibuka dari halaman Laporan."}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline"><Link to="/reports">Lihat Laporan</Link></Button>
        <Button type="button" onClick={onAgain}>Buat Survei Lagi</Button>
      </div>
    </div>
  );
}

function MissingReport() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="font-semibold text-slate-950">Laporan tidak ditemukan</h1>
      <p className="mt-1 text-sm text-slate-600">Data mungkin telah dihapus atau tidak dapat diakses oleh akun ini.</p>
      <Button asChild className="mt-4"><Link to="/reports">Kembali ke Laporan</Link></Button>
    </div>
  );
}

function formatDraftTime(value) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
