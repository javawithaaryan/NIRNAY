"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleCheck, RotateCcw } from "lucide-react";
import { ControlRoomStatus } from "@/components/field/ControlRoomStatus";
import { FieldNotice } from "@/components/field/FieldNotice";
import { ReportProgress } from "@/components/field/ReportProgress";
import { statusToneClasses } from "@/components/field/SyncStatusBadge";
import { useConnectivity } from "@/lib/connectivity";
import { fieldDb } from "@/lib/field/db";
import { fillTemplate, formatBytes, formatCoordinate, formatDateTime, formatWholeNumber } from "@/lib/field/format";
import { markForRetry } from "@/lib/field/reportStore";
import { syncPendingReports } from "@/lib/field/syncEngine";
import { reportTransport } from "@/lib/field/transport";
import type { FieldReportRecord } from "@/lib/field/types";
import { describeSyncFailure, useFieldReportCopy, type FieldReportCopy } from "@/lib/i18n/fieldReportCopy";
import { routes } from "@/lib/routes";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/buttonStyles";

type StatusMessage = {
  tone: "info" | "error" | "success";
  text: string;
  detail?: string;
};

function statusMessage(report: FieldReportRecord, copy: FieldReportCopy): StatusMessage {
  if (report.status === "synced") {
    const serverId = report.receipt?.serverId;
    return {
      tone: "success",
      text: fillTemplate(copy.result.syncedMessage, {
        time: formatDateTime(report.syncedAt ?? report.submittedAt, copy.locale),
      }),
      detail: serverId ? `${copy.result.serverReference}: ${serverId}` : undefined,
    };
  }
  if (report.status === "syncing") return { tone: "info", text: copy.result.syncingMessage };
  if (report.status === "failed") {
    const reason = report.lastError ? describeSyncFailure(copy, report.lastError) : copy.result.reasons.network;
    const retryable = report.lastError?.retryable !== false;
    return {
      tone: "error",
      text: fillTemplate(copy.result.failedMessage, { reason }),
      detail: retryable
        ? fillTemplate(copy.result.failedRetryAt, { time: formatDateTime(report.nextAttemptAt, copy.locale) })
        : copy.result.failedNoRetry,
    };
  }
  return { tone: "info", text: copy.result.queuedMessage };
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 break-words text-on-surface">{children}</dd>
    </div>
  );
}

type SubmissionResultProps = {
  reportId: string;
  onReportAnother: () => void;
};

export function SubmissionResult({ reportId, onReportAnother }: SubmissionResultProps) {
  const copy = useFieldReportCopy();
  const connectivity = useConnectivity();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasFocusedRef = useRef(false);

  const result = useLiveQuery(async () => {
    try {
      return { report: (await fieldDb.reports.get(reportId)) ?? null, failed: false };
    } catch (error) {
      console.error("Could not read the saved report", error);
      return { report: null, failed: true };
    }
  }, [reportId]);

  useEffect(() => {
    if (!hasFocusedRef.current && result?.report) {
      hasFocusedRef.current = true;
      headingRef.current?.focus();
    }
  }, [result]);

  const retry = async () => {
    try {
      await markForRetry(reportId);
      await syncPendingReports();
    } catch (error) {
      console.error("Could not retry sending the report", error);
    }
  };

  if (!result) {
    return (
      <p role="status" className="mt-4 text-sm text-on-surface-variant">
        {copy.result.loading}
      </p>
    );
  }

  const report = result.report;
  if (!report) {
    return (
      <div className="mt-4">
        <FieldNotice tone="error">{copy.result.missing}</FieldNotice>
      </div>
    );
  }

  const message = statusMessage(report, copy);

  return (
    <section
      aria-labelledby="submission-heading"
      data-report-status={report.status}
      className="mt-4 rounded-lg border border-outline-variant/60 bg-surface-container-lowest"
    >
      <div className="border-b border-outline-variant/40 px-5 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-success-outline bg-success-container text-success">
            <CircleCheck aria-hidden="true" className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{copy.result.eyebrow}</p>
            <h2
              id="submission-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-0.5 text-2xl font-extrabold uppercase tracking-tight text-primary-container focus-visible:outline-none"
            >
              {copy.result.title}
            </h2>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 rounded-xs border border-outline-variant/40 bg-surface-container-low p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{copy.result.reportId}</dt>
            <dd data-report-reference className="mt-1 break-all font-mono text-lg font-bold text-primary-container">
              {report.reference}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {copy.result.statusLabel}
            </dt>
            <dd className="mt-1">
              <span
                data-status-value
                className={`inline-flex items-center rounded-xs border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusToneClasses[report.status]}`}
              >
                {copy.result.statusValue[report.status]}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7">
        <div role="status" aria-live="polite" className="space-y-5">
          <FieldNotice tone={message.tone}>
            {message.text}
            {message.detail && <span className="mt-1 block text-xs">{message.detail}</span>}
          </FieldNotice>
          <ReportProgress report={report} />
          <ControlRoomStatus report={report} />
        </div>

        {report.status === "failed" && reportTransport.configured && (
          <button
            type="button"
            disabled={connectivity === "offline"}
            onClick={() => void retry()}
            className={secondaryButtonClass}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {copy.result.retryNow}
          </button>
        )}

        <dl className="grid grid-cols-1 gap-3 border-t border-outline-variant/40 pt-5 text-sm sm:grid-cols-2">
          <Detail label={copy.result.submittedAt}>{formatDateTime(report.submittedAt, copy.locale)}</Detail>
          <Detail label={copy.result.location}>
            <span className="font-mono">
              {formatCoordinate(report.location.latitude, copy.location.north, copy.location.south)},{" "}
              {formatCoordinate(report.location.longitude, copy.location.east, copy.location.west)}
            </span>{" "}
            <span className="text-on-surface-variant">
              ({fillTemplate(copy.location.accuracyValue, { meters: formatWholeNumber(report.location.accuracyM, copy.locale) })})
            </span>
          </Detail>
          <Detail label={copy.result.observation}>
            {report.category ? copy.observation.categories[report.category] : report.note ? null : copy.observation.none}
            {report.note && (
              <span className={`block whitespace-pre-wrap ${report.category ? "mt-0.5 text-on-surface-variant" : ""}`}>
                {report.note}
              </span>
            )}
          </Detail>
          <Detail label={copy.result.photo}>
            {fillTemplate(copy.photo.details, {
              width: report.photo.width,
              height: report.photo.height,
              size: formatBytes(report.photo.byteSize, copy.locale),
            })}
          </Detail>
        </dl>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant/40 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <Link href={routes.home} className={secondaryButtonClass}>
          {copy.result.backHome}
        </Link>
        <button type="button" onClick={onReportAnother} className={primaryButtonClass}>
          {copy.result.reportAnother}
        </button>
      </div>
    </section>
  );
}
