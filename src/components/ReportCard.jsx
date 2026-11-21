import { Link } from "react-router-dom";
import { IconAlert, IconCheck, IconMapPin } from "./Icons";
import { formatShortWib } from "../lib/format";

export default function ReportCard({ report, showUser, children }) {
  const riskCount = report.evidence?.metadata?.riskFlags?.length || 0;
  const image = report.evidence?.dataUrl;
  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-400">
      <Link to={`/reports/${report.id}`} className="block focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset">
        <div className="relative h-44 bg-slate-200">
          {image ? <img src={image} alt={`Bukti survey ${report.outlet?.outletName || "outlet"}`} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-slate-500"><IconMapPin className="h-7 w-7" /></div>}
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${riskCount === 0 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
            {riskCount === 0 ? <IconCheck className="h-3.5 w-3.5" /> : <IconAlert className="h-3.5 w-3.5" />}
            {riskCount === 0 ? "Bukti lengkap" : `${riskCount} indikator`}
          </span>
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold text-slate-950">{report.outlet?.outletName || "Outlet tidak tersedia"}</h3>
          <p className="mt-1 truncate text-sm text-slate-600">{report.outlet?.storeName || "Nama toko belum tersedia"}</p>
          <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-700">{showUser ? report.userName : report.outlet?.picName}</p><p className="mt-0.5 text-xs text-slate-500">{formatShortWib(report.createdAt)}</p></div>
            <span className="text-xs font-semibold text-emerald-800">Lihat detail</span>
          </div>
        </div>
      </Link>
      {children}
    </article>
  );
}
