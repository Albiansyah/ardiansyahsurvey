import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Clock3, FileText, History, LayoutDashboard, Plus, Radio, Store, Target, Users } from "lucide-react";
import { EmptyState } from "@/components/PageState";
import ReportCard from "@/components/ReportCard";

// Shadcn UI
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getWibPeriod } from "@/lib/format";
import { getQueueCount } from "@/lib/offline";
import { subscribeToReportChanges } from "@/lib/supabase";
import { useStore } from "@/lib/store";

const chartConfig = { total: { label: "Jumlah survei", color: "hsl(var(--chart-1))" } };

export default function Dashboard() {
  const { user, reports, outlets, targets, surveyors, changeRequests, loadData } = useStore();
  
  if (!user) return null;

  return user.role === "master" ? (
    <MasterDashboard reports={reports} outlets={outlets} targets={targets} surveyors={surveyors} requests={changeRequests} loadData={loadData} />
  ) : (
    <SurveyorDashboard user={user} reports={reports} targets={targets} requests={changeRequests} />
  );
}

// ===================== DASHBOARD SURVEYOR =====================
function SurveyorDashboard({ user, reports, targets, requests }) {
  const [queueCount, setQueueCount] = useState(0);
  
  const mine = useMemo(() => reports.filter((report) => report.userId === user.id), [reports, user.id]);
  const currentMonth = currentMonthKey();
  const monthReports = useMemo(() => mine.filter((report) => dateKeyWib(report.recordedAt || report.createdAt).startsWith(currentMonth)), [mine, currentMonth]);
  const targetRecord = targets.find((target) => target.userId === user.id && target.periodStart?.startsWith(currentMonth));
  const target = targetRecord?.target;
  const progress = Number.isFinite(target) && target > 0 ? Math.min(100, Math.round((monthReports.length / target) * 100)) : 0;
  const pending = requests.filter((request) => request.requesterId === user.id && request.status === "pending").length;

  useEffect(() => {
    const refresh = () => getQueueCount(user.id).then(setQueueCount);
    refresh();
    window.addEventListener("ardi:queue-changed", refresh);
    return () => window.removeEventListener("ardi:queue-changed", refresh);
  }, [user.id]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-emerald-700">{getWibPeriod()}</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Halo, {user.nama}</h1>
        <p className="text-sm text-slate-600">Pantau target pribadi dan lanjutkan survei outlet berikutnya.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" aria-label="Ringkasan target">
        <Card className="border-l-[3px] border-l-emerald-700 bg-slate-950 text-white">
          <CardHeader className="flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardDescription className="text-slate-300">Target survei bulan ini</CardDescription>
              <CardTitle className="mt-2 text-3xl text-white tabular-nums">
                {target == null ? "Belum ditetapkan" : `${monthReports.length} dari ${target}`}
              </CardTitle>
            </div>
            <Target className="size-6 text-emerald-300" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            {target == null ? (
              <p className="text-sm text-slate-400">Master belum menetapkan target untuk periode ini.</p>
            ) : (
              <>
                <Progress value={progress} className="h-2 bg-slate-800 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
                <p className="mt-2 text-xs font-medium text-slate-300 tabular-nums">{progress}% target tercapai</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Survei bulan ini" value={monthReports.length} Icon={FileText} />
          <Stat label="Draf dan antrean" value={queueCount} Icon={Clock3} attention={queueCount > 0} />
          <Stat label="Total laporan" value={mine.length} Icon={LayoutDashboard} />
          <Stat label="Pengajuan diproses" value={pending} Icon={History} attention={pending > 0} />
        </div>
      </section>

      <Button asChild size="lg" className="w-full sm:w-auto h-12 bg-emerald-700 hover:bg-emerald-800">
        <Link to="/form"><Plus className="mr-2 size-5" aria-hidden="true" /> Mulai Survei Baru</Link>
      </Button>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Lima survei terakhir</h2>
            <p className="text-sm text-slate-600">Survei yang terakhir dikirim.</p>
          </div>
          {mine.length > 0 && (
            <Button asChild variant="link" className="px-0 h-auto self-start sm:self-auto">
              <Link to="/reports">Lihat Semua Laporan</Link>
            </Button>
          )}
        </div>
        
        {mine.length === 0 ? (
          <EmptyState 
            Icon={FileText} 
            title="Belum ada laporan" 
            description="Mulai survei pertama setelah target dan data outlet tersedia." 
            action={<Button asChild className="mt-4"><Link to="/form">Buat Survei Pertama</Link></Button>} 
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.slice(0, 5).map((report) => <ReportCard key={report.id} report={report} />)}
          </div>
        )}
      </section>
    </div>
  );
}

// ===================== DASHBOARD MASTER =====================
function MasterDashboard({ reports, outlets, targets, surveyors, requests, loadData }) {
  const [period, setPeriod] = useState("7");
  const [liveStatus, setLiveStatus] = useState("connecting");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const debounceRef = useRef();

  useEffect(() => {
    const unsubscribe = subscribeToReportChanges(
      () => {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
          try { await loadData(); setUpdatedAt(new Date()); } catch { /* state error ditangani store */ }
        }, 1000);
      },
      (status) => setLiveStatus(status === "SUBSCRIBED" ? "live" : ["CHANNEL_ERROR", "TIMED_OUT", "error", "unavailable"].includes(status) ? "polling" : "connecting")
    );
    return () => {
      window.clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [loadData]);

  useEffect(() => {
    if (liveStatus === "live") return undefined;
    const timer = window.setInterval(async () => {
      try { await loadData(); setUpdatedAt(new Date()); } catch { /* state error ditangani store */ }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [liveStatus, loadData]);

  const startKey = periodStartKey(period);
  const filtered = reports.filter((report) => dateKeyWib(report.recordedAt || report.createdAt) >= startKey);
  const today = todayKeyWib();
  const todayCount = reports.filter((report) => dateKeyWib(report.recordedAt || report.createdAt) === today).length;
  const monthKey = currentMonthKey();
  const monthReports = reports.filter((report) => dateKeyWib(report.recordedAt || report.createdAt).startsWith(monthKey));
  
  const currentTargets = latestTargetsForMonth(targets, monthKey);
  const totalTarget = currentTargets.reduce((sum, item) => sum + Number(item.target || 0), 0);
  const targetProgress = totalTarget > 0 ? Math.min(100, Math.round((monthReports.length / totalTarget) * 100)) : null;
  
  const barData = surveyors.map((surveyor) => ({ name: shortName(surveyor.nama), total: filtered.filter((report) => report.userId === surveyor.id).length })).filter((item) => item.total > 0);
  const lineData = buildDailySeries(filtered, startKey, today);
  
  const targetRows = surveyors.map((surveyor) => {
    const target = currentTargets.find((item) => item.userId === surveyor.id)?.target;
    const actual = monthReports.filter((report) => report.userId === surveyor.id).length;
    return { id: surveyor.id, name: surveyor.nama, target, actual, progress: target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : null };
  }).filter((item) => item.target != null);
  
  const pending = requests.filter((request) => request.status === "pending").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-emerald-700">Kendali operasional</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard Master</h1>
          <p className="text-sm text-slate-600">Ringkasan capaian survei berdasarkan data yang tersimpan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={liveStatus === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}>
            <Radio className={`mr-1.5 size-3.5 ${liveStatus === "connecting" ? "animate-pulse" : ""}`} aria-hidden="true" />
            {liveStatus === "live" ? "Realtime aktif" : liveStatus === "polling" ? "Pembaruan berkala" : "Menghubungkan"}
          </Badge>
          <span className="text-xs text-slate-500">Diperbarui {formatTime(updatedAt)}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indikator utama">
        <Stat label="Total survei" value={reports.length} Icon={FileText} strong />
        <Stat label="Survei hari ini" value={todayCount} Icon={Clock3} />
        <Stat label="Capaian bulan ini" value={targetProgress == null ? "Belum ada" : `${targetProgress}%`} Icon={Target} />
        <Stat label="Surveyor aktif" value={surveyors.filter((item) => item.active).length} Icon={Users} />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Periode grafik</p>
          <p className="text-xs text-slate-600">Filter diterapkan pada diagram batang dan tren harian.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-11 w-full sm:w-48" aria-label="Pilih periode grafik">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 hari terakhir</SelectItem>
            <SelectItem value="30">30 hari terakhir</SelectItem>
            <SelectItem value="month">Bulan ini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Survei per surveyor" description="Jumlah survei pada periode terpilih.">
          {barData.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={barData} accessibilityLayer margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickMargin={8} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
        
        <ChartCard title="Tren survei harian" description="Perubahan jumlah survei dari hari ke hari.">
          {filtered.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={lineData} accessibilityLayer margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" tickMargin={8} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ fill: "var(--color-total)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ChartContainer>
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Target vs Realisasi</CardTitle>
            <CardDescription>Capaian bulan berjalan per surveyor.</CardDescription>
          </CardHeader>
          <CardContent>
            {targetRows.length === 0 ? (
              <EmptyState Icon={Target} title="Target belum ditetapkan" description="Tetapkan target bulanan agar capaian dapat dibandingkan." action={<Button asChild className="mt-2"><Link to="/targets">Atur Target</Link></Button>} />
            ) : (
              <div className="space-y-5">
                {targetRows.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-900">{item.name}</span>
                      <span className="tabular-nums text-slate-600 font-medium">{item.actual} <span className="text-slate-400">/ {item.target}</span></span>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Komposisi Survei</CardTitle>
            <CardDescription>Diagram donat memerlukan dimensi kategorikal yang nyata.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            <EmptyState Icon={Store} title="Dimensi belum ditentukan" description="Pilih status verifikasi, kondisi outlet, atau kategori outlet sebelum grafik dibuat." />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Laporan terbaru</h2>
            <p className="text-sm text-slate-600">Lima data terbaru dari seluruh tim.</p>
          </div>
          <span className="text-sm font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 tabular-nums">{pending} pengajuan menunggu</span>
        </div>
        
        {reports.length === 0 ? (
          <EmptyState Icon={FileText} title="Belum ada laporan masuk" description="Laporan akan muncul setelah surveyor mengirim survei." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.slice(0, 5).map((report) => <ReportCard key={report.id} report={report} showUser />)}
          </div>
        )}
      </section>
    </div>
  );
}

// ===================== KOMPONEN PENDUKUNG =====================

function Stat({ label, value, Icon, strong = false, attention = false }) {
  return (
    <Card className={`${strong ? "border-l-[3px] border-l-emerald-700 bg-slate-950 text-white" : attention ? "border-amber-300 bg-amber-50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-medium ${strong ? "text-slate-300" : attention ? "text-amber-900" : "text-slate-600"}`}>{label}</p>
          <Icon className={`size-4 flex-none ${strong ? "text-emerald-300" : attention ? "text-amber-800" : "text-emerald-700"}`} aria-hidden="true" />
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
      <EmptyState 
        Icon={FileText} 
        title="Belum ada data" 
        description="Pilih periode lain atau tunggu laporan baru." 
        action={<Button asChild variant="outline" className="mt-2"><Link to="/reports">Buka Laporan</Link></Button>} 
      />
    </div>
  );
}

// ===================== FUNGSI BANTU =====================

function latestTargetsForMonth(targets, monthKey) {
  const map = new Map();
  targets.filter((item) => item.periodStart?.startsWith(monthKey)).forEach((item) => { 
    if (!map.has(item.userId)) map.set(item.userId, item); 
  });
  return [...map.values()];
}

function buildDailySeries(reports, startKey, endKey) {
  const counts = reports.reduce((map, report) => { 
    const key = dateKeyWib(report.recordedAt || report.createdAt); 
    map.set(key, (map.get(key) || 0) + 1); 
    return map; 
  }, new Map());
  
  const output = [];
  const cursor = new Date(`${startKey}T00:00:00+07:00`);
  const end = new Date(`${endKey}T00:00:00+07:00`);
  
  while (cursor <= end) {
    const key = dateKeyWib(cursor);
    output.push({ 
      date: key, 
      label: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" }).format(cursor), 
      total: counts.get(key) || 0 
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return output;
}

function periodStartKey(period) {
  if (period === "month") return `${currentMonthKey()}-01`;
  const date = new Date();
  date.setDate(date.getDate() - (Number(period) - 1));
  return dateKeyWib(date);
}

function dateKeyWib(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function todayKeyWib() { return dateKeyWib(new Date()); }
function currentMonthKey() { return todayKeyWib().slice(0, 7); }
function shortName(value = "") { const parts = value.trim().split(/\s+/); return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]; }
function formatTime(value) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(value); }