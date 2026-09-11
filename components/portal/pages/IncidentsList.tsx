"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Inbox } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, evidenceStatusTone, labelize, portalSecondaryButton } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { sessionActor, useSession } from "@/lib/auth/session";
import { fieldDb } from "@/lib/field/db";
import { interpretIncident } from "@/lib/ai/interpret";
import { portalActions } from "@/lib/scenario/actions";
import { loadState } from "@/lib/scenario/store";
import { formatAge, formatCoordinates, formatStamp } from "@/lib/scenario/format";

export function IncidentsList() {
  const view = usePortalView();
  const session = useSession();
  const fieldReports = useLiveQuery(async () => {
    try {
      return await fieldDb.reports.orderBy("submittedAt").reverse().toArray();
    } catch {
      return [];
    }
  }, []);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!view || !session) return <p className="text-sm text-on-surface-variant">Loading incidents…</p>;

  const usedReportIds = new Set(
    view.incidents.flatMap((incident) => incident.evidence.flatMap((item) => (item.photo?.kind === "field-db" ? [item.photo.reportId] : []))),
  );

  const openAsIncident = async (reportId: string) => {
    const report = fieldReports?.find((item) => item.id === reportId);
    if (!report) return;
    setBusyId(reportId);
    try {
      await portalActions.ensureStarted(sessionActor(session));
      await portalActions.reportIncidentFromField(sessionActor(session), report);
      const state = await loadState();
      const created = state.incidentOrder.find((id) => state.evidence.some((item) => item.incidentId === id && item.photo?.kind === "field-db" && item.photo.reportId === report.id));
      if (created) await interpretIncident(created);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Incidents & evidence" subtitle="Field reports become incidents; incidents become verified only through an officer's action." />

      <Card>
        <CardHeader title="Incidents" subtitle={`${view.incidents.length} in this scenario`} />
        {view.incidents.length === 0 ? (
          <EmptyState>No incidents yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {[...view.incidents].reverse().map((item) => (
              <li key={item.incident.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary-container">{item.incident.reference}</span>
                    <Badge tone="danger">{item.incident.ai.label}</Badge>
                    <Badge tone={evidenceStatusTone(item.assessment.status)}>{labelize(item.assessment.status)}</Badge>
                    {item.interpretation && (
                      <Badge tone="warning">AI assistance used · officer verification required</Badge>
                    )}
                    {item.networkApplied && <Badge tone="muted">Network applied</Badge>}
                  </div>
                  <Link href={`/incidents/${item.incident.id}`} className="text-xs font-bold text-secondary hover:underline">
                    Open →
                  </Link>
                </div>
                <p className="mt-1 text-sm text-on-surface">
                  {item.segment?.segment.name} ({item.segment?.segment.corridor}) · reported {formatAge(item.incident.reportedAt, view.now)} · E ={" "}
                  {item.assessment.E.toFixed(2)} · {item.evidence.length} evidence items
                  {item.interpretation && (
                    <span className="block text-xs text-on-surface-variant">
                      AI interpretation: {item.interpretation.hazard.label.toLowerCase()} · lane obstruction {item.interpretation.laneObstruction.assessment.toLowerCase()} · confidence{" "}
                      {item.interpretation.confidence.toFixed(2)} ({item.interpretation.provider.kind === "llm-backend" ? "LLM adapter" : "deterministic fallback"})
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          icon={<Inbox aria-hidden="true" className="size-5" />}
          title="Field reports on this device"
          subtitle="Reports saved by /field/report in this browser. In the prototype the portal reads them directly from local storage; a server would deliver them after synchronization."
        />
        {!fieldReports || fieldReports.length === 0 ? (
          <EmptyState>No field reports are stored on this device.</EmptyState>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {fieldReports.map((report) => {
              const used = usedReportIds.has(report.id);
              return (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-primary-container">{report.reference}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatStamp(Date.parse(report.submittedAt))} · {formatCoordinates(report.location.latitude, report.location.longitude)} (±
                      {Math.round(report.location.accuracyM)} m){report.category ? ` · ${report.category}` : ""}
                    </p>
                    {report.note && <p className="mt-0.5 truncate text-xs text-on-surface">{report.note}</p>}
                  </div>
                  {used ? (
                    <Badge tone="success">Attached to incident</Badge>
                  ) : (
                    <button type="button" disabled={busyId === report.id} onClick={() => void openAsIncident(report.id)} className={portalSecondaryButton}>
                      Open as incident
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
