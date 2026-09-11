"use client";

import { Radio } from "lucide-react";
import type { FieldReportRecord } from "@/lib/field/types";
import { isEligibleForBridge } from "@/lib/scenario/bridge";
import { usePortalState } from "@/lib/scenario/store";

export function ControlRoomStatus({ report }: { report: FieldReportRecord }) {
  const state = usePortalState();
  if (!state) return null;

  const evidence = state.evidence.find((item) => item.photo?.kind === "field-db" && item.photo.reportId === report.id);
  const incident = evidence ? state.incidents[evidence.incidentId] : null;
  const interpretation = incident ? state.interpretations[incident.id] : null;

  let status: "RECEIVED" | "PROCESSING" | "AVAILABLE";
  let detail: string;
  if (incident && evidence) {
    status = "RECEIVED";
    const role = evidence.kind === "FIELD_REPORT" ? `Incident ${incident.reference} created` : `Attached to ${incident.reference} as corroborating evidence`;
    const verification = incident.verifiedAt ? "verified by an authorized officer" : incident.rejectedAt ? "reviewed by an officer" : "awaiting officer verification";
    detail = `${role} · ${interpretation ? "AI analysis complete" : "AI analysis starting"} · ${verification}`;
  } else if (isEligibleForBridge(report, state)) {
    status = "PROCESSING";
    detail = "Handing the report to the control room on this browser…";
  } else {
    status = "AVAILABLE";
    detail = "The control-room demo on this browser picks the report up while a demo run is active.";
  }

  const label = { RECEIVED: "Received by control room (demo)", PROCESSING: "Processing", AVAILABLE: "Available to control room" }[status];
  const tone = status === "RECEIVED" ? "border-success-outline bg-success-container text-success" : "border-outline-variant bg-surface-container-low text-secondary";

  return (
    <div data-control-room-status={status} className="rounded-xs border border-outline-variant/60 bg-surface-container-lowest p-3">
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        <Radio aria-hidden="true" className="size-4" />
        Control room
        <span className={`rounded-xs border px-2 py-0.5 font-bold ${tone}`}>{label}</span>
      </p>
      <p className="mt-1.5 text-sm text-on-surface">{detail}</p>
      <p className="mt-1 text-[0.6875rem] text-on-surface-variant">Local prototype event bridge on this device — not a server upload.</p>
    </div>
  );
}
