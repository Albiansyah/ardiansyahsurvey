import { useEffect, useMemo, useState } from "react";
import { saveAs } from "file-saver";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { restRequestWithCount } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

const formats = [
  { value: "csv", label: "CSV", Icon: FileText },
  { value: "xlsx", label: "XLSX", Icon: FileSpreadsheet },
  { value: "json", label: "JSON", Icon: FileJson }
];

export default function ExportData() {
  const { user, surveyors } = useStore();
  const isMaster = user.role === "master";
  const [scope, setScope] = useState(isMaster ? "all" : user.id);
  const [timeMode, setTimeMode] = useState("period");
  const [period, setPeriod] = useState("this-month");
  const [singleDate, setSingleDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(`${todayKey().slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(todayKey());
  const [format, setFormat] = useState("csv");
  const [preview, setPreview] = useState({ loading: true, total: 0, error: "" });
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const dates = useMemo(() => resolveDates({ timeMode, period, singleDate, fromDate, toDate }), [fromDate, period, singleDate, timeMode, toDate]);
  const query = useMemo(() => buildQuery({ scope: isMaster ? scope : user.id, ...dates }), [dates, isMaster, scope, user.id]);

  useEffect(() => {
    if (!dates.valid) {
      setPreview({ loading: false, total: 0, error: dates.error });
      return undefined;
    }
    setPreview((current) => ({ ...current, loading: true, error: "" }));
    const timer = window.setTimeout(async () => {
      try {
        const result = await restRequestWithCount("survey_reports", { query, from: 0, to: 0 });
        setPreview({ loading: false, total: result.total, error: "" });
      } catch (error) {
        setPreview({ loading: false, total: 0, error: error.message || "Jumlah data belum dapat dihitung." });
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [dates.error, dates.valid, query]);

  const download = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      const rows = [];
      const pageSize = 500;
      let offset = 0;
      while (offset < preview.total) {
        const page = await restRequestWithCount("survey_reports", { query, from: offset, to: offset + pageSize - 1 });
        rows.push(...page.rows);
        offset += page.rows.length;
        setProgress(Math.min(100, Math.round((rows.length / preview.total) * 100)));
        if (page.rows.length === 0) break;
      }
      const flatRows = rows.map(flattenReport);
      const scopeName = scope === "all" ? "semua-surveyor" : slugify(surveyors.find((item) => item.id === scope)?.nama || user.nama);
      const baseName = `ardi-survey_${scopeName}_${dates.from}_${dates.to}`;
      await saveExport(flatRows, format, baseName);
      toast.success(`${flatRows.length.toLocaleString("id-ID")} survei berhasil diunduh.`);
    } catch (error) {
      toast.error(error.message || "Data belum dapat diunduh. Periksa koneksi lalu coba lagi.");
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header><p className="text-sm font-medium text-emerald-800">Pengelolaan data</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Unduh Data</h1><p className="mt-1 text-sm text-slate-600">Pilih cakupan, waktu WIB, dan format berkas.</p></header>

      <Card className="border-l-[3px] border-l-emerald-700">
        <CardHeader><CardTitle>Filter data</CardTitle><CardDescription>Pratinjau jumlah diperbarui sebelum berkas dibuat.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cakupan surveyor</Label>
              {isMaster ? <Select value={scope} onValueChange={setScope}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua surveyor</SelectItem>{surveyors.map((item) => <SelectItem key={item.id} value={item.id}>{item.nama}</SelectItem>)}</SelectContent></Select> : <div className="flex min-h-11 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700">Hanya data milik {user.nama}</div>}
            </div>
            <div className="space-y-1.5"><Label>Jenis waktu</Label><Select value={timeMode} onValueChange={setTimeMode}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="period">Periode</SelectItem><SelectItem value="single">Tanggal tunggal</SelectItem><SelectItem value="range">Rentang tanggal</SelectItem></SelectContent></Select></div>
          </div>

          {timeMode === "period" && <div className="space-y-1.5"><Label>Periode</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="this-week">Minggu ini</SelectItem><SelectItem value="this-month">Bulan ini</SelectItem><SelectItem value="last-month">Bulan lalu</SelectItem><SelectItem value="quarter">Kuartal ini</SelectItem><SelectItem value="year">Tahun ini</SelectItem></SelectContent></Select></div>}
          {timeMode === "single" && <div className="space-y-1.5"><Label htmlFor="single-date">Tanggal</Label><Input id="single-date" type="date" value={singleDate} onChange={(event) => setSingleDate(event.target.value)} className="h-11" /></div>}
          {timeMode === "range" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="from-date">Tanggal mulai</Label><Input id="from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-11" /></div><div className="space-y-1.5"><Label htmlFor="to-date">Tanggal akhir</Label><Input id="to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-11" /></div></div>}

          <fieldset><legend className="mb-2 text-sm font-medium text-slate-900">Format berkas</legend><div className="grid grid-cols-3 gap-2">{formats.map(({ value, label, Icon }) => <button key={value} type="button" onClick={() => setFormat(value)} aria-pressed={format === value} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border text-sm font-semibold ${format === value ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><Icon className="size-5" aria-hidden="true" />{label}</button>)}</div></fieldset>
        </CardContent>
      </Card>

      {preview.error && <Alert variant="destructive"><AlertTitle>Pratinjau belum tersedia</AlertTitle><AlertDescription>{preview.error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm text-slate-600">Pratinjau unduhan</p><p className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">{preview.loading ? "Menghitung" : `${preview.total.toLocaleString("id-ID")} survei`}</p><p className="mt-1 text-xs text-slate-600">{dates.from} sampai {dates.to}, zona waktu Asia/Jakarta (WIB)</p></div>
          <Button type="button" size="lg" onClick={download} disabled={preview.loading || preview.total === 0 || Boolean(preview.error) || downloading}>{downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}{downloading ? `Menyiapkan ${progress}%` : "Unduh Data"}</Button>
        </CardContent>
        {downloading && <Progress value={progress} aria-label={`Progres unduhan ${progress}%`} />}
      </Card>
    </div>
  );
}

function buildQuery({ scope, startIso, endExclusiveIso }) {
  const parts = [
    "select=id,surveyor_id,surveyor_name,outlet_id,recorded_at,answers,evidence_path,evidence_metadata,team_members,presence,created_at,outlet:outlets(outlet_name,address)",
    `recorded_at=gte.${encodeURIComponent(startIso)}`,
    `recorded_at=lt.${encodeURIComponent(endExclusiveIso)}`,
    "order=recorded_at.asc"
  ];
  if (scope !== "all") parts.splice(1, 0, `surveyor_id=eq.${encodeURIComponent(scope)}`);
  return parts.join("&");
}

function resolveDates({ timeMode, period, singleDate, fromDate, toDate }) {
  let from = fromDate;
  let to = toDate;
  const today = todayKey();
  if (timeMode === "single") from = to = singleDate;
  if (timeMode === "period") {
    const current = new Date(`${today}T00:00:00+07:00`);
    if (period === "this-week") { const day = (current.getUTCDay() + 6) % 7; const start = new Date(current); start.setUTCDate(start.getUTCDate() - day); from = dateKey(start); to = today; }
    if (period === "this-month") { from = `${today.slice(0, 7)}-01`; to = today; }
    if (period === "last-month") { const first = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`); first.setUTCDate(first.getUTCDate() - 1); to = dateKey(first); from = `${to.slice(0, 7)}-01`; }
    if (period === "quarter") { const [year, month] = today.split("-").map(Number); const firstMonth = Math.floor((month - 1) / 3) * 3 + 1; from = `${year}-${String(firstMonth).padStart(2, "0")}-01`; to = today; }
    if (period === "year") { from = `${today.slice(0, 4)}-01-01`; to = today; }
  }
  if (!from || !to) return { valid: false, error: "Lengkapi tanggal mulai dan tanggal akhir.", from: from || "-", to: to || "-" };
  if (from > to) return { valid: false, error: "Tanggal mulai tidak boleh setelah tanggal akhir.", from, to };
  const startIso = new Date(`${from}T00:00:00+07:00`).toISOString();
  const endDate = new Date(`${to}T00:00:00+07:00`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { valid: true, from, to, startIso, endExclusiveIso: endDate.toISOString() };
}

function flattenReport(row) {
  const result = {
    id: row.id,
    waktu_wib: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" }).format(new Date(row.recorded_at)),
    surveyor: row.surveyor_name,
    outlet: row.outlet?.outlet_name || "",
    alamat_outlet: row.outlet?.address || "",
    anggota_tim: row.team_members,
    latitude: row.evidence_metadata?.latitude ?? "",
    longitude: row.evidence_metadata?.longitude ?? "",
    akurasi_meter: row.evidence_metadata?.accuracy ?? "",
    referensi_foto: row.evidence_path || ""
  };
  row.answers?.forEach((answer, index) => { result[`jawaban_${index + 1}`] = answer; });
  return result;
}

async function saveExport(rows, format, baseName) {
  if (format === "json") return saveAs(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8" }), `${baseName}.json`);
  if (format === "csv") {
    const headers = Object.keys(rows[0] || {});
    const csv = [headers, ...rows.map((row) => headers.map((key) => row[key]))].map((line) => line.map(csvCell).join(",")).join("\r\n");
    return saveAs(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${baseName}.csv`);
  }
  const ExcelJSModule = await import("exceljs");
  const Workbook = ExcelJSModule.Workbook || ExcelJSModule.default?.Workbook;
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Survei");
  const headers = Object.keys(rows[0] || {});
  worksheet.columns = headers.map((key) => ({ header: key, key, width: Math.min(40, Math.max(12, key.length + 2)) }));
  rows.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${baseName}.xlsx`);
}

function csvCell(value) { const text = value == null ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "surveyor"; }
function dateKey(value) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function todayKey() { return dateKey(new Date()); }
