"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { responseStateLabel } from "@/components/portal/MissionTable";
import {
  MissionIdentity,
  MissionImpactExplainer,
  OperationalPriorityBlock,
  RouteFeasibilityBlock,
  TimelineList,
  WhyItMatters,
  actionClass,
  decisionLabel,
} from "@/components/portal/MissionStory";
import { Badge, Card, CardHeader, WhyList, actionTone, decisionStatusTone, feasibilityTone, labelize } from "@/components/portal/ui";
import type { PortalState } from "@/lib/scenario/events";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import { getPlace, getRoute, getSegment } from "@/lib/scenario/seed/nh29";
import type { TimelineStep } from "@/lib/scenario/storyline";
import type { DecisionRecord } from "@/lib/scenario/types";
import type { MissionView } from "@/lib/scenario/view";

function caseTimeline(decision: DecisionRecord, mission: MissionView, state: PortalState): TimelineStep[] {
  const incident = decision.triggerIncidentId ? state.incidents[decision.triggerIncidentId] : null;
  const interpretation = incident ? state.interpretations[incident.id] : null;
  const networkEvent = incident
    ? state.events.find((event) => event.payload.type === "segment.state_changed" && event.payload.incidentId === incident.id && event.at <= decision.createdAt)
    : null;
  const instruction = state.instructionOrder.map((id) => state.instructions[id]).find((item) => item.decisionId === decision.id) ?? null;
  const isActive = mission.activeDecision?.id === decision.id;
  return [
    { key: "incident", label: "Field incident", detail: incident ? `${incident.reference} · ${getSegment(incident.segmentId).name}` : "manual re-evaluation", at: incident?.reportedAt ?? null },
    { key: "ai", label: "AI / evidence", detail: interpretation ? `${interpretation.hazard.label.toLowerCase()} · evidence corroborated` : null, at: interpretation?.producedAt ?? null },
    { key: "verified", label: "Officer verified", detail: incident?.verifiedBy?.name ?? null, at: incident?.verifiedAt ?? null },
    {
      key: "network",
      label: "Network change",
      detail: networkEvent && networkEvent.payload.type === "segment.state_changed" ? `${getSegment(networkEvent.payload.segmentId).corridor}: ${networkEvent.payload.from} → ${networkEvent.payload.to}` : null,
      at: networkEvent?.at ?? null,
    },
    { key: "routes", label: "Mission affected · routes evaluated", detail: `${mission.mission.id} ${mission.vehicle.vehicleClass} · A / B / C checked`, at: decision.createdAt },
    { key: "decision", label: "Decision prepared", detail: decisionLabel(decision), at: decision.createdAt },
    { key: "authority", label: "Authority", detail: decision.actedBy ? `${labelize(decision.actedStatus ?? decision.status)} by ${decision.actedBy.name}` : "awaiting authority", at: decision.actedAt },
    { key: "driver", label: "Driver", detail: instruction ? (instruction.acknowledgedAt ? "instruction acknowledged" : "instruction issued · acknowledgement required") : "issued on approval", at: instruction?.acknowledgedAt ?? instruction?.issuedAt ?? null },
    {
      key: "monitoring",
      label: "Monitoring",
      detail: decision.status === "SUPERSEDED" ? "superseded by reassessment" : isActive ? responseStateLabel(mission).toLowerCase() : null,
      at: decision.status === "SUPERSEDED" ? decision.supersededAt : isActive && decision.status === "APPROVED" ? (instruction?.acknowledgedAt ?? instruction?.issuedAt ?? decision.actedAt) : null,
    },
  ];
}

export function DecisionCard({
  decision,
  mission = null,
  state = null,
  showMission = true,
  children,
}: {
  decision: DecisionRecord;
  mission?: MissionView | null;
  state?: PortalState | null;
  showMission?: boolean;
  children?: ReactNode;
}) {
  const rec = decision.recommendation;
  const route = rec.routeId ? getRoute(rec.routeId) : null;
  const incident = state && decision.triggerIncidentId ? state.incidents[decision.triggerIncidentId] : null;
  const instruction = state ? (state.instructionOrder.map((id) => state.instructions[id]).find((item) => item.decisionId === decision.id) ?? null) : null;
  const blockedAtDecision = [...new Set(rec.evaluations.flatMap((evaluation) => evaluation.reasons.filter((reason) => reason.ok === false && reason.text.includes(" is BLOCKED")).map((reason) => reason.text.split(" is BLOCKED")[0])))];

  return (
    <Card as="article" className={decision.status === "SUPERSEDED" ? "opacity-85" : ""}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{decision.id}</span>
            {showMission && (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/missions/${decision.missionId}`} className="text-secondary hover:underline">
                  {decision.missionId}
                </Link>
                {mission && <span className="uppercase">{mission.mission.cargo}</span>}
              </>
            )}
            <Badge tone={actionTone(rec.action)}>
              {rec.action}
              {route ? ` via ${route.name}` : ""}
            </Badge>
            <Badge tone={decisionStatusTone(decision.status)}>{labelize(decision.status)}</Badge>
          </span>
        }
        subtitle={`Recommended ${formatStamp(decision.createdAt)}${decision.reassessmentOf ? ` · reassessment of ${decision.reassessmentOf}` : ""}${
          decision.supersededBy ? ` · superseded by ${decision.supersededBy}` : ""
        }`}
      />
      <div className={`gap-4 p-4 sm:p-5 ${mission && state ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}>
        <div className="min-w-0 space-y-4">
          {mission && (
            <section aria-label="Mission" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-2 rounded-xs border border-outline-variant/50 bg-surface-container-low p-3">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Mission</p>
                <MissionIdentity mission={mission} />
                <WhyItMatters mission={mission} />
              </div>
              <MissionImpactExplainer mission={mission} />
              <OperationalPriorityBlock mission={mission} />
            </section>
          )}

          {mission && incident && (
            <section aria-label="Current situation" className="rounded-xs border border-outline-variant/50 px-3 py-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-on-surface-variant">Situation at decision time</p>
              <p className="mt-0.5 text-on-surface">
                Incident <b>{incident.reference}</b> · {(state?.interpretations[incident.id]?.hazard.label ?? incident.ai.label).toLowerCase()} on {getSegment(incident.segmentId).name} ·{" "}
                {incident.verifiedAt ? "verified by officer" : "pending verification"} · Network: {blockedAtDecision.length ? blockedAtDecision.map((name) => `${name} BLOCKED`).join(", ") : "no blocked segment"}
              </p>
            </section>
          )}

          {mission && <RouteFeasibilityBlock decision={decision} vehicle={mission.vehicle} />}

          <dl className="grid grid-cols-2 gap-3 rounded-xs border border-outline-variant/50 p-3 text-sm md:grid-cols-4" aria-label="Recommendation">
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Feasibility result</dt>
              <dd className="mt-1">
                <Badge tone={feasibilityTone(rec.feasibility)}>{rec.feasibility}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Recommendation</dt>
              <dd className="mt-1">
                <span className={`inline-block rounded-xs px-1.5 py-0.5 text-[0.6875rem] font-extrabold uppercase ${actionClass(rec.action)}`}>{decisionLabel(decision)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Movement</dt>
              <dd className="mt-1 font-semibold text-primary-container">
                {rec.action === "HOLD" ? `HOLD at ${rec.stagingPlaceId ? getPlace(rec.stagingPlaceId).name : "staging"}` : rec.action === "REROUTE" ? `Divert at ${rec.divertPlaceId ? getPlace(rec.divertPlaceId).name : "junction"}` : "Continue on planned route"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">ETA · follow-up</dt>
              <dd className="mt-1 font-semibold">
                <span className="font-mono">{rec.etaAt ? formatClock(rec.etaAt) : "—"}</span> · {rec.followUp.length ? rec.followUp.join(" / ") : "none"}
              </dd>
            </div>
          </dl>

          {rec.noVerifiedFeasibleRoute && !mission && (
            <p className="rounded-xs border border-error/40 bg-error-container px-3 py-2 text-sm font-bold text-on-error-container">
              NO CURRENTLY VERIFIED FEASIBLE ROUTE — within the currently assessed network, evidence and constraints. This is a valid operational outcome, not a failure to compute.
            </p>
          )}

          <WhyList items={rec.why} />

          {(mission || decision.actedBy) && (
            <section aria-label="Authority and driver status" className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              <div data-authority-status={decision.status} className={`rounded-xs border px-3 py-2 ${decision.status === "APPROVED" ? "border-success-outline bg-success-container/50" : decision.status === "RECOMMENDED" ? "border-warning-outline bg-warning-container/40" : "border-outline-variant/60 bg-surface-container-low"}`}>
                <p className="font-bold uppercase tracking-wider text-on-surface-variant">Authority status</p>
                <p className="mt-0.5 text-sm font-bold text-primary-container">
                  {decision.status === "RECOMMENDED"
                    ? "Awaiting authority — recommendation is not authorization"
                    : `${decision.actedStatus === "APPROVED" || decision.status === "APPROVED" ? "✓ " : ""}${labelize(decision.actedStatus ?? decision.status)}${decision.actedBy ? ` by ${decision.actedBy.name}` : ""}`}
                </p>
                {decision.actedAt && <p className="text-on-surface-variant">{formatStamp(decision.actedAt)}{decision.actionNote ? ` — ${decision.actionNote}` : ""}</p>}
                {decision.status === "SUPERSEDED" && decision.supersededAt && <p className="font-semibold text-warning">Superseded {formatStamp(decision.supersededAt)} after reassessment</p>}
              </div>
              <div data-driver-status={instruction ? (instruction.acknowledgedAt ? "ACKNOWLEDGED" : "ISSUED") : "NONE"} className={`rounded-xs border px-3 py-2 ${instruction?.acknowledgedAt ? "border-success-outline bg-success-container/50" : instruction ? "border-warning-outline bg-warning-container/40" : "border-outline-variant/60 bg-surface-container-low"}`}>
                <p className="font-bold uppercase tracking-wider text-on-surface-variant">Driver status</p>
                {instruction ? (
                  <>
                    <p className="mt-0.5 font-semibold text-on-surface">{instruction.text}</p>
                    <p className={`font-bold ${instruction.acknowledgedAt ? "text-success" : "text-warning"}`}>
                      {instruction.acknowledgedAt ? `✓ Acknowledged · ${formatStamp(instruction.acknowledgedAt)}` : `Issued ${formatStamp(instruction.issuedAt)} · driver acknowledgement required`}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-on-surface-variant">{rec.instruction ? `On approval the driver receives: ${rec.instruction}` : "No driver instruction."}</p>
                )}
              </div>
            </section>
          )}

          {!mission && decision.actedBy && (
            <p className="text-xs text-on-surface-variant">
              {labelize(decision.actedStatus ?? decision.status)} by {decision.actedBy.name} ({decision.actedBy.role.toLowerCase()}) at {formatStamp(decision.actedAt ?? decision.createdAt)}
              {decision.actionNote ? ` — ${decision.actionNote}` : ""}
            </p>
          )}
          {children}
        </div>
        {mission && state && <TimelineList steps={caseTimeline(decision, mission, state)} title="Case timeline" emptyText="—" />}
      </div>
    </Card>
  );
}
