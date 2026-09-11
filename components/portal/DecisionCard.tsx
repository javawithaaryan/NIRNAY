"use client";

import Link from "next/link";
import { MissionIdentity, RouteFeasibilityBlock, actionClass, decisionLabel, missionPosition } from "@/components/portal/MissionStory";
import { Badge, Card, CardHeader, WhyList, actionTone, decisionStatusTone, feasibilityTone, impactTone, labelize } from "@/components/portal/ui";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";
import type { DecisionRecord } from "@/lib/scenario/types";
import type { MissionView } from "@/lib/scenario/view";

export function DecisionCard({
  decision,
  mission = null,
  showMission = true,
  children,
}: {
  decision: DecisionRecord;
  mission?: MissionView | null;
  showMission?: boolean;
  children?: React.ReactNode;
}) {
  const rec = decision.recommendation;
  const route = rec.routeId ? getRoute(rec.routeId) : null;
  return (
    <Card as="article" className={decision.status === "SUPERSEDED" ? "opacity-80" : ""}>
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
      <div className="space-y-4 p-4 sm:p-5">
        {mission && (
          <div data-decision-mission={mission.mission.id} className="grid grid-cols-1 gap-3 rounded-xs border border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <MissionIdentity mission={mission} />
              <p className="mt-1 text-xs text-on-surface-variant">Current position: {missionPosition(mission)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Mission impact</dt>
                <dd className="mt-0.5">
                  <Badge tone={impactTone(mission.impact.level)}>{mission.impact.level}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Decision</dt>
                <dd className="mt-0.5">
                  <span className={`inline-block rounded-xs px-1.5 py-0.5 text-[0.6875rem] font-extrabold uppercase ${actionClass(rec.action)}`}>{decisionLabel(decision)}</span>
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Feasibility</dt>
                <dd className="mt-0.5">
                  <Badge tone={feasibilityTone(rec.feasibility)}>{rec.feasibility}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">ETA</dt>
                <dd className="mt-0.5 font-mono text-sm">{rec.etaAt ? formatClock(rec.etaAt) : "—"}</dd>
              </div>
            </dl>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Feasibility</dt>
            <dd className="mt-1">
              <Badge tone={feasibilityTone(rec.feasibility)}>{rec.feasibility}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Movement</dt>
            <dd className="mt-1 font-semibold text-primary-container">
              {rec.action === "HOLD" ? `HOLD at ${rec.stagingPlaceId ? getPlace(rec.stagingPlaceId).name : "staging"}` : rec.action === "REROUTE" ? `Divert at ${rec.divertPlaceId ? getPlace(rec.divertPlaceId).name : "junction"}` : "Continue on planned route"}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">ETA</dt>
            <dd className="mt-1 font-mono">{rec.etaAt ? formatClock(rec.etaAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Follow-up</dt>
            <dd className="mt-1 font-semibold">{rec.followUp.length ? rec.followUp.join(" / ") : "—"}</dd>
          </div>
        </dl>
        {rec.noVerifiedFeasibleRoute && !mission && (
          <p className="rounded-xs border border-error/40 bg-error-container px-3 py-2 text-sm font-bold text-on-error-container">
            NO CURRENTLY VERIFIED FEASIBLE ROUTE — within the currently assessed network, evidence and constraints. This is a valid operational outcome, not a failure to compute.
          </p>
        )}
        {mission && <RouteFeasibilityBlock decision={decision} vehicle={mission.vehicle} />}
        <WhyList items={rec.why} />
        {rec.instruction && (
          <p className="text-xs text-on-surface-variant">
            <span className="font-semibold text-primary-container">Instruction on approval:</span> {rec.instruction}
          </p>
        )}
        {decision.actedBy && (
          <p className="text-xs text-on-surface-variant">
            {labelize(decision.actedStatus ?? decision.status)} by {decision.actedBy.name} ({decision.actedBy.role.toLowerCase()}) at{" "}
            {formatStamp(decision.actedAt ?? decision.createdAt)}
            {decision.actionNote ? ` — ${decision.actionNote}` : ""}
            {decision.status === "SUPERSEDED" && decision.supersededAt ? ` · superseded ${formatStamp(decision.supersededAt)}` : ""}
          </p>
        )}
        {children}
      </div>
    </Card>
  );
}
