import { useToastStore } from "../lib/toast";
import { IconCheck, IconAlert, IconInfo, IconX } from "./Icons";

export default function Toast() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-[100] inset-x-3 bottom-24 md:inset-x-auto md:bottom-6 md:right-6 md:max-w-sm space-y-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = t.type === "success" ? IconCheck : t.type === "error" ? IconAlert : IconInfo;
        const colorCls =
          t.type === "success" ? "text-green-700" : t.type === "error" ? "text-red-700" : "text-blue-800";
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-slate-200 text-sm animate-slide-up"
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colorCls}`} />
            <span className="flex-1 text-slate-800">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Tutup notifikasi"
              className="text-slate-400 hover:text-slate-700 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
