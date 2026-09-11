"use client";

import type { ReportStatus } from "@/lib/field/types";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";

export const statusToneClasses: Record<ReportStatus, string> = {
  queued: "border-warning-outline bg-warning-container text-warning",
  syncing: "border-outline-variant/60 bg-surface-container-low text-on-surface-variant",
  synced: "border-secondary/40 bg-secondary-container/40 text-on-secondary-container",
  failed: "border-error/40 bg-error-container text-on-error-container",
};

export function SyncStatusBadge({ status }: { status: ReportStatus }) {
  const copy = useFieldReportCopy();

  return (
    <span
      data-report-status={status}
      className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider ${statusToneClasses[status]}`}
    >
      {copy.status[status]}
    </span>
  );
}
