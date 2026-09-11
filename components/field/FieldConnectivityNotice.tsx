"use client";

import { FieldNotice } from "@/components/field/FieldNotice";
import { useConnectivity } from "@/lib/connectivity";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";

export function FieldConnectivityNotice() {
  const connectivity = useConnectivity();
  const copy = useFieldReportCopy();

  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {connectivity === "offline" && (
        <FieldNotice tone="warning" title={copy.connectivity.offlineTitle}>
          {copy.connectivity.offlineBody}
        </FieldNotice>
      )}
      {connectivity === "weak" && (
        <FieldNotice tone="info" title={copy.connectivity.weakTitle}>
          {copy.connectivity.weakBody}
        </FieldNotice>
      )}
    </div>
  );
}
