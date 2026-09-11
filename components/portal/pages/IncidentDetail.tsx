"use client";

import Link from "next/link";
import { EvidencePhoto } from "@/components/portal/EvidencePhoto";
import { IncidentIntelligencePanel } from "@/components/portal/IncidentIntelligencePanel";
import { ResponseActionsPanel } from "@/components/portal/ResponseActionsPanel";
import { Badge, Card, CardHeader, KeyValue, PageHeader, SimulatedTag, evidenceStatusTone, labelize } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { useSession } from "@/lib/auth/session";
import { formatCoordinates, formatStamp } from "@/lib/scenario/format";
import { usePortalState } from "@/lib/scenario/store";

export function IncidentDetail({ id }: { id: string }) {
  const view = usePortalView();
  const state = usePortalState();
  const session = useSession();

  if (!view || !state || !session) return <p className="text-sm text-on-surface-variant">Loading incident…</p>;
  const item = view.incidents.find((incident) => incident.incident.id === id);
  if (!item) {
    return (
      <>
        <PageHeader title="Incident not found" />
        <Link href="/incidents" className="text-sm font-semibold text-secondary hover:underline">
          ← Back to incidents
        </Link>
      </>
    );
  }

  const { incident, assessment, evidence, segment } = item;
  const fieldEvidence = evidence.find((entry) => entry.kind === "FIELD_REPORT");

  return (
    <>
      <PageHeader
        title={`${incident.reference} · ${incident.ai.label}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={evidenceStatusTone(assessment.status)}>{labelize(assessment.status)}</Badge>
            {item.interpretation && <Badge tone="warning">AI assistance used · officer verification required</Badge>}
            <span>
              {segment?.segment.name} ({segment?.segment.corridor}) · reported {formatStamp(incident.reportedAt)}
            </span>
          </span>
        }
        actions={
          <Link href="/incidents" className="text-sm font-semibold text-secondary hover:underline">
            ← All incidents
          </Link>
        }
      />

      <Card>
        <CardHeader title="Field evidence" subtitle={fieldEvidence?.source} actions={fieldEvidence && <SimulatedTag origin={fieldEvidence.origin} />} />
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xs border border-outline-variant/60 bg-surface-container-high">
            {fieldEvidence?.photo?.kind === "field-db" ? (
              <EvidencePhoto reportId={fieldEvidence.photo.reportId} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-xs text-on-surface-variant">
                Seeded demo report — no photo attached. Submit a report from /field/report on this browser to see a real photo here.
              </div>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KeyValue label="Incident location" mono>
              {formatCoordinates(incident.lat, incident.lon)}
            </KeyValue>
            <KeyValue label="Captured">{fieldEvidence ? formatStamp(fieldEvidence.capturedAt) : "—"}</KeyValue>
            <KeyValue label="Device GPS accuracy">{fieldEvidence?.accuracyM ? `±${Math.round(fieldEvidence.accuracyM)} m` : "—"}</KeyValue>
            <KeyValue label="Source">{fieldEvidence?.source ?? "—"}</KeyValue>
            <KeyValue label="Reporter note">{incident.note ?? "No note"}</KeyValue>
            <KeyValue label="Type selected by reporter">{incident.category}</KeyValue>
            {fieldEvidence?.summary && (
              <div className="sm:col-span-2">
                <KeyValue label="Handling note">{fieldEvidence.summary}</KeyValue>
              </div>
            )}
          </dl>
        </div>
      </Card>

      <IncidentIntelligencePanel view={view} state={state} incidentView={item} session={session} showPhoto={false} />

      <ResponseActionsPanel view={view} state={state} incidentView={item} />
    </>
  );
}
