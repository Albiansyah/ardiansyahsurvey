import { ClipboardCheck } from "lucide-react";

export default function Brand({ compact = false, inverse = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* TODO: ganti dengan logo final setelah aset resmi tersedia. */}
      <span className="grid size-10 flex-none place-items-center rounded-md bg-primary text-primary-foreground">
        <ClipboardCheck className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className={`block truncate text-sm font-semibold ${inverse ? "text-white" : "text-slate-950"}`}>Ardi Survey</span>
          <span className={`block truncate text-xs ${inverse ? "text-slate-300" : "text-slate-600"}`}>Operasional SPHP</span>
        </span>
      )}
    </div>
  );
}
