import { useCallback, useEffect, useRef, useState } from "react";
import { getQueueCount, getQueuedReports, markQueueAttempt, removeQueuedReport } from "@/lib/offline";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

export function useOfflineSync() {
  const user = useStore((state) => state.user);
  const addReport = useStore((state) => state.addReport);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);

  const refreshCount = useCallback(async () => {
    setQueueCount(await getQueueCount(user?.id));
  }, [user?.id]);

  const sync = useCallback(async () => {
    if (!user?.id || user.role === "master" || !navigator.onLine || running.current) return;
    running.current = true;
    setSyncing(true);
    const items = await getQueuedReports(user.id);
    if (items.length > 0) toast.loading(`Mengirim ${items.length} survei tersimpan.`, { id: "offline-sync" });
    let sent = 0;
    let failed = 0;
    for (const item of items) {
      try {
        await addReport(item.payload);
        await removeQueuedReport(item.id);
        sent += 1;
      } catch (error) {
        await markQueueAttempt(item, error.message || "Survei belum dapat dikirim.");
        failed += 1;
      }
    }
    await refreshCount();
    if (items.length > 0 && failed === 0) toast.success(`${sent} survei tersimpan berhasil dikirim.`, { id: "offline-sync" });
    if (failed > 0) toast.error(`${failed} survei belum terkirim. Gunakan Kirim Ulang setelah koneksi stabil.`, { id: "offline-sync" });
    setSyncing(false);
    running.current = false;
  }, [addReport, refreshCount, user?.id, user?.role]);

  useEffect(() => {
    refreshCount();
    const handleQueue = () => refreshCount();
    const handleOnline = () => sync();
    window.addEventListener("ardi:queue-changed", handleQueue);
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener("ardi:queue-changed", handleQueue);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshCount, sync]);

  return { queueCount, syncing, retry: sync };
}
