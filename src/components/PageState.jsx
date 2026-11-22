import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ label = "Memuat data" }) {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label={label}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50 p-4">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Data tidak dapat ditampilkan</AlertTitle>
      <AlertDescription>
        <p>{message || "Terjadi kendala saat mengambil data. Periksa koneksi lalu coba lagi."}</p>
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry} className="mt-4 border-red-300 bg-white text-red-800 hover:bg-red-100">
            <RefreshCw aria-hidden="true" /> Coba Lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ Icon = Inbox, title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <Icon className="mx-auto size-7 text-slate-600" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
