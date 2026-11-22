import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useConfirmStore } from "@/lib/toast";

export default function ConfirmDialog() {
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel, close } = useConfirmStore();
  const cancel = () => (onCancel || close)();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={variant === "danger" ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
