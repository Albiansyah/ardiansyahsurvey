import { toast } from "sonner";
import { create } from "zustand";

export { toast };

export const useConfirmStore = create((set) => ({
  isOpen: false,
  title: "",
  message: "",
  confirmLabel: "Ya",
  cancelLabel: "Batal",
  variant: "danger",
  onConfirm: () => {},
  onCancel: () => {},
  open: (options) => set({ isOpen: true, ...options }),
  close: () => set({ isOpen: false })
}));
