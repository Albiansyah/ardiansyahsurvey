import { useEffect, useMemo, useState } from "react";
import { saveAs } from "file-saver";
import { AlertCircle, CalendarRange, Download, FileJson, FileSpreadsheet, FileText, Inbox, Loader2, RotateCcw, Users } from "lucide-react";
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
  { value: "csv", label: "CSV", hint: "Ringan, buka di Excel", Icon: FileText },
  { value: "xlsx", label: "XLSX", hint: "Lembar kerja Excel", Icon: FileSpreadsheet },
  { value: "json", label: "JSON", hint: "Untuk integrasi data", Icon: FileJson }
];

const timeModes = [
  { value: "period", label: "Periode" },
  { value: "single", label: "Tanggal tunggal" },
  { value: "range", label: "Rentang tanggal" }
];

const periods = [
  { value: "this-week", label: "Minggu ini" },
  { value: "this-month", label: "Bulan ini" },
  { value: "last-month", label: "Bulan lalu" },
  { value: "quarter", label: "Kuartal ini" },
  { value: "year", label: "Tahun ini" }
];

// Trigger select: lebar penuh agar rata dengan input lain, text-base di mobile supaya iOS tidak zoom saat fokus.
const triggerClass = "h-11 w-full text-base sm:text-sm";
const inputClass = "h-11 w-full text-base sm:text-sm";

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
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const dates = useMemo(() => resolveDates({ timeMode, period, singleDate, fromDate, toDate }), [fromDate, period, singleDate, timeMode, toDate]);
  const activeScope = isMaster ? scope : user.id;
  const query = useMemo(() => buildQuery({ scope: activeScope, ...dates }), [activeScope, dates]);
  const scopeLabel = activeScope === "all" ? "Semua surveyor" : surveyors.find((item) => item.id === activeScope)?.nama || user.nama;
  const activeFormat = formats.find((item) => item.value === format);

  useEffect(() => {
    if (!dates.valid) {
      setPreview({ loading: false, total: 0, error: dates.error });
      return undefined;
    }
    let cancelled = false;
    setPreview((current) => ({ ...current, loading: true, error: "" }));
    const timer = window.setTimeout(async () => {
      try {
        const result = await restRequestWithCount("survey_reports", { query, from: 0, to: 0 });
        if (!cancelled) setPreview({ loading: false, total: result.total, error: "" });
      } catch (error) {
        if (!cancelled) setPreview({ loading: false, total: 0, error: error.message || "Jumlah data belum dapat dihitung." });
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dates.error, dates.valid, query, reloadKey]);

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
      const table = buildTable(rows);
      const scopeName = activeScope === "all" ? "semua-surveyor" : slugify(scopeLabel);
      const baseName = `ardi-survey_${scopeName}_${dates.from}_${dates.to}`;
      await saveExport(table, format, baseName, { scopeLabel, from: dates.from, to: dates.to });
      toast.success(`${rows.length.toLocaleString("id-ID")} survei berhasil diunduh.`);
    } catch (error) {
      toast.error(error.message || "Data belum dapat diunduh. Periksa koneksi lalu coba lagi.");
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const isEmpty = !preview.loading && !preview.error && preview.total === 0;
  const canDownload = !preview.loading && !preview.error && preview.total > 0 && !downloading;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-4 sm:space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Pengelolaan data</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Unduh Data</h1>
        <p className="mt-1 text-sm text-slate-600">Pilih cakupan, waktu WIB, dan format berkas.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <Card className="border-l-[3px] border-l-emerald-700">
          <CardHeader>
            <CardTitle>Filter data</CardTitle>
            <CardDescription>Pratinjau jumlah diperbarui sebelum berkas dibuat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Cakupan surveyor</Label>
                {isMaster ? (
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua surveyor</SelectItem>
                      {surveyors.map((item) => <SelectItem key={item.id} value={item.id}>{item.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-11 w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700">
                    <Users className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Data milik {user.nama}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Jenis waktu</Label>
                <Select value={timeMode} onValueChange={setTimeMode}>
                  <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeModes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {timeMode === "period" && (
                <div className="space-y-1.5">
                  <Label>Periode</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periods.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {timeMode === "single" && (
                <div className="space-y-1.5">
                  <Label htmlFor="single-date">Tanggal</Label>
                  <Input id="single-date" type="date" value={singleDate} onChange={(event) => setSingleDate(event.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            {timeMode === "range" && (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:max-w-[calc(66.666%-0.33rem)]">
                <div className="space-y-1.5">
                  <Label htmlFor="from-date">Tanggal mulai</Label>
                  <Input id="from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to-date">Tanggal akhir</Label>
                  <Input id="to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass} />
                </div>
              </div>
            )}

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-900">Format berkas</legend>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {formats.map(({ value, label, hint, Icon }) => {
                  const active = format === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormat(value)}
                      aria-pressed={active}
                      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                        active ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      <span>{label}</span>
                      <span className="hidden text-center text-xs font-normal leading-tight text-slate-600 sm:block">{hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <aside aria-label="Ringkasan unduhan" className="space-y-3 lg:sticky lg:top-6">
          {preview.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertTitle>Pratinjau belum tersedia</AlertTitle>
              <AlertDescription>
                <p>{preview.error}</p>
                {dates.valid && (
                  <Button type="button" variant="outline" size="sm" className="mt-2 h-9" onClick={() => setReloadKey((key) => key + 1)}>
                    <RotateCcw aria-hidden="true" />
                    Hitung ulang
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-4 p-4 lg:p-5">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-600">Pratinjau unduhan</p>
                  {preview.loading ? (
                    <p className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-950 lg:text-2xl">
                      <Loader2 className="size-5 animate-spin text-emerald-700" aria-hidden="true" />
                      Menghitung
                    </p>
                  ) : isEmpty ? (
                    <p className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                      <Inbox className="size-5 shrink-0 text-slate-500" aria-hidden="true" />
                      Belum ada survei
                    </p>
                  ) : (
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{preview.total.toLocaleString("id-ID")} survei</p>
                  )}
                  <p className="mt-1 text-xs text-slate-600 lg:hidden">
                    {dates.valid ? `${formatDate(dates.from)} sampai ${formatDate(dates.to)}` : "Tanggal belum valid"}
                  </p>
                </div>

                <Button type="button" size="lg" className="h-12 w-full" onClick={download} disabled={!canDownload}>
                  {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                  {downloading ? `Menyiapkan ${progress}%` : "Unduh Data"}
                </Button>
              </div>

              <dl className="hidden space-y-3 border-t border-slate-200 pt-4 text-sm lg:block">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <div><dt className="text-xs text-slate-600">Cakupan</dt><dd className="font-medium text-slate-900">{scopeLabel}</dd></div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarRange className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate-600">Waktu, zona Asia/Jakarta (WIB)</dt>
                    <dd className="font-medium text-slate-900">{dates.valid ? `${formatDate(dates.from)} sampai ${formatDate(dates.to)}` : "Tanggal belum valid"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {activeFormat && <activeFormat.Icon className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />}
                  <div><dt className="text-xs text-slate-600">Format</dt><dd className="font-medium text-slate-900">{activeFormat?.label}</dd></div>
                </div>
              </dl>
            </CardContent>
            {downloading && <Progress value={progress} aria-label={`Progres unduhan ${progress}%`} />}
          </Card>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Query dan tanggal ---------- */

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

/* ---------- Susunan kolom hasil unduhan ---------- */

// Urutan kolom: identitas laporan dulu (kapan, siapa, di mana), lalu bukti lapangan, lalu jawaban, ID teknis paling akhir.
const baseColumns = [
  { key: "no", header: "No", type: "number", width: 6 },
  { key: "tanggal", header: "Tanggal" },
  { key: "jam", header: "Jam (WIB)" },
  { key: "surveyor", header: "Surveyor" },
  { key: "outlet", header: "Outlet" },
  { key: "alamat_outlet", header: "Alamat Outlet" },
  { key: "anggota_tim", header: "Anggota Tim" },
  { key: "latitude", header: "Latitude", type: "number", numFmt: "0.000000" },
  { key: "longitude", header: "Longitude", type: "number", numFmt: "0.000000" },
  { key: "akurasi_meter", header: "Akurasi GPS (m)", type: "number", numFmt: "0.0" },
  { key: "referensi_foto", header: "Referensi Foto" }
];

function buildTable(rows) {
  const answerCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row.answers) ? row.answers.length : 0), 0);
  const answerColumns = Array.from({ length: answerCount }, (_, index) => ({ key: `jawaban_${index + 1}`, header: `Jawaban ${index + 1}` }));
  const columns = [...baseColumns, ...answerColumns, { key: "id", header: "ID Laporan" }];

  const records = rows.map((row, index) => {
    const { tanggal, jam } = splitWib(row.recorded_at);
    const record = {
      no: index + 1,
      tanggal,
      jam,
      surveyor: row.surveyor_name || "",
      outlet: row.outlet?.outlet_name || "",
      alamat_outlet: row.outlet?.address || "",
      anggota_tim: formatTeam(row.team_members),
      latitude: toNumber(row.evidence_metadata?.latitude),
      longitude: toNumber(row.evidence_metadata?.longitude),
      akurasi_meter: toNumber(row.evidence_metadata?.accuracy),
      referensi_foto: row.evidence_path || "",
      id: row.id
    };
    answerColumns.forEach((column, answerIndex) => { record[column.key] = formatAnswer(row.answers?.[answerIndex]); });
    return record;
  });

  // Lebar kolom mengikuti isi sebenarnya, dibatasi supaya kolom panjang tidak melebar tanpa batas.
  columns.forEach((column) => {
    if (column.width) return;
    const longest = records.reduce((max, record) => Math.max(max, String(record[column.key] ?? "").length), column.header.length);
    column.width = Math.min(48, Math.max(10, longest + 2));
  });

  // JSON dipakai mesin: kunci snake_case, jawaban dan tim tetap berupa array.
  const json = rows.map((row, index) => {
    const { tanggal, jam } = splitWib(row.recorded_at);
    return {
      no: index + 1,
      id: row.id,
      tanggal,
      jam_wib: jam,
      surveyor: row.surveyor_name || "",
      outlet: row.outlet?.outlet_name || "",
      alamat_outlet: row.outlet?.address || "",
      anggota_tim: Array.isArray(row.team_members) ? row.team_members : row.team_members ? [row.team_members] : [],
      latitude: toNumber(row.evidence_metadata?.latitude),
      longitude: toNumber(row.evidence_metadata?.longitude),
      akurasi_meter: toNumber(row.evidence_metadata?.accuracy),
      referensi_foto: row.evidence_path || "",
      jawaban: Array.isArray(row.answers) ? row.answers : []
    };
  });

  return { columns, records, json };
}

function splitWib(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { tanggal: "", jam: "" };
  return {
    tanggal: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
    jam: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date)
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function formatTeam(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : item?.nama || item?.name || JSON.stringify(item))).filter(Boolean).join(", ");
  }
  return JSON.stringify(value);
}

function formatAnswer(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" && item !== null ? JSON.stringify(item) : item)).join("; ");
  return JSON.stringify(value);
}

/* ---------- Penyimpanan berkas ---------- */

async function saveExport(table, format, baseName, meta) {
  if (format === "json") {
    return saveAs(new Blob([JSON.stringify(table.json, null, 2)], { type: "application/json;charset=utf-8" }), `${baseName}.json`);
  }

  if (format === "csv") {
    const headerLine = table.columns.map((column) => csvCell(column.header)).join(",");
    const lines = table.records.map((record) => table.columns.map((column) => csvCell(record[column.key])).join(","));
    const csv = [headerLine, ...lines].join("\r\n");
    return saveAs(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${baseName}.csv`);
  }

  const ExcelJSModule = await import("exceljs");
  const Workbook = ExcelJSModule.Workbook || ExcelJSModule.default?.Workbook;
  const workbook = new Workbook();
  workbook.creator = "Ardi Survey";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Survei", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = table.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
    style: {
      alignment: { vertical: "top", horizontal: column.type === "number" ? "right" : "left", wrapText: true },
      ...(column.numFmt ? { numFmt: column.numFmt } : {})
    }
  }));
  table.records.forEach((record) => sheet.addRow(record));

  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => { cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } }; });
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.columns.length } };

  const info = workbook.addWorksheet("Ringkasan");
  info.columns = [{ width: 22 }, { width: 44 }];
  [
    ["Cakupan surveyor", meta.scopeLabel],
    ["Periode data", `${meta.from} sampai ${meta.to}`],
    ["Zona waktu", "Asia/Jakarta (WIB)"],
    ["Jumlah survei", table.records.length],
    ["Diunduh pada", `${splitWib(new Date()).tanggal} ${splitWib(new Date()).jam} WIB`]
  ].forEach((line) => info.addRow(line));
  info.getColumn(1).font = { bold: true };
  info.getColumn(2).alignment = { horizontal: "left" };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${baseName}.xlsx`);
}

// Teks yang diawali = + @ - dianggap rumus oleh Excel, jadi diberi tanda petik di depan. Angka asli tidak disentuh.
function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function slugify(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "surveyor"; }
function dateKey(value) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function todayKey() { return dateKey(new Date()); }
function formatDate(key) {
  const date = new Date(`${key}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" }).format(date);
}