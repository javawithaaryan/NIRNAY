"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { HardDrive, RefreshCw, RotateCcw } from "lucide-react";
import { FieldNotice } from "@/components/field/FieldNotice";
import { SyncStatusBadge } from "@/components/field/SyncStatusBadge";
import { useConnectivity } from "@/lib/connectivity";
import { fieldDb } from "@/lib/field/db";
import { fillTemplate, formatDateTime } from "@/lib/field/format";
import { makePendingDueNow, markForRetry } from "@/lib/field/reportStore";
import { syncPendingReports } from "@/lib/field/syncEngine";
import { reportTransport } from "@/lib/field/transport";
import type { FieldReportRecord } from "@/lib/field/types";
import { describeSyncFailure, useFieldReportCopy, type FieldReportCopy } from "@/lib/i18n/fieldReportCopy";
import { secondaryButtonClass, textButtonClass } from "@/lib/ui/buttonStyles";

function observationSummary(report: FieldReportRecord, copy: FieldReportCopy): string {
  const categoryLabel = report.category ? copy.observation.categories[report.category] : null;
  if (categoryLabel && report.note) return `${categoryLabel} — ${report.note}`;
  return categoryLabel ?? report.note ?? copy.observation.none;
}

export function DeviceReportsPanel({ highlightId }: { highlightId: string | null }) {
  const copy = useFieldReportCopy();
  const connectivity = useConnectivity();

  const result = useLiveQuery(async () => {
    try {
      return { reports: await fieldDb.reports.orderBy("submittedAt").reverse().toArray(), failed: false };
    } catch (error) {
      console.error("Could not read saved reports", error);
      return { reports: [] as FieldReportRecord[], failed: true };
    }
  }, []);

  const reports = result?.reports ?? [];
  const pendingCount = reports.filter((report) => report.status !== "synced").length;

  const syncNow = async () => {
    try {
      await makePendingDueNow();
      await syncPendingReports();
    } catch (error) {
      console.error("Could not start synchronization", error);
    }
  };

  const retry = async (id: string) => {
    try {
      await markForRetry(id);
      await syncPendingReports();
    } catch (error) {
      console.error("Could not retry sending the report", error);
    }
  };

  return (
    <section
      aria-labelledby="device-reports-heading"
      className="mt-8 rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <HardDrive aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secondary" />
          <div>
            <h2 id="device-reports-heading" className="text-xs font-bold uppercase tracking-wider text-primary-container">
              {copy.device.title}
            </h2>
            {result && !result.failed && reports.length > 0 && (
              <p data-device-summary className="mt-0.5 text-xs text-on-surface-variant">
                {fillTemplate(copy.device.summary, { total: reports.length, pending: pendingCount })}
              </p>
            )}
          </div>
        </div>
        {reportTransport.configured && pendingCount > 0 && (
          <button
            type="button"
            disabled={connectivity === "offline"}
            onClick={() => void syncNow()}
            className={secondaryButtonClass}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            {copy.device.syncNow}
          </button>
        )}
      </div>

      {!result && (
        <p role="status" className="mt-3 text-xs text-on-surface-variant">
          {copy.device.loading}
        </p>
      )}
      {result?.failed && (
        <div className="mt-3">
          <FieldNotice tone="error">{copy.device.unavailable}</FieldNotice>
        </div>
      )}
      {result && !result.failed && reports.length === 0 && (
        <p className="mt-3 text-xs text-on-surface-variant">{copy.device.empty}</p>
      )}
      {reports.length > 0 && (
        <ul className="mt-3 divide-y divide-outline-variant/40 rounded-xs border border-outline-variant/40 bg-surface-container-lowest">
          {reports.map((report) => {
            const isCurrent = report.id === highlightId;
            return (
              <li
                key={report.id}
                data-report-id={report.id}
                className={`flex items-start justify-between gap-3 px-3 py-3 ${isCurrent ? "bg-secondary-container/15" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-primary-container">
                    {report.reference}
                    {isCurrent && (
                      <span className="ml-2 font-sans text-xs font-semibold text-secondary">{copy.device.current}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-on-surface">{observationSummary(report, copy)}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {fillTemplate(copy.device.submitted, { time: formatDateTime(report.submittedAt, copy.locale) })}
                  </p>
                  {report.status === "failed" && report.lastError && (
                    <p className="mt-0.5 text-xs text-on-error-container">{describeSyncFailure(copy, report.lastError)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <SyncStatusBadge status={report.status} />
                  {report.status === "failed" && reportTransport.configured && (
                    <button
                      type="button"
                      disabled={connectivity === "offline"}
                      onClick={() => void retry(report.id)}
                      className={textButtonClass}
                    >
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                      {copy.device.retry}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
