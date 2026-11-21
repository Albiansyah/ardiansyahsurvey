import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { surveyQuestions } from "../lib/dummyData";
import { formatWibDateTime, haversineMeters } from "../lib/format";
import ImageUploader from "../components/ImageUploader";
import { IconBuilding, IconClock, IconInfo, IconMapPin, IconShield, IconUser } from "../components/Icons";
import { toast } from "../lib/toast";

const inputClass = "w-full min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

export default function SurveyForm() {
  const { user, reports, outlets, addReport, updateReport, submitChangeRequest } = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const existing = isEdit ? reports.find((report) => report.id === id) : null;
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    outletId: "",
    answers: surveyQuestions.map(() => ""),
    evidence: null,
    teamMembers: "",
    attendanceConfirmed: false,
    changeReason: ""
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        outletId: existing.outletId,
        answers: existing.answers?.length === surveyQuestions.length ? existing.answers : surveyQuestions.map(() => ""),
        evidence: existing.evidence || null,
        teamMembers: existing.presence?.teamMembers || "",
        attendanceConfirmed: false,
        changeReason: ""
      });
    }
  }, [existing?.id]);

  const selectedOutlet = useMemo(() => outlets.find((outlet) => outlet.id === form.outletId), [outlets, form.outletId]);
  const responsibleUser = isEdit && existing
    ? { id: existing.userId, nama: existing.userName }
    : user;
  const distance = useMemo(() => {
    if (!selectedOutlet || !form.evidence?.metadata) return null;
    return haversineMeters(
      form.evidence.metadata.latitude,
      form.evidence.metadata.longitude,
      selectedOutlet.latitude,
      selectedOutlet.longitude
    );
  }, [selectedOutlet, form.evidence]);

  if (!isEdit && user.role === "master") return <Navigate to="/" replace />;
  if (isEdit && !existing) return <MissingReport />;
  if (isEdit && existing.userId !== user.id && user.role !== "master") return <MissingReport />;

  const updateAnswer = (index, value) => {
    const answers = [...form.answers];
    answers[index] = value;
    setForm((current) => ({ ...current, answers }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedOutlet) return toast.error("Pilih outlet terlebih dahulu");
    if (form.answers.some((answer) => !answer.trim())) return toast.error("Semua pertanyaan survey wajib dijawab");
    if (!form.evidence) return toast.error("Foto realtime dengan GPS wajib diisi");
    if (!form.teamMembers.trim()) return toast.error("Isi anggota tim yang berada di lokasi");
    if (!form.attendanceConfirmed) return toast.error("Konfirmasi kehadiran di lokasi wajib dicentang");
    if (isEdit && user.role !== "master" && !form.changeReason.trim()) return toast.error("Alasan perubahan wajib diisi");

    setSubmitting(true);
    const payload = {
      outletId: selectedOutlet.id,
      outlet: { ...selectedOutlet },
      answers: form.answers.map((answer) => answer.trim()),
      evidence: form.evidence,
      presence: {
        ...(existing?.presence || {}),
        surveyorId: responsibleUser.id,
        surveyorName: responsibleUser.nama,
        teamMembers: form.teamMembers.trim(),
        statement: "Saya menyatakan tim berada di lokasi outlet saat survey dilakukan.",
        confirmedAt: form.evidence?.metadata?.capturedAt || existing?.presence?.confirmedAt || new Date().toISOString(),
        distanceToOutletMeters: distance,
        lastSubmittedById: user.id,
        lastSubmittedByName: user.nama,
        lastSubmittedAt: new Date().toISOString()
      }
    };

    try {
      if (isEdit && user.role !== "master") {
        await submitChangeRequest({ type: "edit", reportId: id, proposedData: payload, reason: form.changeReason.trim() });
        toast.success("Pengajuan perubahan dikirim ke master");
        navigate("/history");
      } else if (isEdit) {
        await updateReport(id, payload);
        toast.success("Laporan berhasil diperbarui");
        navigate(`/reports/${id}`);
      } else {
        const reportId = await addReport({
          userId: user.id,
          userName: user.nama,
          recordedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          ...payload
        });
        toast.success("Survey berhasil disimpan");
        navigate(`/reports/${reportId}`);
      }
    } catch (error) {
      toast.error(error.message || "Laporan gagal disimpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">{isEdit ? "Perubahan data" : "Survey lapangan"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{isEdit ? "Edit laporan survey" : "Laporan baru"}</h1>
          <p className="mt-1 text-sm text-slate-600">Lengkapi outlet, seluruh jawaban, dan bukti kehadiran.</p>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" aria-live="polite">
          <IconClock className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
          <div><p className="text-xs font-medium text-slate-500">Waktu sistem, tidak dapat diubah</p><p className="font-semibold">{formatWibDateTime(now)}</p></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="outlet-heading">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-100 text-emerald-800"><IconBuilding className="h-5 w-5" /></span>
            <div><h2 id="outlet-heading" className="font-semibold text-slate-950">Outlet pelanggan</h2><p className="text-sm text-slate-600">Data dikelola oleh master.</p></div>
          </div>
          <label htmlFor="outlet" className="mb-1.5 block text-sm font-medium text-slate-800">Nama outlet <span className="text-red-700">*</span></label>
          <select id="outlet" required value={form.outletId} onChange={(event) => setForm((current) => ({ ...current, outletId: event.target.value }))} className={inputClass}>
            <option value="">Pilih outlet</option>
            {outlets.filter((outlet) => outlet.status !== "nonaktif").map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.outletName}</option>)}
          </select>
          {selectedOutlet ? (
            <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <DataItem label="Nama PIC" value={selectedOutlet.picName} />
              <DataItem label="Nama toko" value={selectedOutlet.storeName} />
              <DataItem label="Nomor HP" value={selectedOutlet.phone} />
              <DataItem label="Email" value={selectedOutlet.email} />
              <div className="sm:col-span-2"><DataItem label="Alamat" value={selectedOutlet.address} /></div>
              {selectedOutlet.isDemo && <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Data ini adalah placeholder demo, bukan data pelanggan nyata.</div>}
            </dl>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><IconInfo className="h-4 w-4" /> Detail pelanggan muncul setelah outlet dipilih.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="survey-heading">
          <div className="mb-5"><h2 id="survey-heading" className="font-semibold text-slate-950">Pertanyaan survey</h2><p className="mt-1 text-sm text-slate-600">Semua kolom wajib diisi berdasarkan hasil wawancara dan observasi.</p></div>
          <div className="space-y-5">
            {surveyQuestions.map((question, index) => (
              <div key={question} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white" aria-hidden="true">{index + 1}</span>
                <div>
                  <label htmlFor={`answer-${index}`} className="block text-sm font-medium leading-relaxed text-slate-900">{question} <span className="text-red-700">*</span></label>
                  <textarea id={`answer-${index}`} required rows={3} value={form.answers[index]} onChange={(event) => updateAnswer(index, event.target.value)} placeholder="Tulis jawaban hasil survey" className={`${inputClass} mt-2 min-h-24 resize-y`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="evidence-heading">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-100 text-emerald-800"><IconMapPin className="h-5 w-5" /></span>
            <div><h2 id="evidence-heading" className="font-semibold text-slate-950">Foto dan geotag realtime</h2><p className="text-sm text-slate-600">Bukti diambil langsung dari kamera dengan izin GPS.</p></div>
          </div>
          <ImageUploader value={form.evidence} onChange={(evidence) => setForm((current) => ({ ...current, evidence }))} />
          {distance !== null && <p className={`mt-3 rounded-md px-3 py-2 text-sm ${distance <= 250 ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>Jarak titik foto ke koordinat outlet: <strong>{Math.round(distance)} meter</strong>.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="presence-heading">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-100 text-amber-900"><IconShield className="h-5 w-5" /></span>
            <div><h2 id="presence-heading" className="font-semibold text-slate-950">Pernyataan kehadiran tim</h2><p className="text-sm text-slate-600">Dicatat bersama identitas akun, waktu, foto, dan lokasi.</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-slate-800">Surveyor penanggung jawab</label><div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700"><IconUser className="h-4 w-4" />{responsibleUser.nama}</div></div>
            <div><label htmlFor="teamMembers" className="mb-1.5 block text-sm font-medium text-slate-800">Anggota tim di lokasi <span className="text-red-700">*</span></label><input id="teamMembers" required value={form.teamMembers} onChange={(event) => setForm((current) => ({ ...current, teamMembers: event.target.value }))} placeholder="Nama anggota atau tulis Mandiri" className={inputClass} /></div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-4 hover:bg-slate-50">
            <input type="checkbox" required checked={form.attendanceConfirmed} onChange={(event) => setForm((current) => ({ ...current, attendanceConfirmed: event.target.checked }))} className="mt-0.5 h-5 w-5 rounded border-slate-400 accent-emerald-700" />
            <span className="text-sm leading-relaxed text-slate-800"><strong>Pernyataan wajib.</strong> Saya menyatakan tim berada di lokasi outlet saat survey dilakukan dan data yang dikirim dapat dipertanggungjawabkan.</span>
          </label>
        </section>

        {isEdit && user.role !== "master" && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-6">
            <label htmlFor="changeReason" className="block text-sm font-semibold text-amber-950">Alasan pengajuan perubahan <span className="text-red-700">*</span></label>
            <textarea id="changeReason" required rows={3} value={form.changeReason} onChange={(event) => setForm((current) => ({ ...current, changeReason: event.target.value }))} placeholder="Jelaskan bagian yang perlu dikoreksi" className={`${inputClass} mt-2`} />
            <p className="mt-2 text-xs text-amber-900">Perubahan baru berlaku setelah disetujui master.</p>
          </section>
        )}

        <div className="sticky bottom-20 z-10 flex gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm md:bottom-4">
          <button type="button" onClick={() => navigate(-1)} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={submitting} className="min-h-11 flex-[2] rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Menyimpan..." : isEdit && user.role !== "master" ? "Ajukan perubahan" : isEdit ? "Simpan perubahan" : "Simpan laporan"}</button>
        </div>
      </form>
    </div>
  );
}

function DataItem({ label, value }) {
  return <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "Belum tersedia"}</dd></div>;
}

function MissingReport() {
  return <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center"><h1 className="font-semibold">Laporan tidak ditemukan</h1><p className="mt-1 text-sm text-slate-600">Data mungkin telah dihapus atau tidak dapat diakses oleh akun ini.</p><Link to="/reports" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Kembali ke laporan</Link></div>;
}
