"use client";

import Link from "next/link";
import { Badge, Card, CardHeader, actionTone, feasibilityTone, impactTone, labelize, priorityTone } from "@/components/portal/ui";
import { formatClock, formatHoursUntil } from "@/lib/scenario/format";
import type { MissionView } from "@/lib/scenario/view";

export function responseStateLabel(view: MissionView): string {
  switch (view.responseState) {
    case "ON_TIME":
      return "ON TIME";
    case "AFFECTED":
      return "AFFECTED";
    case "AWAITING_AUTHORITY":
      return "AWAITING AUTHORITY";
    case "VERIFICATION_REQUESTED":
      return "VERIFICATION REQUESTED";
    case "REJECTED":
      return "REJECTED · MANUAL DIRECTION";
    case "HOLD":
      return "HOLD · APPROVED";
    case "REROUTE_PENDING_ACK":
      return "REROUTE · APPROVED · AWAITING DRIVER";
    case "REROUTING":
      return "REROUTING";
  }
}

export function MissionTable({ missions, now }: { missions: MissionView[]; now: number }) {
  return (
    <Card>
      <CardHeader
        title="Mission status"
        subtitle="One network event, three missions, different consequences. Feasibility is vehicle-aware; urgency never overrides a hard constraint."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="px-4 py-3">Mission</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3">Feasibility</th>
              <th className="px-4 py-3">Decision</th>
              <th className="px-4 py-3 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {missions.map((view) => {
              const decision = view.activeDecision;
              const current = view.evaluations.find((evaluation) => evaluation.routeId === view.currentRouteId);
              const feasibility = decision ? decision.recommendation.feasibility : current?.feasibility ?? "UNDETERMINED";
              return (
                <tr key={view.mission.id} data-mission-row={view.mission.id} className={view.mission.priority === "CRITICAL" && decision ? "bg-error-container/20" : ""}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-primary-container">{view.mission.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-primary-container">{view.mission.cargo}</div>
                    <div className="text-xs text-on-surface-variant">{view.mission.cargoDetail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{view.vehicle.name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {view.vehicle.vehicleClass} · {view.vehicle.grossTonnes} t
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={priorityTone(view.mission.priority)}>{view.mission.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatClock(view.deadlineAt)}
                    <div className="font-sans text-on-surface-variant">{formatHoursUntil(view.deadlineAt, now)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={impactTone(view.impact.level)}>{view.impact.level}</Badge>
                    <div className="mt-1 font-mono text-[0.6875rem] text-on-surface-variant">Mi {view.impact.Mi.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={feasibilityTone(feasibility)}>{feasibility}</Badge>
                    {decision?.recommendation.noVerifiedFeasibleRoute && (
                      <div className="mt-1 text-[0.6875rem] font-semibold text-on-error-container">No currently verified feasible route</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {decision ? (
                      <>
                        <Badge tone={actionTone(decision.recommendation.action)}>
                          {decision.recommendation.action}
                          {decision.recommendation.routeId ? ` · Route ${decision.recommendation.routeId}` : ""}
                        </Badge>
                        <div className="mt-1 text-[0.6875rem] text-on-surface-variant">{labelize(responseStateLabel(view))}</div>
                      </>
                    ) : (
                      <Badge tone={view.responseState === "ON_TIME" ? "success" : "warning"}>{responseStateLabel(view)}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/missions/${view.mission.id}`} className="text-xs font-bold text-secondary hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
