import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { surveyQuestions } from "../lib/dummyData";
import { formatWibDateTime } from "../lib/format";
import {
  AlertTriangle as IconAlert,
  CheckCircle2 as IconCheck,
  Clock3 as IconClock,
  MapPin as IconMapPin,
  Pencil as IconEdit,
  ShieldCheck as IconShield,
  User as IconUser,
  ArrowLeft,
  ImageOff
} from "lucide-react";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ReportDetail() {
  const { id } = useParams();
  const { user, reports = [] } = useStore();
  
  const report = reports.find((item) => item.id === id);

  // State jika laporan tidak ditemukan atau bukan hak aksesnya
  if (!report || (user?.role !== "master" && report.userId !== user?.id)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-12">
        <IconAlert className="mx-auto size-10 text-amber-500" />
        <h1 className="text-lg font-semibold text-slate-950">Laporan tidak ditemukan</h1>
        <p className="text-sm text-slate-600">Laporan mungkin sudah dihapus atau Anda tidak memiliki akses.</p>
        <Button asChild className="mt-2">
          <Link to="/reports"><ArrowLeft className="mr-2 size-4" /> Kembali ke Laporan</Link>
        </Button>
      </div>
    );
  }

  const metadata = report.evidence?.metadata;
  const risks = metadata?.riskFlags || [];
  const hasRisks = risks.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Button variant="link" asChild className="p-0 h-auto text-emerald-700 hover:text-emerald-800 mb-1">
            <Link to="/reports"><ArrowLeft className="mr-2 size-4" /> Kembali ke laporan</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{report.outlet?.outletName || "Detail Laporan"}</h1>
          <p className="text-sm text-slate-600">{report.outlet?.storeName}</p>
        </div>
        <Button asChild className="h-11 w-full bg-slate-900 hover:bg-slate-800 sm:w-auto">
          <Link to={`/edit/${report.id}`}>
            <IconEdit className="mr-2 size-4" />
            {user.role === "master" ? "Edit laporan" : "Ajukan perubahan"}
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        
        {/* ================= KOLOM KIRI ================= */}
        <div className="space-y-6">
          
          {/* SECTION 1: EVIDENSI FOTO */}
          <Card className="overflow-hidden">
            {report.evidence?.dataUrl ? (
              <div className="bg-slate-950">
                <img 
                  src={report.evidence.dataUrl} 
                  alt={`Bukti survei ${report.outlet?.outletName}`} 
                  className="max-h-[560px] w-full object-contain" 
                />
              </div>
            ) : (
              <div className="grid h-64 place-items-center bg-slate-100 text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <ImageOff className="size-8" />
                  <p className="text-sm font-medium">Foto tidak tersedia</p>
                </div>
              </div>
            )}
            
            <CardContent className="p-0">
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <EvidenceItem 
                  Icon={IconClock} 
                  label="Waktu foto" 
                  value={metadata?.capturedAtWib || "Tidak tersedia"} 
                />
                <EvidenceItem 
                  Icon={IconMapPin} 
                  label="Koordinat" 
                  value={metadata ? `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}` : "Tidak tersedia"} 
                />
                <EvidenceItem 
                  Icon={IconMapPin} 
                  label="Akurasi GPS" 
                  value={metadata ? `${Math.round(metadata.accuracy)} meter` : "Tidak tersedia"} 
                />
                <div className="flex items-start gap-2">
                  {hasRisks ? <IconAlert className="mt-0.5 size-4 flex-none text-amber-600" /> : <IconCheck className="mt-0.5 size-4 flex-none text-emerald-600" />}
                  <div>
                    <p className="text-xs font-medium text-slate-500">Indikator risiko</p>
                    {hasRisks ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {risks.map((risk, idx) => (
                          <Badge key={idx} variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[10px] py-0">
                            {risk}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-slate-900">Tidak ada indikator</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: JAWABAN SURVEI */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Jawaban Survei</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="divide-y divide-slate-100">
                {surveyQuestions.map((question, index) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium leading-relaxed text-slate-800">
                      <span className="mr-2 text-emerald-700">{index + 1}.</span>
                      {question}
                    </p>
                    <div className="mt-2 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                      {report.answers?.[index] || "Jawaban tidak tersedia"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= KOLOM KANAN ================= */}
        <aside className="space-y-6">
          
          {/* DATA OUTLET */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Data Outlet</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Detail label="Nama PIC" value={report.outlet?.picName} />
                <Detail label="Nama Toko" value={report.outlet?.storeName} />
                <Detail label="Alamat" value={report.outlet?.address} />
                <Detail label="Nomor HP" value={report.outlet?.phone} />
                <Detail label="Email" value={report.outlet?.email} />
              </dl>
            </CardContent>
          </Card>

          {/* KEHADIRAN TIM */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <IconShield className="size-5 text-emerald-700" /> Kehadiran Tim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <Detail label="Surveyor" value={report.presence?.surveyorName || report.userName} />
                <Detail label="Anggota di lokasi" value={report.presence?.teamMembers} />
                <Detail 
                  label="Waktu konfirmasi" 
                  value={report.presence?.confirmedAt ? formatWibDateTime(report.presence.confirmedAt) : "Tidak tersedia"} 
                />
                {report.presence?.distanceToOutletMeters != null && (
                  <Detail 
                    label="Jarak ke outlet" 
                    value={`${Math.round(report.presence.distanceToOutletMeters)} meter`} 
                  />
                )}
              </dl>
              <Separator />
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs leading-relaxed text-slate-600 italic">
                  "{report.presence?.statement || "Pernyataan kehadiran tidak tersedia."}"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* REKAM LAPORAN */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <IconUser className="size-5 text-emerald-700" /> Rekam Laporan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Detail label="Dibuat oleh" value={report.userName} />
                <Detail label="Waktu laporan" value={formatWibDateTime(report.createdAt)} />
                {report.updatedAt && (
                  <Detail label="Terakhir diubah" value={formatWibDateTime(report.updatedAt)} />
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ===================== KOMPONEN PENDUKUNG =====================

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "Tidak tersedia"}</dd>
    </div>
  );
}

function EvidenceItem({ Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 flex-none text-emerald-700" aria-hidden="true" />
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}