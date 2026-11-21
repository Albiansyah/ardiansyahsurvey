import { create } from "zustand";

let counter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, type = "info", duration = 3200) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

export const toast = {
  success: (msg) => useToastStore.getState().push(msg, "success"),
  error: (msg) => useToastStore.getState().push(msg, "error"),
  info: (msg) => useToastStore.getState().push(msg, "info")
};

export const useConfirmStore = create((set) => ({
  isOpen: false,
  title: "",
  message: "",
  confirmLabel: "Ya",
  cancelLabel: "Batal",
  variant: "danger",
  onConfirm: () => {},
  onCancel: () => {},
  open: (opts) => set({ isOpen: true, ...opts }),
  close: () => set({ isOpen: false })
}));
