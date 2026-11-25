
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import {
  Building2,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  ShieldCheck,
  User,
  Loader2
} from "lucide-react";

import ImageUploader from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { formatWibDateTime, haversineMeters } from "@/lib/format";
import {
  enqueueReport,
  readDraft,
  removeDraft,
  saveDraft
} from "@/lib/offline";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

export default function SurveyForm() {
  const {
    user,
    reports,
    outlets = [],
    questions = [],
    addReport,
    updateReport,
    submitChangeRequest,
    loadingData
  } = useStore();

  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const existing = isEdit
    ? reports.find((report) => report.id === id)
    : null;

  const [now, setNow] = useState(new Date());
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [success, setSuccess] = useState(null);

  const draftKey = `survey:${user?.id}:${id || "new"}`;

  // ==========================================
  // VALIDASI FORM
  // ==========================================

  const surveySchema = useMemo(
    () =>
      z.object({
        outletId: z.string().min(1, "Pilih outlet yang disurvei."),

        answers: z
          .array(z.string().trim().min(1, "Jawaban wajib diisi."))
          .length(
            questions.length,
            "Semua pertanyaan wajib dijawab."
          ),

        evidence: z.any().refine(
          Boolean,
          "Foto dan lokasi wajib diambil."
        ),

        teamMembers: z
          .string()
          .trim()
          .min(1, "Isi anggota tim atau tulis Mandiri."),

        attendanceConfirmed: z
          .boolean()
          .refine(Boolean, "Konfirmasi kehadiran wajib dipilih."),

        changeReason: z.string().optional()
      }),
    [questions.length]
  );

  const emptyValues = useMemo(
    () => ({
      outletId: "",
      answers: questions.map(() => ""),
      evidence: null,
      teamMembers: "",
      attendanceConfirmed: false,
      changeReason: ""
    }),
    [questions.length]
  );

  const form = useForm({
    resolver: zodResolver(surveySchema),
    defaultValues: existing
      ? valuesFromReport(existing, questions.length)
      : emptyValues,
    mode: "onTouched"
  });

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue
  } = form;

  const values = useWatch({ control });

  // ==========================================
  // JAM REALTIME
  // ==========================================

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // ==========================================
  // MEMUAT DRAFT DAN DATA LAPORAN
  // ==========================================

  useEffect(() => {
    if (isEdit) {
      if (existing) {
        reset(valuesFromReport(existing, questions.length));
        setDraftReady(true);
      }

      return;
    }

    if (questions.length === 0) return;

    let active = true;

    readDraft(draftKey)
      .then((draft) => {
        if (!active) return;

        if (
          draft?.values?.answers?.length === questions.length
        ) {
          reset({
            ...emptyValues,
            ...draft.values
          });

          setDraftSavedAt(draft.savedAt);

          toast.info("Draf survei dipulihkan.");
        } else {
          reset(emptyValues);
        }

        setDraftReady(true);
      })
      .catch(() => {
        reset(emptyValues);
        setDraftReady(true);
      });

    return () => {
      active = false;
    };
  }, [
    draftKey,
    existing,
    reset,
    emptyValues,
    questions.length,
    isEdit
  ]);

  // ==========================================
  // AUTOSAVE DRAFT
  // ==========================================

  useEffect(() => {
    if (!draftReady || isEdit || success) {
      return undefined;
    }

    let timer;

    const subscription = form.watch((nextValues) => {
      window.clearTimeout(timer);

      timer = window.setTimeout(async () => {
        try {
          await saveDraft(draftKey, {
            values: nextValues
          });

          setDraftSavedAt(new Date().toISOString());
        } catch (error) {
          console.error("Gagal menyimpan draft:", error);
        }
      }, 1000);
    });

    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [draftKey, draftReady, form, isEdit, success]);

  // ==========================================
  // DATA OUTLET
  // ==========================================

  const selectedOutlet = useMemo(
    () =>
      outlets.find(
        (outlet) => outlet.id === values?.outletId
      ),
    [outlets, values?.outletId]
  );

  const responsibleUser =
    isEdit && existing
      ? {
          id: existing.userId,
          nama: existing.userName
        }
      : user;

  // ==========================================
  // HITUNG JARAK GPS KE OUTLET
  // ==========================================

  const distance = useMemo(() => {
    if (!selectedOutlet || !values?.evidence?.metadata) {
      return null;
    }

    const latitude = Number(
      values.evidence.metadata.latitude
    );

    const longitude = Number(
      values.evidence.metadata.longitude
    );

    const outletLatitude = Number(selectedOutlet.latitude);
    const outletLongitude = Number(selectedOutlet.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(outletLatitude) ||
      !Number.isFinite(outletLongitude) ||
      !outletLatitude ||
      !outletLongitude
    ) {
      return null;
    }

    return haversineMeters(
      latitude,
      longitude,
      outletLatitude,
      outletLongitude
    );
  }, [selectedOutlet, values?.evidence]);

  // ==========================================
  // PROGRESS FORM
  // ==========================================

  const completed =
    (values?.outletId ? 1 : 0) +
    (values?.answers?.filter((answer) => answer?.trim()).length || 0) +
    (values?.evidence ? 1 : 0) +
    (values?.teamMembers?.trim() ? 1 : 0) +
    (values?.attendanceConfirmed ? 1 : 0);

  const totalFields = questions.length + 4;

  const progress = totalFields
    ? Math.round((completed / totalFields) * 100)
    : 0;

  // ==========================================
  // KONDISI HALAMAN
  // ==========================================

  if (isEdit && !existing) {
    return <MissingReport />;
  }

  if (
    isEdit &&
    existing &&
    existing.userId !== user?.id &&
    user?.role !== "master"
  ) {
    return <MissingReport />;
  }

  if (success) {
    return (
      <SuccessState
        result={success}
        onAgain={() => {
          reset(emptyValues);
          setSuccess(null);
          setDraftSavedAt(null);
        }}
      />
    );
  }

  // ==========================================
  // SUBMIT SURVEI
  // ==========================================

  const submit = async (data) => {
    const capturedAt = data.evidence?.metadata?.capturedAt;

    if (capturedAt && !isEdit) {
      const diffMins =
        (new Date().getTime() -
          new Date(capturedAt).getTime()) /
        60000;

      if (diffMins > 60) {
        return toast.error(
          "Foto berumur lebih dari 60 menit. Ambil foto baru."
        );
      }
    }

    if (
      isEdit &&
      user.role !== "master" &&
      !data.changeReason?.trim()
    ) {
      setError("changeReason", {
        message: "Alasan perubahan wajib diisi."
      });

      return;
    }

    const payload = {
      outletId: data.outletId,

      answers: data.answers.map((answer) =>
        answer.trim()
      ),

      evidence: data.evidence,

      presence: {
        ...(existing?.presence || {}),

        surveyorId: responsibleUser.id,

        surveyorName: responsibleUser.nama,

        teamMembers: data.teamMembers.trim(),

        statement:
          "Saya menyatakan tim berada di lokasi outlet saat survei dilakukan.",

        confirmedAt:
          data.evidence?.metadata?.capturedAt ||
          existing?.presence?.confirmedAt ||
          new Date().toISOString(),

        distanceToOutletMeters: distance
      }
    };

    try {
      if (!navigator.onLine) {
        await enqueueReport(user.id, {
          ...payload,
          recordedAt: new Date().toISOString()
        });

        await removeDraft(draftKey);

        reset(emptyValues);

        setSuccess({ queued: true });

        toast.success("Survei tersimpan di perangkat.");

      } else if (isEdit && user.role !== "master") {
        await submitChangeRequest({
          type: "edit",
          reportId: id,
          proposedData: payload,
          reason: data.changeReason.trim()
        });

        toast.success("Pengajuan perubahan dikirim.");

        navigate("/history");

      } else if (isEdit) {
        await updateReport(id, payload);

        toast.success("Laporan diperbarui.");

        navigate(`/reports/${id}`);

      } else {
        const reportId = await addReport({
          recordedAt: new Date().toISOString(),
          ...payload
        });

        await removeDraft(draftKey);

        reset(emptyValues);

        setSuccess({
          queued: false,
          reportId
        });

        toast.success("Survei berhasil dikirim.");
      }

    } catch (error) {
      console.error("Submit survey error:", error);

      toast.error(
        error.message || "Survei gagal disimpan."
      );
    }
  };

  // ==========================================
  // TAMPILAN UTAMA
  // ==========================================

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-300">

      {/* HEADER */}

      <header>
        <p className="text-sm font-medium text-emerald-700">
          {isEdit ? "Perubahan data" : "Survei lapangan"}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {isEdit ? "Edit Laporan Survei" : "Survei Baru"}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Lengkapi data outlet, jawab {questions.length} pertanyaan,
          dan lampirkan bukti.
        </p>
      </header>

      {/* PROGRESS */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            Kelengkapan {completed} dari {totalFields}
          </span>

          <span className="font-semibold text-emerald-700">
            {progress}%
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">

          <span className="flex items-center gap-1">
            <Clock3 className="size-3" />
            {formatWibDateTime(now)}
          </span>

          {!isEdit && (
            <span>
              {draftSavedAt
                ? "Draf tersimpan otomatis"
                : "Draf akan tersimpan"}
            </span>
          )}

        </div>
      </div>

      {/* FORM */}

      <Form {...form}>
        <form
          onSubmit={handleSubmit(submit)}
          className="space-y-5"
          noValidate
        >

          {/* IDENTITAS OUTLET */}

          <CardSection
            icon={Building2}
            title="Identitas Outlet"
          >

            <FormField
              control={control}
              name="outletId"
              render={({ field }) => (
                <FormItem className="flex flex-col">

                  <OutletCombobox
                    outlets={outlets}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                    }}
                    loading={loadingData}
                  />

                  <FormMessage />

                </FormItem>
              )}
            />

            {selectedOutlet && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm border border-slate-100">

                <p className="font-medium text-slate-900">
                  {selectedOutlet.picName}
                </p>

                <p className="text-slate-500">
                  {selectedOutlet.address}
                </p>

              </div>
            )}

          </CardSection>

          {/* PERTANYAAN SURVEI */}

          <CardSection
            icon={Info}
            title="Kondisi Lapangan"
          >

            <div className="divide-y divide-slate-100">

              {questions.map((q, index) => (

                <div
                  key={q.id}
                  className={`flex flex-col py-4 ${
                    index === 0 ? "pt-0" : ""
                  } ${
                    index === questions.length - 1
                      ? "pb-0"
                      : ""
                  }`}
                >

                  <Label
                    className={`block text-sm font-medium leading-relaxed mb-3 ${
                      errors.answers?.[index]
                        ? "text-red-700"
                        : "text-slate-900"
                    }`}
                  >

                    <span className="text-emerald-700 mr-1.5">
                      {index + 1}.
                    </span>

                    {q.text}

                  </Label>

                  {/* JAWABAN TEXT */}

                  {q.type === "text" && (
                    <Controller
                      control={control}
                      name={`answers.${index}`}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          rows={2}
                          placeholder="Tulis jawaban singkat..."
                          className="w-full resize-y text-sm"
                          aria-invalid={Boolean(
                            errors.answers?.[index]
                          )}
                          autoCapitalize="sentences"
                        />
                      )}
                    />
                  )}

                  {/* JAWABAN BOOLEAN */}

                  {q.type === "boolean" && (
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          `answers.${index}`,
                          value,
                          { shouldValidate: true }
                        )
                      }
                      value={values?.answers?.[index] || ""}
                    >

                      <SelectTrigger
                        className="w-full sm:w-[320px] h-10 text-sm"
                        aria-invalid={Boolean(
                          errors.answers?.[index]
                        )}
                      >
                        <SelectValue placeholder="Pilih jawaban..." />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Ya">
                          Ya / Betul
                        </SelectItem>

                        <SelectItem value="Tidak">
                          Tidak / Salah
                        </SelectItem>
                      </SelectContent>

                    </Select>
                  )}

                  {/* JAWABAN PILIHAN */}

                  {q.type === "choice" && (
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          `answers.${index}`,
                          value,
                          { shouldValidate: true }
                        )
                      }
                      value={values?.answers?.[index] || ""}
                    >

                      <SelectTrigger
                        className="w-full sm:w-[320px] h-10 text-sm"
                        aria-invalid={Boolean(
                          errors.answers?.[index]
                        )}
                      >
                        <SelectValue placeholder="Pilih opsi..." />
                      </SelectTrigger>

                      <SelectContent>
                        {(q.options || []).map((option, i) => (
                          <SelectItem
                            key={i}
                            value={option}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>

                    </Select>
                  )}

                  {errors.answers?.[index] && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      {errors.answers[index]?.message}
                    </p>
                  )}

                </div>

              ))}

            </div>

          </CardSection>

          {/* BUKTI DAN KONFIRMASI */}

          <CardSection
            icon={MapPin}
            title="Bukti dan Konfirmasi"
          >

            <FormField
              control={control}
              name="evidence"
              render={({ field }) => (
                <FormItem>

                  <ImageUploader
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    disabled={isEdit && user?.role !== "master"}
                  />

                  {isEdit && user?.role !== "master" && (
                    <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                      <ShieldCheck className="size-3.5" /> 
                      Foto bukti asli bersifat permanen dan tidak dapat diganti saat pengajuan edit.
                    </p>
                  )}

                  <FormMessage />

                </FormItem>
              )}
            />

            {/* JARAK OUTLET */}

            {distance !== null && (
              <p
                className={`mt-3 rounded-md px-3 py-2 text-xs font-medium border ${
                  distance <= 250
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                Jarak titik foto ke outlet: {Math.round(distance)} meter.
              </p>
            )}

            {/* SURVEYOR DAN ANGGOTA TIM */}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">

              <div className="space-y-1.5">

                <Label className="text-xs text-slate-500">
                  Surveyor
                </Label>

                <div className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">

                  <User className="size-4 text-slate-400" />

                  {responsibleUser?.nama || "-"}

                </div>

              </div>

              <div className="space-y-1.5">

                <Label
                  className={`text-xs ${
                    errors.teamMembers
                      ? "text-red-700"
                      : "text-slate-500"
                  }`}
                >
                  Anggota Tim
                </Label>

                <Controller
                  control={control}
                  name="teamMembers"
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Nama anggota / Mandiri"
                      className="h-10 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      aria-invalid={Boolean(
                        errors.teamMembers
                      )}
                      autoComplete="off"
                      autoCapitalize="words"
                      disabled={isEdit && user?.role !== "master"}
                    />
                  )}
                />

                {errors.teamMembers && (
                  <p className="text-xs font-medium text-red-700">
                    {errors.teamMembers.message}
                  </p>
                )}
                {!errors.teamMembers && isEdit && user?.role !== "master" && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    Anggota tim tidak dapat diubah saat pengajuan edit.
                  </p>
                )}

              </div>

            </div>

            {/* KONFIRMASI KEHADIRAN */}

            <FormField
              control={control}
              name="attendanceConfirmed"
              render={({ field }) => (
                <FormItem className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">

                  <div className="flex items-start gap-3">

                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isEdit}
                    />

                    <div className="space-y-1">

                      <FormLabel className="text-sm font-medium text-slate-900 cursor-pointer">
                        Pernyataan Kehadiran
                      </FormLabel>

                      <FormDescription className="text-xs leading-relaxed text-slate-600">
                        Saya menyatakan tim berada di lokasi outlet saat survei dilakukan.
                      </FormDescription>

                      <FormMessage />

                    </div>

                  </div>

                </FormItem>
              )}
            />

          </CardSection>

          {/* ALASAN PERUBAHAN */}

          {isEdit && user.role !== "master" && (

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

              <Label
                className={`text-sm ${
                  errors.changeReason
                    ? "text-red-700"
                    : "text-amber-900"
                }`}
              >
                Alasan Perubahan
              </Label>

              <Controller
                control={control}
                name="changeReason"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    rows={2}
                    placeholder="Jelaskan bagian yang dikoreksi..."
                    className="mt-2 bg-white text-sm"
                    aria-invalid={Boolean(
                      errors.changeReason
                    )}
                    autoCapitalize="sentences"
                  />
                )}
              />

              {errors.changeReason && (
                <p className="mt-2 text-xs font-medium text-red-700">
                  {errors.changeReason.message}
                </p>
              )}

            </div>

          )}

          {/* TOMBOL FORM */}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-12 w-full sm:w-32" // Tambah w-full
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || loadingData}
              className="h-12 w-full sm:flex-1 bg-emerald-700 hover:bg-emerald-800 text-base" // Tambah w-full
            >

              {isSubmitting && (
                <Loader2 className="mr-2 size-5 animate-spin" />
              )}

              {isSubmitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Kirim Survei"}

            </Button>

          </div>

        </form>
      </Form>

    </div>
  );
}


function OutletCombobox({
  outlets = [],
  value,
  onChange,
  loading = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOutlet = outlets.find(
    (outlet) => String(outlet.id) === String(value)
  );

  const activeOutlets = outlets.filter((outlet) => {
    const status = String(outlet.status || "")
      .toLowerCase()
      .trim();

    return status !== "nonaktif";
  });

  // Pencarian berdasarkan beberapa kolom outlet
  const filteredOutlets = activeOutlets.filter((outlet) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    const searchableText = [
      outlet.outletName,
      outlet.picName,
      outlet.storeName,
      outlet.address,
      outlet.phone,
      outlet.email
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  const handleSelect = (outlet) => {
    onChange(String(outlet.id));
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative w-full">

      {/* TOMBOL DROPDOWN */}

      <button
        type="button"
        disabled={loading || activeOutlets.length === 0}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        className={`
          flex h-11 w-full items-center justify-between
          rounded-lg border border-slate-200 bg-white
          px-3 text-sm text-left shadow-sm
          transition-all duration-200
          hover:border-emerald-500
          focus:outline-none focus:ring-2
          focus:ring-emerald-500/20
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${open ? "border-emerald-500 ring-2 ring-emerald-500/20" : ""}
        `}
      >

        <span className={`truncate ${
          selectedOutlet
            ? "font-medium text-slate-900"
            : "text-slate-500"
        }`}>
          {loading
            ? "Memuat data outlet..."
            : selectedOutlet
              ? selectedOutlet.outletName
              : activeOutlets.length === 0
                ? "Belum ada outlet tersedia"
                : "Cari dan pilih outlet..."}
        </span>

        <svg
          className={`ml-2 size-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="m6 9 6 6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

      </button>

      {/* DROPDOWN CONTENT */}

      {open && (
        <div className="
          absolute left-0 top-full z-[100]
          mt-2 w-full min-w-0
          overflow-hidden rounded-xl
          border border-slate-200
          bg-white shadow-xl
          animate-in fade-in zoom-in-95 duration-150
        ">

          {/* SEARCH INPUT */}

          <div className="border-b border-slate-100 p-3">

            <div className="
              flex h-10 items-center gap-2
              rounded-lg border border-slate-200
              bg-slate-50 px-3
              focus-within:border-emerald-500
              focus-within:ring-2
              focus-within:ring-emerald-500/10
            ">

              <svg
                className="size-4 shrink-0 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama outlet, PIC, alamat..."
                className="
                  h-full w-full min-w-0
                  bg-transparent text-sm
                  text-slate-900 outline-none
                  placeholder:text-slate-400
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                  aria-label="Hapus pencarian"
                >
                  ✕
                </button>
              )}

            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {search
                  ? "Hasil pencarian"
                  : "Semua outlet aktif"}
              </span>

              <span>
                {filteredOutlets.length} outlet
              </span>
            </div>

          </div>

          {/* LIST OUTLET */}

          <div className="max-h-64 overflow-y-auto p-1.5">

            {filteredOutlets.length > 0 ? (

              filteredOutlets.map((outlet) => {

                const isSelected =
                  String(value) === String(outlet.id);

                return (
                  <button
                    key={outlet.id}
                    type="button"
                    onClick={() => handleSelect(outlet)}
                    className={`
                      flex w-full items-start gap-3
                      rounded-lg px-3 py-3
                      text-left transition-colors
                      hover:bg-emerald-50
                      ${
                        isSelected
                          ? "bg-emerald-50"
                          : "bg-white"
                      }
                    `}
                  >

                    {/* ICON OUTLET */}

                    <div className={`
                      flex size-9 shrink-0
                      items-center justify-center
                      rounded-lg
                      ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }
                    `}>
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 12h.01M15 12h.01" />
                      </svg>
                    </div>

                    {/* INFORMASI OUTLET */}

                    <div className="min-w-0 flex-1">

                      <p className={`
                        truncate text-sm font-semibold
                        ${
                          isSelected
                            ? "text-emerald-800"
                            : "text-slate-800"
                        }
                      `}>
                        {outlet.outletName}
                      </p>

                      {outlet.storeName && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {outlet.storeName}
                        </p>
                      )}

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">

                        {outlet.picName && (
                          <span>
                            PIC: {outlet.picName}
                          </span>
                        )}

                        {outlet.phone && (
                          <span>
                            {outlet.phone}
                          </span>
                        )}

                      </div>

                      {outlet.address && (
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {outlet.address}
                        </p>
                      )}

                    </div>

                    {/* CHECK SELECTED */}

                    {isSelected && (
                      <svg
                        className="mt-1 size-4 shrink-0 text-emerald-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          d="m5 12 4 4L19 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}

                  </button>
                );
              })

            ) : (

              <div className="px-4 py-8 text-center">

                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-slate-100">
                  <svg
                    className="size-5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>

                <p className="text-sm font-medium text-slate-700">
                  Outlet tidak ditemukan
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Coba gunakan nama outlet, PIC, atau alamat lainnya.
                </p>

              </div>

            )}

          </div>

          {/* FOOTER */}

          <div className="
            flex items-center justify-between
            border-t border-slate-100
            bg-slate-50 px-3 py-2
          ">

            <span className="text-[11px] text-slate-500">
              {activeOutlets.length} outlet tersedia
            </span>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearch("");
              }}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
            >
              Tutup
            </button>

          </div>

        </div>
      )}

      {!loading && activeOutlets.length === 0 && (
        <p className="mt-2 text-xs text-red-600">
          Data outlet belum tersedia atau seluruh outlet berstatus nonaktif.
        </p>
      )}

    </div>
  );
}

// ==========================================
// CARD SECTION
// ==========================================

function CardSection({
  icon: Icon,
  title,
  children
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">

      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">

        <Icon className="size-4 text-emerald-600" />

        <h2 className="text-sm font-semibold text-slate-900">
          {title}
        </h2>

      </div>

      {children}

    </section>
  );
}

// ==========================================
// KONVERSI DATA LAPORAN KE FORM
// ==========================================

function valuesFromReport(report, length) {
  return {
    outletId: report.outletId,

    answers:
      report.answers?.length === length
        ? report.answers
        : Array(length).fill(""),

    evidence: report.evidence || null,

    teamMembers: report.presence?.teamMembers || "",

    // Ubah menjadi true karena laporan ini sudah pernah disubmit
    attendanceConfirmed: true,

    changeReason: ""
  };
}

// ==========================================
// HALAMAN SUKSES
// ==========================================

function SuccessState({
  result,
  onAgain
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm mt-10">

      {result.queued ? (
        <ShieldCheck className="mx-auto size-12 text-amber-600" />
      ) : (
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
      )}

      <h1 className="mt-4 text-xl font-bold text-slate-950">
        {result.queued
          ? "Tersimpan di Perangkat"
          : "Survei Berhasil Dikirim"}
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        {result.queued
          ? "Data akan dikirim otomatis saat koneksi kembali."
          : "Laporan telah masuk ke database dan dapat dilihat di halaman Laporan."}
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">

        <Button
          asChild
          variant="outline"
          className="h-11"
        >
          <Link to="/reports">
            Lihat Laporan
          </Link>
        </Button>

        <Button
          type="button"
          onClick={onAgain}
          className="h-11"
        >
          Buat Survei Lagi
        </Button>

      </div>

    </div>
  );
}

// ==========================================
// LAPORAN TIDAK DITEMUKAN
// ==========================================

function MissingReport() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center mt-10">

      <h1 className="font-semibold text-slate-950">
        Laporan tidak ditemukan
      </h1>

      <p className="mt-1 text-sm text-slate-600">
        Data mungkin telah dihapus atau Anda tidak memiliki akses.
      </p>

      <Button
        asChild
        className="mt-4"
      >
        <Link to="/reports">
          Kembali ke Laporan
        </Link>
      </Button>

    </div>
  );
}
