import { useEffect } from "react";
import { recoverInterruptedSyncs } from "@/lib/field/reportStore";
import { syncPendingReports } from "@/lib/field/syncEngine";

const syncIntervalMs = 15000;

export function useFieldSync(): void {
  useEffect(() => {
    const trigger = () => {
      void syncPendingReports();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") trigger();
    };
    const start = async () => {
      try {
        await recoverInterruptedSyncs();
      } catch (error) {
        console.error("Could not recover interrupted synchronizations", error);
      }
      trigger();
    };

    void start();
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(trigger, syncIntervalMs);

    return () => {
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
    };
  }, []);
}
