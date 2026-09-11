"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BellRing } from "lucide-react";
import { fieldDb } from "@/lib/field/db";
import { ingestPendingFieldReports } from "@/lib/scenario/bridge";
import { formatStamp } from "@/lib/scenario/format";
import type { PortalView } from "@/lib/scenario/view";

export function ControlRoomBridge({ startedAt }: { startedAt: number | null }) {
  const reportKey = useLiveQuery(async () => {
    try {
      const reports = await fieldDb.reports.toArray();
      return reports.map((report) => report.id).sort().join(",");
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (reportKey === undefined || !startedAt) return;
    ingestPendingFieldReports().catch((error) => console.error("Control room bridge could not ingest field reports", error));
  }, [reportKey, startedAt]);

  return null;
}

export function NewIncidentBanner({ view }: { view: PortalView }) {
  const latest = view.incidents[view.incidents.length - 1];
  if (!latest || latest.incident.verifiedAt || latest.incident.rejectedAt) return null;
  const { incident, interpretation, assessment, segment } = latest;
  const fieldEvidence = latest.evidence.find((item) => item.kind === "FIELD_REPORT");
  const stage = !interpretation ? "AI analysis starting…" : assessment.corroborated ? "Ready for officer verification" : "AI analysis complete · corroboration in progress";

  return (
    <div data-new-incident className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-error/40 bg-error-container/40 px-4 py-3">
      <BellRing aria-hidden="true" className="size-5 shrink-0 text-error" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-wider text-error">New incident received</p>
        <p className="text-sm font-bold text-primary-container">
          {incident.reference} · {incident.ai.label} · {segment?.segment.name} ({segment?.segment.corridor}) · {formatStamp(incident.reportedAt)}
        </p>
        <p className="text-xs text-on-surface-variant">
          {fieldEvidence?.fieldReportReference ? `Field report ${fieldEvidence.fieldReportReference} · received by control room (demo, this browser)` : "Seeded demo report"} ·{" "}
          <span data-new-incident-stage className={`font-bold uppercase ${assessment.corroborated ? "text-success" : "text-secondary"}`}>
            {stage}
          </span>
        </p>
      </div>
      <Link href="/dashboard#incident-analysis" className="shrink-0 text-xs font-bold uppercase tracking-wide text-secondary hover:underline">
        Review &amp; verify →
      </Link>
    </div>
  );
}
