import { useEffect, useRef } from "react";
import { useConfirmStore } from "../lib/toast";

export default function ConfirmDialog() {
  const store = useConfirmStore();
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel, close } = store;
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    prevFocusRef.current = document.activeElement;
    cancelRef.current?.focus();

    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        (onCancel || close)();
      }
      if (e.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll("button");
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (prevFocusRef.current && prevFocusRef.current.focus) prevFocusRef.current.focus();
    };
  }, [isOpen, onCancel, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) (onCancel || close)();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-scale-in"
      >
        <h3 id="confirm-title" className="font-semibold text-slate-900 text-lg">
          {title}
        </h3>
        <p id="confirm-message" className="text-sm text-slate-600 mt-2 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-2 mt-5">
          <button
            ref={cancelRef}
            onClick={() => (onCancel || close)()}
            className="flex-1 min-h-[44px] py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 min-h-[44px] py-2.5 rounded-lg text-white font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              variant === "danger"
                ? "bg-red-700 hover:bg-red-800 focus:ring-red-600"
                : "bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
