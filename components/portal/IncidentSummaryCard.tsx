"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Bot, Play, ShieldCheck } from "lucide-react";
import { Badge, portalPrimaryButton, type Tone } from "@/components/portal/ui";
import { interpretIncident } from "@/lib/ai/interpret";
import { sessionActor, type PortalSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import type { PortalState } from "@/lib/scenario/events";
import { formatStamp } from "@/lib/scenario/format";
import { buildIncidentIntelligence, type SeverityTier } from "@/lib/scenario/intelligence";
import { getRoute } from "@/lib/scenario/seed/nh29";
import type { IncidentView, PortalView } from "@/lib/scenario/view";

type Props = { view: PortalView; state: PortalState; incidentView: IncidentView | null; session: PortalSession };

const tierTone: Record<SeverityTier, Tone> = { CRITICAL: "danger", HIGH: "danger", MODERATE: "warning", LOW: "muted" };

export function IncidentSummaryCard({ view, state, incidentView, session }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  if (!incidentView) {
    return (
      <section id="incident-analysis" data-ai-card className="scroll-mt-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
        <Header />
        <p className="mt-3 text-sm text-on-surface-variant">No incident on the corridor — NH-29 is OPEN and all three missions are on time. Analysis starts when a field report arrives.</p>
      </section>
    );
  }

  const { incident, assessment, interpretation, severity } = incidentView;
  const intel = buildIncidentIntelligence(view, incidentView, state);
  const factor = (key: string) => intel.severityFactors.find((item) => item.key === key);
  const exposed = view.missions.filter((mission) =>
    [
      mission.mission.plannedRouteId,
      mission.currentRouteId,
      ...state.decisionOrder.map((id) => state.decisions[id]).filter((decision) => decision.missionId === mission.mission.id).map((decision) => decision.recommendation.routeId),
    ].some((routeId) => routeId && getRoute(routeId).segmentIds.includes(incident.segmentId)),
  );
  const essential = exposed.filter((mission) => mission.mission.priority !== "NORMAL");
  const why = [
    incident.fullBlockage ? "Full carriageway blockage" : "Partial restriction",
    factor("A")?.why.startsWith("NH-29") ? "Important corridor — NH-29, the primary Dimapur–Kohima artery" : `Corridor: ${factor("A")?.why ?? "secondary road"}`,
    exposed.length
      ? `${essential.length ? "Essential missions" : "Missions"} affected — ${exposed.map((mission) => `${mission.mission.id} ${mission.mission.cargo.toLowerCase()}`).join(", ")}`
      : "No mission currently routed over this segment",
    assessment.corroborated ? `Corroborating evidence — ${assessment.independentSources} independent sources` : "Corroboration pending",
  ];

  return (
    <section id="incident-analysis" data-ai-card className="scroll-mt-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="border-b border-outline-variant/40 px-4 py-3">
        <Header />
        <p className="mt-1 text-xs text-on-surface-variant">
          <span className="font-mono font-bold text-primary-container">{incident.reference}</span> · {incidentView.segment?.segment.name} ({incidentView.segment?.segment.corridor})
        </p>
      </div>

      <div className="space-y-3 p-4">
        {interpretation ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Metric label="Likely hazard" value={interpretation.hazard.label.toUpperCase()} />
            <Metric label="Confidence" value={<span data-ai-confidence>{interpretation.confidence.toFixed(2)}</span>} />
            <Metric label="Supporting sources" value={`${intel.rows.length - 1} + field report`} note={`${assessment.independentSources} independent · ${intel.rows.filter((row) => row.item.origin !== "FIELD").length} simulated / demo data`} />
            <Metric label="Consistency" value={interpretation.consistency.assessment.replace("_", " ")} />
          </dl>
        ) : (
          <div className="rounded-xs border border-warning-outline bg-warning-container/50 p-3 text-xs text-warning">
            <p className="font-bold uppercase tracking-wider">Pending AI analysis</p>
            <p className="mt-1">Photo, GPS and time received. Run the assistive analysis, or advance the demo.</p>
            <button type="button" data-ai-run disabled={busy !== null} onClick={() => void act("ai", () => interpretIncident(incident.id))} className={`${portalPrimaryButton} mt-2`}>
              <Play aria-hidden="true" className="size-4" />
              {busy === "ai" ? "Analysing…" : "Run AI analysis"}
            </button>
          </div>
        )}

        <div data-severity className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-container">
            Incident severity
            <Badge tone={tierTone[intel.severityTier]}>{intel.severityTier}</Badge>
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-on-surface">
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="sr-only">Severity score D = {severity.D.toFixed(2)}</p>
        </div>

        <p className="text-xs font-semibold text-warning">
          {interpretation
            ? incident.verifiedAt
              ? "AI analysis supported the assessment; the incident was verified by an authorized officer."
              : "AI analysis supports the assessment; officer verification is required."
            : "AI is assistive — it does not verify incidents."}
        </p>

        {incident.verifiedAt ? (
          <p data-verified-line className="rounded-xs border border-success-outline bg-success-container px-3 py-2 text-xs font-bold text-success">
            <ShieldCheck aria-hidden="true" className="mr-1 inline size-4 align-text-bottom" />
            VERIFIED BY AUTHORIZED OFFICER · {formatStamp(incident.verifiedAt)} · {incident.verifiedBy?.name}
          </p>
        ) : incident.rejectedAt ? (
          <p className="rounded-xs border border-error/30 bg-error-container px-3 py-2 text-xs font-bold text-on-error-container">REJECTED BY OFFICER · {formatStamp(incident.rejectedAt)}</p>
        ) : interpretation ? (
          <button type="button" data-verify disabled={busy !== null} onClick={() => void act("verify", () => portalActions.verifyIncident(sessionActor(session), incident.id))} className={portalPrimaryButton}>
            <ShieldCheck aria-hidden="true" className="size-4" />
            {busy === "verify" ? "Verifying…" : "Verify incident (officer)"}
          </button>
        ) : null}

        <Link href={`/incidents/${incident.id}`} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-secondary hover:underline">
          View detailed analysis
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

function Header() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-container">
      <Bot aria-hidden="true" className="size-4" />
      AI-assisted incident analysis
      <Badge tone="warning">Assistive</Badge>
    </p>
  );
}

function Metric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="text-sm font-bold text-primary-container">{value}</dd>
      {note && <dd className="text-[0.6875rem] text-on-surface-variant">{note}</dd>}
    </div>
  );
}
