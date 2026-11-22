import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { surveyQuestions } from "../lib/dummyData";
import { formatWibDateTime } from "../lib/format";
import { AlertTriangle as IconAlert, CheckCircle2 as IconCheck, Clock3 as IconClock, MapPin as IconMapPin, Pencil as IconEdit, ShieldCheck as IconShield, User as IconUser } from "lucide-react";

export default function ReportDetail() {
  const { id } = useParams();
  const { user, reports } = useStore();
  const report = reports.find((item) => item.id === id);
  if (!report || (user.role !== "master" && report.userId !== user.id)) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h1 className="font-semibold">Laporan tidak ditemukan</h1><Link to="/reports" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Kembali ke laporan</Link></div>;

  const metadata = report.evidence?.metadata;
  const risks = metadata?.riskFlags || [];
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Link to="/reports" className="text-sm font-semibold text-emerald-800 hover:underline">Kembali ke laporan</Link><h1 className="mt-2 text-2xl font-bold tracking-tight">{report.outlet?.outletName}</h1><p className="mt-1 text-sm text-slate-600">{report.outlet?.storeName}</p></div>
        <Link to={`/edit/${report.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><IconEdit className="h-4 w-4" />{user.role === "master" ? "Edit laporan" : "Ajukan perubahan"}</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {report.evidence?.dataUrl ? <img src={report.evidence.dataUrl} alt={`Bukti survei ${report.outlet?.outletName}`} className="max-h-[560px] w-full bg-slate-950 object-contain" /> : <div className="grid h-64 place-items-center bg-slate-100 text-slate-500">Foto tidak tersedia</div>}
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <EvidenceItem Icon={IconClock} label="Waktu foto" value={metadata?.capturedAtWib || "Tidak tersedia"} />
              <EvidenceItem Icon={IconMapPin} label="Koordinat" value={metadata ? `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}` : "Tidak tersedia"} />
              <EvidenceItem Icon={IconMapPin} label="Akurasi GPS" value={metadata ? `${Math.round(metadata.accuracy)} meter` : "Tidak tersedia"} />
              <EvidenceItem Icon={risks.length ? IconAlert : IconCheck} label="Indikator risiko" value={risks.length ? risks.join(", ") : "Tidak ada indikator client"} tone={risks.length ? "warning" : "success"} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Jawaban survei</h2><div className="mt-4 divide-y divide-slate-200">{surveyQuestions.map((question, index) => <div key={question} className="py-4 first:pt-0 last:pb-0"><p className="text-sm font-medium leading-relaxed text-slate-800"><span className="mr-2 text-emerald-800">{index + 1}.</span>{question}</p><p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{report.answers?.[index] || "Jawaban tidak tersedia"}</p></div>)}</div></section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Data outlet</h2><dl className="mt-4 space-y-3"><Detail label="Nama PIC" value={report.outlet?.picName} /><Detail label="Nama toko" value={report.outlet?.storeName} /><Detail label="Alamat" value={report.outlet?.address} /><Detail label="Nomor HP" value={report.outlet?.phone} /><Detail label="Email" value={report.outlet?.email} /></dl></section>
          <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><IconShield className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold">Kehadiran tim</h2></div><dl className="mt-4 space-y-3"><Detail label="Surveyor" value={report.presence?.surveyorName || report.userName} /><Detail label="Anggota di lokasi" value={report.presence?.teamMembers} /><Detail label="Waktu konfirmasi" value={report.presence?.confirmedAt ? formatWibDateTime(report.presence.confirmedAt) : "Tidak tersedia"} />{report.presence?.distanceToOutletMeters != null && <Detail label="Jarak ke outlet" value={`${Math.round(report.presence.distanceToOutletMeters)} meter`} />}</dl><p className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{report.presence?.statement || "Pernyataan kehadiran tidak tersedia."}</p></section>
          <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><IconUser className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold">Rekam laporan</h2></div><dl className="mt-4 space-y-3"><Detail label="Dibuat oleh" value={report.userName} /><Detail label="Waktu laporan" value={formatWibDateTime(report.createdAt)} />{report.updatedAt && <Detail label="Terakhir diubah" value={formatWibDateTime(report.updatedAt)} />}</dl></section>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }) { return <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "Tidak tersedia"}</dd></div>; }
function EvidenceItem({ Icon, label, value, tone }) { return <div className="flex items-start gap-2"><Icon className={`mt-0.5 h-4 w-4 flex-none ${tone === "warning" ? "text-amber-700" : "text-emerald-700"}`} /><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</p></div></div>; }
