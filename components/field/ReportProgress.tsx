"use client";

import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useConnectivity, type ConnectivityState } from "@/lib/connectivity";
import { fillTemplate, formatDateTime } from "@/lib/field/format";
import type { FieldReportRecord } from "@/lib/field/types";
import { describeSyncFailure, useFieldReportCopy, type FieldReportCopy } from "@/lib/i18n/fieldReportCopy";

type StageKey = "saved" | "queued" | "sent";
type StageState = "done" | "active" | "pending" | "failed";
type Stage = { key: StageKey; label: string; detail: string; state: StageState };

function buildStages(report: FieldReportRecord, copy: FieldReportCopy, connectivity: ConnectivityState): Stage[] {
  const timeline = copy.result.timeline;
  const queuedDetail =
    report.status === "queued"
      ? connectivity === "offline"
        ? timeline.queuedWaitingOffline
        : timeline.queuedWaiting
      : "";

  let sent: Stage = { key: "sent", label: timeline.sent, detail: timeline.sentPending, state: "pending" };
  if (report.status === "syncing") {
    sent = { key: "sent", label: timeline.sending, detail: "", state: "active" };
  } else if (report.status === "synced") {
    sent = {
      key: "sent",
      label: timeline.sent,
      detail: fillTemplate(timeline.sentDetail, { time: formatDateTime(report.syncedAt ?? report.submittedAt, copy.locale) }),
      state: "done",
    };
  } else if (report.status === "failed") {
    sent = {
      key: "sent",
      label: timeline.sendFailed,
      detail: report.lastError ? describeSyncFailure(copy, report.lastError) : "",
      state: "failed",
    };
  }

  return [
    { key: "saved", label: timeline.saved, detail: formatDateTime(report.submittedAt, copy.locale), state: "done" },
    { key: "queued", label: timeline.queued, detail: queuedDetail, state: report.status === "queued" ? "active" : "done" },
    sent,
  ];
}

const markerClasses: Record<StageState, string> = {
  done: "border-success bg-success text-on-primary",
  active: "border-primary-container bg-primary-container text-on-primary",
  pending: "border-outline-variant bg-surface-container-lowest text-outline",
  failed: "border-error bg-error text-on-primary",
};

const labelClasses: Record<StageState, string> = {
  done: "text-on-surface",
  active: "text-primary-container",
  pending: "text-outline",
  failed: "text-on-error-container",
};

function StageMarker({ stage }: { stage: Stage }) {
  if (stage.state === "done") return <Check aria-hidden="true" className="size-3.5" />;
  if (stage.state === "failed") return <CircleAlert aria-hidden="true" className="size-3.5" />;
  if (stage.state === "active" && stage.key === "sent") {
    return <LoaderCircle aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />;
  }
  if (stage.state === "active") return <span aria-hidden="true" className="size-2 rounded-full bg-on-primary" />;
  return null;
}

export function ReportProgress({ report }: { report: FieldReportRecord }) {
  const copy = useFieldReportCopy();
  const connectivity = useConnectivity();
  const stages = buildStages(report, copy, connectivity);

  return (
    <ol aria-label={copy.result.timelineLabel}>
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          data-stage={stage.key}
          data-stage-state={stage.state}
          aria-current={stage.state === "active" || stage.state === "failed" ? "step" : undefined}
          className="relative flex gap-3 pb-5 last:pb-0"
        >
          {index < stages.length - 1 && (
            <span aria-hidden="true" className="absolute left-[0.6875rem] top-6 bottom-0 w-px bg-outline-variant" />
          )}
          <span
            className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${markerClasses[stage.state]}`}
          >
            <StageMarker stage={stage} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={`text-xs font-bold uppercase tracking-wider ${labelClasses[stage.state]}`}>{stage.label}</p>
            {stage.detail && <p className="mt-0.5 text-xs text-on-surface-variant">{stage.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
