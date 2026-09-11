"use client";

import Link from "next/link";
import { Badge, Card, CardHeader, WhyList, actionTone, decisionStatusTone, feasibilityTone, labelize } from "@/components/portal/ui";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";
import type { DecisionRecord } from "@/lib/scenario/types";

export function DecisionCard({ decision, showMission = true, children }: { decision: DecisionRecord; showMission?: boolean; children?: React.ReactNode }) {
  const rec = decision.recommendation;
  const route = rec.routeId ? getRoute(rec.routeId) : null;
  return (
    <Card as="article" className={decision.status === "SUPERSEDED" ? "opacity-80" : ""}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{decision.id}</span>
            {showMission && (
              <Link href={`/missions/${decision.missionId}`} className="text-secondary hover:underline">
                {decision.missionId}
              </Link>
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
        {rec.noVerifiedFeasibleRoute && (
          <p className="rounded-xs border border-error/40 bg-error-container px-3 py-2 text-sm font-bold text-on-error-container">
            NO CURRENTLY VERIFIED FEASIBLE ROUTE — within the currently assessed network, evidence and constraints. This is a valid operational outcome, not a failure to compute.
          </p>
        )}
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
