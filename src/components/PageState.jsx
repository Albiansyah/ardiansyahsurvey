import { IconAlert, IconRefresh } from "./Icons";

export function PageLoading({ label = "Memuat data" }) {
  return (
    <div className="min-h-[280px] grid place-items-center" role="status" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
        <p className="mt-3 text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <IconAlert className="mx-auto h-6 w-6 text-red-700" />
      <p className="mt-2 text-sm font-semibold text-red-900">Data tidak dapat ditampilkan</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-800 hover:bg-red-100">
          <IconRefresh className="h-4 w-4" /> Muat ulang
        </button>
      )}
    </div>
  );
}

export function EmptyState({ Icon, title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      {Icon && <Icon className="mx-auto h-7 w-7 text-slate-500" />}
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
